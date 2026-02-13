import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, Search, MessageSquare, CheckCircle, Camera } from 'lucide-react';
import { Coleta, Produto, Grupo, Subgrupo } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { useAutoSave } from '@/hooks/useAutoSave';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface ProductListProps {
  coleta: Coleta;
  onBack: () => void;
  onUpdatePrecos: (
    precos: { [produtoId: string]: number }, 
    observacoes: { [produtoId: string]: string }, 
    fotos?: { [produtoId: string]: string[] },
    textosMaisBarato?: { [produtoId: string]: string }
  ) => void;
  onFinalizarColeta: () => void;
  onOpenConfirmDialog: () => void;
}

export const ProductList = React.memo(({ coleta, onBack, onUpdatePrecos, onFinalizarColeta, onOpenConfirmDialog }: ProductListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [precos, setPrecos] = useState<{ [produtoId: string]: number }>(coleta.precos || {});
  const [observacoes, setObservacoes] = useState<{ [produtoId: string]: string }>(coleta.observacoesProdutos || {});
  const [fotos, setFotos] = useState<{ [produtoId: string]: string[] }>(coleta.fotos || {});
  const [textosMaisBarato, setTextosMaisBarato] = useState<{ [produtoId: string]: string }>(coleta.textosMaisBarato || {});
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [tempObservacao, setTempObservacao] = useState('');
  const [produtosPorGrupo, setProdutosPorGrupo] = useState<{ [grupoId: string]: Produto[] }>({});
  const [gruposCarregando, setGruposCarregando] = useState<{ [grupoId: string]: boolean }>({});
  const [gruposComProdutos, setGruposComProdutos] = useState<string[]>([]);
  const [produtosCache, setProdutosCache] = useState<{ [grupoId: string]: boolean }>({});

  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();

  // Auto-save com debounce
  const autoSaveData = useMemo(() => ({
    precos,
    observacoes_produtos: observacoes,
    fotos,
    textos_mais_barato: textosMaisBarato
  }), [precos, observacoes, fotos, textosMaisBarato]);

  const handleAutoSave = useCallback(async (data: any) => {
    await onUpdatePrecos(data.precos, data.observacoes_produtos, data.fotos, data.textos_mais_barato);
  }, [onUpdatePrecos]);

  const { isSaving, lastSaved } = useAutoSave({
    data: autoSaveData,
    onSave: handleAutoSave,
    delay: 2000
  });

  // Buscar grupos que têm produtos nesta coleta
  useEffect(() => {
    const buscarGruposComProdutos = async () => {
      if (!coleta.produtos.length) return;

      // Se houver hierarquia customizada, usar a ordem dela
      if (coleta.hierarquiaCustomizada && Object.keys(coleta.hierarquiaCustomizada).length > 0) {
        console.log('📋 Usando hierarquia customizada da lista');
        const hierarquia = coleta.hierarquiaCustomizada as any;
        if (hierarquia.ordem && Array.isArray(hierarquia.ordem)) {
          // parentId é o subgrupo_id — buscar grupo_id dos subgrupos
          const subgrupoIds = [...new Set(hierarquia.ordem.map((item: any) => item.parentId).filter(Boolean))] as string[];
          try {
            const chunks = chunkArray(subgrupoIds, 100);
            const promises = chunks.map(async (ids) => {
              const { data, error } = await supabase
                .from('subgrupos')
                .select('grupo_id')
                .in('id', ids);
              if (error) throw error;
              return data || [];
            });
            const results = await Promise.all(promises);
            const gruposIds = [...new Set(results.flat().map(item => item.grupo_id))];
            setGruposComProdutos(gruposIds);
          } catch (error) {
            console.error('Erro ao buscar grupos da hierarquia:', error);
          }
          return;
        }
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
  const gruposDaColeta = useMemo(() => 
    grupos.filter(g => gruposComProdutos.includes(g.id)), 
    [grupos, gruposComProdutos]
  );


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
    
    return subgruposMap;
  };

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
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products by Group - Accordion */}
      <Accordion type="multiple" className="space-y-4">
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
                          {produtos.map((produto) => (
                            <div key={produto.id} className="border rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <h5 className="font-medium text-sm">{produto.nome}</h5>
                                  {produto.maisBarato && (
                                    <span className="text-xs text-blue-600 font-semibold">+ Barato</span>
                                  )}
                                </div>
                                
                                <div className="w-24">
                                  <Input
                                    id={`preco-${produto.id}`}
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0,00"
                                    value={precos[produto.id] || ''}
                                    onChange={(e) => handlePrecoChange(produto.id, e.target.value)}
                                    className="text-center"
                                  />
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFotoCapture(produto.id)}
                                    className={fotos[produto.id] && fotos[produto.id].length > 0 ? 'bg-blue-50 border-blue-200' : ''}
                                  >
                                    <Camera className="w-4 h-4" />
                                  </Button>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openObservationDialog(produto.id)}
                                    className={observacoes[produto.id] ? 'bg-yellow-50 border-yellow-200' : ''}
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </Button>
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
                          ))}
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