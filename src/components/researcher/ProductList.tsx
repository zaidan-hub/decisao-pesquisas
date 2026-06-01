import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Search, MessageSquare, CheckCircle, Camera, MoreVertical } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Coleta, Produto, Grupo, Subgrupo } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { useAutoSave } from '@/hooks/useAutoSave';
import { loadColetaDraft, saveColetaDraft, clearColetaDraft } from '@/hooks/useColetaDraft';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface ProductListProps {
  coleta: Coleta;
  onBack: () => void;
  onUpdatePrecos: (
    precos: { [produtoId: string]: number }, 
    observacoes: { [produtoId: string]: string }, 
    textosMaisBarato?: { [produtoId: string]: string }
  ) => void | Promise<void>;
  onUpdateFotos: (fotos: { [produtoId: string]: string[] }) => void | Promise<void>;
  onFinalizarColeta: () => void;
  onOpenConfirmDialog: () => void;
}

export const ProductList = React.memo(({ coleta, onBack, onUpdatePrecos, onUpdateFotos, onFinalizarColeta, onOpenConfirmDialog }: ProductListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  // Hidratação: estado inicial = dados do servidor + rascunho local (rascunho vence por ser o mais recente)
  const draftInicial = useMemo(() => loadColetaDraft(coleta.id), [coleta.id]);
  const [precos, setPrecos] = useState<{ [produtoId: string]: number }>(
    () => ({ ...(coleta.precos || {}), ...(draftInicial?.precos || {}) })
  );
  const [observacoes, setObservacoes] = useState<{ [produtoId: string]: string }>(
    () => ({ ...(coleta.observacoesProdutos || {}), ...(draftInicial?.observacoes || {}) })
  );
  const [fotos, setFotos] = useState<{ [produtoId: string]: string[] }>(
    () => ({ ...(coleta.fotos || {}), ...(draftInicial?.fotos || {}) })
  );
  const [textosMaisBarato, setTextosMaisBarato] = useState<{ [produtoId: string]: string }>(
    () => ({ ...(coleta.textosMaisBarato || {}), ...(draftInicial?.textosMaisBarato || {}) })
  );
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [tempObservacao, setTempObservacao] = useState('');
  const [produtosPorGrupo, setProdutosPorGrupo] = useState<{ [grupoId: string]: Produto[] }>({});
  const [gruposCarregando, setGruposCarregando] = useState<{ [grupoId: string]: boolean }>({});
  const [gruposComProdutos, setGruposComProdutos] = useState<string[]>([]);
  const [produtosCache, setProdutosCache] = useState<{ [grupoId: string]: boolean }>({});
  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();

  // Carregar fotos reais da coleta (não vêm no fetch da lista por performance).
  // Faz merge: fotos do servidor + fotos do rascunho local (rascunho vence).
  const fotosCarregadasRef = useRef(false);
  useEffect(() => {
    let ativo = true;
    const carregarFotos = async () => {
      try {
        const { data, error } = await supabase
          .from('coletas')
          .select('fotos')
          .eq('id', coleta.id)
          .single();
        if (error) throw error;
        if (!ativo) return;
        const fotosServidor = (data?.fotos as { [k: string]: string[] }) || {};
        setFotos(prev => ({ ...fotosServidor, ...prev }));
      } catch (e) {
        console.error('Erro ao carregar fotos da coleta:', e);
      } finally {
        fotosCarregadasRef.current = true;
      }
    };
    carregarFotos();
    return () => { ativo = false; };
  }, [coleta.id]);

  // Auto-save de preços/observações/marcas com debounce (SEM fotos)
  const autoSaveData = useMemo(() => ({
    precos,
    observacoes_produtos: observacoes,
    textos_mais_barato: textosMaisBarato
  }), [precos, observacoes, textosMaisBarato]);

  const handleAutoSave = useCallback(async (data: any) => {
    await onUpdatePrecos(data.precos, data.observacoes_produtos, data.textos_mais_barato);
  }, [onUpdatePrecos]);

  const { isSaving, lastSaved, saveError, hasUnsaved, flush } = useAutoSave({
    data: autoSaveData,
    onSave: handleAutoSave,
    delay: 2000
  });

  // Persistir rascunho local a cada mudança (instantâneo, resiste a refresh/queda)
  useEffect(() => {
    saveColetaDraft(coleta.id, { precos, observacoes, textosMaisBarato, fotos });
  }, [coleta.id, precos, observacoes, textosMaisBarato, fotos]);

  // Limpar rascunho local quando tudo estiver confirmado no servidor
  useEffect(() => {
    if (!hasUnsaved && !saveError && lastSaved) {
      clearColetaDraft(coleta.id);
    }
  }, [hasUnsaved, saveError, lastSaved, coleta.id]);

  // Gravação isolada das fotos: só dispara quando as fotos mudam (após carregamento inicial)
  const fotosSnapshotRef = useRef<string>(JSON.stringify(fotos));
  useEffect(() => {
    if (!fotosCarregadasRef.current) return;
    const serialized = JSON.stringify(fotos);
    if (serialized === fotosSnapshotRef.current) return;
    fotosSnapshotRef.current = serialized;
    const t = setTimeout(() => { onUpdateFotos(fotos); }, 800);
    return () => clearTimeout(t);
  }, [fotos, onUpdateFotos]);

  // Avisar ao recarregar/fechar com alterações ainda não confirmadas
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsaved || saveError) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved, saveError]);

  // Gravar imediatamente ao sair da tela de produtos
  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  // Mapa subgrupo -> grupo (para inferir ordem de grupos a partir da hierarquia)
  const [subgrupoToGrupoMap, setSubgrupoToGrupoMap] = useState<Record<string, string>>({});

  // Buscar grupos que têm produtos nesta coleta
  useEffect(() => {
    const buscarGruposComProdutos = async () => {
      if (!coleta.produtos.length) return;

      const hierarquia = coleta.hierarquiaCustomizada as any;
      const temHierarquia = hierarquia?.ordem && Array.isArray(hierarquia.ordem) && hierarquia.ordem.length > 0;

      if (temHierarquia) {
        console.log('📋 Usando hierarquia customizada da lista');
        // parentId é o subgrupo_id — buscar grupo_id dos subgrupos
        const subgrupoIds = [...new Set(hierarquia.ordem.map((item: any) => item.parentId).filter(Boolean))] as string[];
        try {
          const chunks = chunkArray(subgrupoIds, 100);
          const promises = chunks.map(async (ids) => {
            const { data, error } = await supabase
              .from('subgrupos')
              .select('id, grupo_id')
              .in('id', ids);
            if (error) throw error;
            return data || [];
          });
          const results = await Promise.all(promises);
          const allSubgrupos = results.flat();
          
          // Construir mapa subgrupo -> grupo
          const sgMap: Record<string, string> = {};
          allSubgrupos.forEach(s => { sgMap[s.id] = s.grupo_id; });
          setSubgrupoToGrupoMap(sgMap);
          
          const gruposIds = [...new Set(allSubgrupos.map(item => item.grupo_id))];
          setGruposComProdutos(gruposIds);
        } catch (error) {
          console.error('Erro ao buscar grupos da hierarquia:', error);
        }
        return;
      }

      try {
        const chunks = chunkArray(coleta.produtos, 100);
        const promises = chunks.map(async (ids) => {
          const { data, error } = await supabase
            .from('produtos')
            .select('grupo_id')
            .in('id', ids);
          if (error) throw error;
          return data || [];
        });

        const results = await Promise.all(promises);
        const gruposIds = [...new Set(results.flat().map(item => item.grupo_id))];
        setGruposComProdutos(gruposIds);
      } catch (error) {
        console.error('Erro ao buscar grupos:', error);
      }
    };

    buscarGruposComProdutos();
  }, [coleta.produtos, coleta.hierarquiaCustomizada]);

  // Helper para dividir em chunks e evitar URL muito grande nas queries
  const chunkArray = <T,>(arr: T[], size: number) => {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
  };

  // Carregar produtos de um grupo específico em chunks com cache
  const carregarProdutosGrupo = useCallback(async (grupoId: string) => {
    if (produtosCache[grupoId] || gruposCarregando[grupoId]) return;

    setGruposCarregando(prev => ({ ...prev, [grupoId]: true }));

    try {
      const chunks = chunkArray(coleta.produtos, 100);
      const promises = chunks.map(async (ids) => {
        const { data, error } = await supabase
          .from('produtos')
          .select('id, codigo, nome, grupo_id, subgrupo_id, unidade_medida, quantidade, mais_barato')
          .eq('grupo_id', grupoId)
          .in('id', ids)
          .order('nome');
        if (error) throw error;
        return data || [];
      });

      const results = await Promise.all(promises);
      const flat = results.flat();
      const mapped = flat.map(item => ({
        id: item.id,
        codigo: item.codigo,
        nome: item.nome,
        grupoId: item.grupo_id,
        subgrupoId: item.subgrupo_id,
        unidadeMedida: item.unidade_medida,
        quantidade: item.quantidade,
        maisBarato: Boolean(item.mais_barato)
      }));

      // Remover duplicados
      const uniqueMap: Record<string, Produto> = {};
      mapped.forEach(p => { uniqueMap[p.id] = p; });
      let unique = Object.values(uniqueMap);

      // Se houver hierarquia customizada, ordenar de acordo com ela
      if (coleta.hierarquiaCustomizada && Object.keys(coleta.hierarquiaCustomizada).length > 0) {
        const hierarquia = coleta.hierarquiaCustomizada as any;
        if (hierarquia.ordem && Array.isArray(hierarquia.ordem)) {
          // Criar um mapa de ordem: produtoId -> índice
          const ordemMap: Record<string, number> = {};
          hierarquia.ordem.forEach((item: any, idx: number) => {
            ordemMap[item.produtoId] = idx;
          });
          
          // Ordenar produtos de acordo com a hierarquia
          unique = unique.sort((a, b) => {
            const ordemA = ordemMap[a.id] ?? 99999;
            const ordemB = ordemMap[b.id] ?? 99999;
            return ordemA - ordemB;
          });
        }
      } else {
        // Ordenação padrão por nome
        unique = unique.sort((a, b) => a.nome.localeCompare(b.nome));
      }

      setProdutosPorGrupo(prev => ({ ...prev, [grupoId]: unique }));
      setProdutosCache(prev => ({ ...prev, [grupoId]: true }));
    } catch (error) {
      console.error('Erro ao carregar produtos do grupo:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: "Não foi possível carregar os produtos deste grupo.",
        variant: "destructive"
      });
    } finally {
      setGruposCarregando(prev => ({ ...prev, [grupoId]: false }));
    }
  }, [coleta.produtos, coleta.hierarquiaCustomizada, produtosCache, gruposCarregando]);

  // Mostrar apenas grupos que têm produtos nesta coleta
  const gruposDaColeta = useMemo(() => {
    const filtered = grupos.filter(g => gruposComProdutos.includes(g.id));
    
    // Ordenar grupos conforme hierarquia customizada
    // A hierarquia só tem tipo='produto' com parentId=subgrupo_id
    // Inferir ordem dos grupos pela primeira aparição de cada grupo na lista
    const hierarquia = coleta.hierarquiaCustomizada as any;
    if (hierarquia?.ordem && Array.isArray(hierarquia.ordem) && Object.keys(subgrupoToGrupoMap).length > 0) {
      const grupoOrdem: Record<string, number> = {};
      let idx = 0;
      hierarquia.ordem.forEach((item: any) => {
        if (item.tipo === 'produto' && item.parentId) {
          const grupoId = subgrupoToGrupoMap[item.parentId];
          if (grupoId && !grupoOrdem.hasOwnProperty(grupoId)) {
            grupoOrdem[grupoId] = idx++;
          }
        }
      });
      
      filtered.sort((a, b) => {
        const ordemA = grupoOrdem[a.id] ?? 99999;
        const ordemB = grupoOrdem[b.id] ?? 99999;
        return ordemA - ordemB;
      });
    }
    
    return filtered;
  }, [grupos, gruposComProdutos, coleta.hierarquiaCustomizada, subgrupoToGrupoMap]);


  const handlePrecoChange = useCallback((produtoId: string, valor: string) => {
    const precoNumerico = parseFloat(valor) || 0;
    setPrecos(prev => ({ ...prev, [produtoId]: precoNumerico }));
  }, []);

  const handleTextoMaisBaratoChange = useCallback((produtoId: string, texto: string) => {
    setTextosMaisBarato(prev => ({ ...prev, [produtoId]: texto }));
  }, []);

  const handleSaveObservation = useCallback(() => {
    if (!selectedProductId) return;
    
    if (tempObservacao.trim() === '') {
      setObservacoes(prev => {
        const newObs = { ...prev };
        delete newObs[selectedProductId];
        return newObs;
      });
    } else {
      setObservacoes(prev => ({ ...prev, [selectedProductId]: tempObservacao }));
    }
    
    setShowObservationDialog(false);
    setSelectedProductId('');
    setTempObservacao('');
    
    toast({
      title: "Observação salva",
      description: "A observação do produto foi atualizada."
    });
  }, [selectedProductId, tempObservacao]);

  const handleFotoCapture = useCallback((produtoId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageDataUrl = event.target?.result as string;
          setFotos(prev => ({
            ...prev,
            [produtoId]: [...(prev[produtoId] || []), imageDataUrl]
          }));
          
          toast({
            title: "Foto adicionada",
            description: "A foto foi anexada ao produto."
          });
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  }, []);

  const handleRemoverFoto = useCallback((produtoId: string, fotoIndex: number) => {
    setFotos(prev => {
      const novasFotos = { ...prev };
      novasFotos[produtoId] = novasFotos[produtoId].filter((_, index) => index !== fotoIndex);
      
      if (novasFotos[produtoId].length === 0) {
        delete novasFotos[produtoId];
      }
      
      return novasFotos;
    });
    
    toast({
      title: "Foto removida",
      description: "A foto foi removida do produto."
    });
  }, []);

  const openObservationDialog = useCallback((produtoId: string) => {
    setSelectedProductId(produtoId);
    setTempObservacao(observacoes[produtoId] || '');
    setShowObservationDialog(true);
  }, [observacoes]);

  const getProdutoInfo = (produtoId: string) => {
    // Buscar produto em todos os grupos carregados
    let produto: Produto | undefined;
    for (const produtosGrupo of Object.values(produtosPorGrupo)) {
      produto = produtosGrupo.find(p => p.id === produtoId);
      if (produto) break;
    }
    
    const grupo = grupos.find(g => g.id === produto?.grupoId);
    const subgrupo = subgrupos.find(s => s.id === produto?.subgrupoId);
    return { produto, grupo, subgrupo };
  };

  // Agrupar produtos por subgrupo dentro de cada grupo
  const agruparPorSubgrupo = (produtos: Produto[]) => {
    const subgruposMap: { [key: string]: Produto[] } = {};
    
    produtos.forEach(produto => {
      const subgrupo = subgrupos.find(s => s.id === produto.subgrupoId);
      const subgrupoNome = subgrupo?.nome || 'Sem Subgrupo';
      
      if (!subgruposMap[subgrupoNome]) {
        subgruposMap[subgrupoNome] = [];
      }
      subgruposMap[subgrupoNome].push(produto);
    });
    
    // Ordenar subgrupos conforme hierarquia customizada
    // Inferir ordem dos subgrupos pela primeira aparição de cada parentId na hierarquia
    const hierarquia = coleta.hierarquiaCustomizada as any;
    if (hierarquia?.ordem && Array.isArray(hierarquia.ordem)) {
      const subgrupoOrdem: Record<string, number> = {};
      let idx = 0;
      hierarquia.ordem.forEach((item: any) => {
        if (item.tipo === 'produto' && item.parentId && !subgrupoOrdem.hasOwnProperty(item.parentId)) {
          subgrupoOrdem[item.parentId] = idx++;
        }
      });
      
      // Criar mapa de nome -> id do subgrupo para ordenar
      const nomeToId: Record<string, string> = {};
      subgrupos.forEach(s => { nomeToId[s.nome] = s.id; });
      
      const entries = Object.entries(subgruposMap);
      entries.sort((a, b) => {
        const idA = nomeToId[a[0]] || '';
        const idB = nomeToId[b[0]] || '';
        const ordemA = subgrupoOrdem[idA] ?? 99999;
        const ordemB = subgrupoOrdem[idB] ?? 99999;
        return ordemA - ordemB;
      });
      
      const ordered: { [key: string]: Produto[] } = {};
      entries.forEach(([k, v]) => { ordered[k] = v; });
      return ordered;
    }
    
    return subgruposMap;
  };

  // Auto-expand groups when products load during search
  useEffect(() => {
    if (!searchTerm) return;
    const matchingGroups = gruposDaColeta
      .filter(g => {
        const prods = produtosPorGrupo[g.id] || [];
        return prods.some(p =>
          p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
      .map(g => g.id);
    setOpenGroups(matchingGroups);
  }, [produtosPorGrupo, searchTerm, gruposDaColeta]);

  const totalPreenchidos = Object.keys(precos).filter(id => precos[id] > 0).length;
  const totalProdutos = coleta.produtos.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold">Lista de Produtos</h2>
            <p className="text-sm text-muted-foreground">
              {totalPreenchidos}/{totalProdutos} preenchidos
            </p>
          </div>
          {isSaving && (
            <Badge variant="secondary">
              Salvando...
            </Badge>
          )}
          {!isSaving && lastSaved && (
            <Badge variant="outline">
              Salvo
            </Badge>
          )}
        </div>
        
        <Button 
          onClick={onOpenConfirmDialog}
          disabled={totalPreenchidos === 0}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Finalizar
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar produto..."
          value={searchTerm}
          onChange={(e) => {
            const term = e.target.value;
            setSearchTerm(term);
            // Auto-load all groups when searching
            if (term.length > 0) {
              gruposDaColeta.forEach(g => carregarProdutosGrupo(g.id));
              // Auto-expand groups that have matching products
              const matchingGroups = gruposDaColeta
                .filter(g => {
                  const prods = produtosPorGrupo[g.id] || [];
                  return prods.some(p =>
                    p.nome.toLowerCase().includes(term.toLowerCase()) ||
                    p.codigo.toLowerCase().includes(term.toLowerCase())
                  );
                })
                .map(g => g.id);
              setOpenGroups(matchingGroups);
            } else {
              setOpenGroups([]);
            }
          }}
          className="pl-10"
        />
      </div>

      {/* Products by Group - Accordion */}
      <Accordion type="multiple" value={openGroups} onValueChange={setOpenGroups} className="space-y-4">
        {gruposDaColeta.map((grupo) => {
          const produtosGrupo = produtosPorGrupo[grupo.id] || [];
          const produtosFiltrados = searchTerm
            ? produtosGrupo.filter(p =>
                p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
              )
            : produtosGrupo;
          const subgruposAgrupados = agruparPorSubgrupo(produtosFiltrados);
          const isCarregando = gruposCarregando[grupo.id];
          
          // Hide groups with no matching products when searching
          if (searchTerm && produtosFiltrados.length === 0 && !isCarregando) return null;
          
          return (
            <AccordionItem key={grupo.id} value={grupo.id} className="border rounded-lg">
              <AccordionTrigger
                className="px-4 hover:no-underline"
                onClick={() => carregarProdutosGrupo(grupo.id)}
              >
                <div className="flex items-center justify-between w-full pr-4">
                  <span className="font-semibold">{grupo.nome}</span>
                  {isCarregando && (
                    <span className="text-xs text-muted-foreground">Carregando...</span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {produtosFiltrados.length === 0 && !isCarregando ? (
                  <p className="text-sm text-muted-foreground">Nenhum produto neste grupo.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(subgruposAgrupados).map(([subgrupoNome, produtos]) => (
                      <div key={subgrupoNome}>
                        <h4 className="font-medium text-sm text-muted-foreground mb-3">
                          {subgrupoNome}
                        </h4>
                        <div className="space-y-3">
                          {produtos.map((produto) => {
                            const hasFotos = fotos[produto.id] && fotos[produto.id].length > 0;
                            const hasObs = !!observacoes[produto.id];
                            return (
                            <div key={produto.id} className="border rounded-lg p-3">
                              <div className="flex items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-sm leading-snug break-words">
                                    {produto.nome}
                                    {(produto.quantidade || produto.unidadeMedida) && (
                                      <span className="text-muted-foreground font-normal"> {produto.quantidade}{produto.unidadeMedida}</span>
                                    )}
                                  </h5>
                                  {produto.maisBarato && (
                                    <span className="text-[11px] text-blue-600 font-semibold mt-0.5 block">+ Barato</span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="w-24">
                                    <Input
                                      id={`preco-${produto.id}`}
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="0,00"
                                      value={precos[produto.id] || ''}
                                      onChange={(e) => handlePrecoChange(produto.id, e.target.value)}
                                      className="text-center text-sm h-9"
                                    />
                                  </div>

                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className={`h-9 w-9 shrink-0 relative ${hasFotos || hasObs ? 'bg-blue-50 border-blue-200' : ''}`}
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                        {(hasFotos || hasObs) && (
                                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-44 p-1" align="end">
                                      <button
                                        type="button"
                                        onClick={() => handleFotoCapture(produto.id)}
                                        className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded hover:bg-muted text-left"
                                      >
                                        <Camera className="w-4 h-4" />
                                        Adicionar foto
                                        {hasFotos && <span className="ml-auto text-xs text-blue-600">{fotos[produto.id].length}</span>}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => openObservationDialog(produto.id)}
                                        className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded hover:bg-muted text-left"
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                        {hasObs ? 'Editar observação' : 'Adicionar observação'}
                                      </button>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>
                              
                              {/* Campo de texto adicional para produtos "mais barato" */}
                              {produto.maisBarato && (
                                <div className="mt-3">
                                  <Label htmlFor={`texto-${produto.id}`} className="text-xs">
                                    Marca:
                                  </Label>
                                  <Input
                                    id={`texto-${produto.id}`}
                                    type="text"
                                    placeholder="Ex: Carrijo"
                                    value={textosMaisBarato[produto.id] || ''}
                                    onChange={(e) => handleTextoMaisBaratoChange(produto.id, e.target.value)}
                                    className="mt-1"
                                  />
                                </div>
                              )}
                              
                              {/* Exibir fotos anexadas */}
                              {fotos[produto.id] && fotos[produto.id].length > 0 && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                  <p className="text-xs font-medium mb-2">Fotos anexadas:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {fotos[produto.id].map((foto, index) => (
                                      <div key={index} className="relative">
                                        <img
                                          src={foto}
                                          alt={`Foto ${index + 1} do produto`}
                                          className="w-16 h-16 object-cover rounded border cursor-pointer"
                                          onClick={() => {
                                            const newWindow = window.open();
                                            if (newWindow) {
                                              newWindow.document.body.innerHTML = `<img src="${foto}" style="max-width:100%; max-height:100vh;" />`;
                                            }
                                          }}
                                        />
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="absolute -top-1 -right-1 w-5 h-5 p-0 rounded-full text-xs"
                                          onClick={() => handleRemoverFoto(produto.id, index)}
                                        >
                                          ×
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {observacoes[produto.id] && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                  <strong>Observação:</strong> {observacoes[produto.id]}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Observation Dialog */}
      <Dialog open={showObservationDialog} onOpenChange={setShowObservationDialog}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Observação do Produto</DialogTitle>
            <DialogDescription>
              {selectedProductId && getProdutoInfo(selectedProductId).produto?.nome}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                placeholder="Digite sua observação sobre este produto..."
                value={tempObservacao}
                onChange={(e) => setTempObservacao(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowObservationDialog(false);
                  setSelectedProductId('');
                  setTempObservacao('');
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveObservation}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});