import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, ChevronRight, ChevronDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { supabase } from '@/integrations/supabase/client';
import { Comprador } from '@/hooks/useCompradores';

type VisualizacaoItem = {
  tipo: 'departamento' | 'grupo' | 'subgrupo' | 'produto';
  id: string;
  nome: string;
  parentId?: string;
};

interface CompradorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  editingComprador: Comprador | null;
  onSaved: () => void;
}

export const CompradorFormModal = ({ open, onOpenChange, clienteId, editingComprador, onSaved }: CompradorFormModalProps) => {
  const { departamentos: departamentosRaw } = useDepartamentos();
  const { grupos: gruposRaw } = useGrupos();
  const { subgrupos: subgruposRaw } = useSubgrupos();
  const { produtos: produtosRaw } = useProdutos();

  // Ordenar tudo pelo campo `ordem` (mesma lógica do Guia de Preços)
  const sortByOrdem = <T extends { ordem?: number; nome?: string }>(arr: T[]) => {
    const BIG = Number.MAX_SAFE_INTEGER;
    return [...arr].sort((a, b) => {
      const oa = a.ordem ?? BIG;
      const ob = b.ordem ?? BIG;
      if (oa !== ob) return oa - ob;
      return (a.nome || '').localeCompare(b.nome || '');
    });
  };
  const departamentos = sortByOrdem(departamentosRaw);
  const grupos = sortByOrdem(gruposRaw);
  const subgrupos = sortByOrdem(subgruposRaw);
  const produtos = sortByOrdem(produtosRaw);

  const [nomeComprador, setNomeComprador] = useState(editingComprador?.nome || '');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [expandedDepartamentos, setExpandedDepartamentos] = useState<Set<string>>(new Set());
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set());
  const [expandedSubgrupos, setExpandedSubgrupos] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedVisualizacaoDepts, setExpandedVisualizacaoDepts] = useState<Set<string>>(new Set());
  const [expandedVisualizacaoGrupos, setExpandedVisualizacaoGrupos] = useState<Set<string>>(new Set());
  const [expandedVisualizacaoSubgrupos, setExpandedVisualizacaoSubgrupos] = useState<Set<string>>(new Set());
  const [deleteCategory, setDeleteCategory] = useState<{ tipo: 'departamento' | 'grupo' | 'subgrupo'; id: string; nome: string } | null>(null);

  const [visualizacaoItems, setVisualizacaoItems] = useState<VisualizacaoItem[]>(() => {
    if (editingComprador) {
      const hierarquia = editingComprador.hierarquia_customizada as any;
      if (hierarquia?.ordem && Array.isArray(hierarquia.ordem)) {
        return hierarquia.ordem
          .filter((item: any) => item.tipo === 'produto')
          .map((item: any) => {
            const produto = produtos.find(p => p.id === item.produtoId);
            return produto ? { tipo: 'produto' as const, id: produto.id, nome: produto.nome, parentId: produto.subgrupoId } : null;
          })
          .filter(Boolean) as VisualizacaoItem[];
      }
      return editingComprador.produtos.map(produtoId => {
        const produto = produtos.find(p => p.id === produtoId);
        return produto ? { tipo: 'produto' as const, id: produto.id, nome: produto.nome, parentId: produto.subgrupoId } : null;
      }).filter(Boolean) as VisualizacaoItem[];
    }
    return [];
  });

  const handleSelectItem = (tipo: string, id: string) => {
    const itemKey = `${tipo}:${id}`;
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemKey)) {
      newSelected.delete(itemKey);
      if (tipo === 'departamento') {
        grupos.filter(g => g.departamentoId === id).forEach(grupo => {
          newSelected.delete(`grupo:${grupo.id}`);
          subgrupos.filter(s => s.grupoId === grupo.id).forEach(sub => {
            newSelected.delete(`subgrupo:${sub.id}`);
            produtos.filter(p => p.subgrupoId === sub.id).forEach(prod => newSelected.delete(`produto:${prod.id}`));
          });
        });
      } else if (tipo === 'grupo') {
        subgrupos.filter(s => s.grupoId === id).forEach(sub => {
          newSelected.delete(`subgrupo:${sub.id}`);
          produtos.filter(p => p.subgrupoId === sub.id).forEach(prod => newSelected.delete(`produto:${prod.id}`));
        });
      } else if (tipo === 'subgrupo') {
        produtos.filter(p => p.subgrupoId === id).forEach(prod => newSelected.delete(`produto:${prod.id}`));
      }
    } else {
      newSelected.add(itemKey);
      if (tipo === 'departamento') {
        grupos.filter(g => g.departamentoId === id).forEach(grupo => {
          newSelected.add(`grupo:${grupo.id}`);
          subgrupos.filter(s => s.grupoId === grupo.id).forEach(sub => {
            newSelected.add(`subgrupo:${sub.id}`);
            produtos.filter(p => p.subgrupoId === sub.id).forEach(prod => newSelected.add(`produto:${prod.id}`));
          });
        });
      } else if (tipo === 'grupo') {
        subgrupos.filter(s => s.grupoId === id).forEach(sub => {
          newSelected.add(`subgrupo:${sub.id}`);
          produtos.filter(p => p.subgrupoId === sub.id).forEach(prod => newSelected.add(`produto:${prod.id}`));
        });
      } else if (tipo === 'subgrupo') {
        produtos.filter(p => p.subgrupoId === id).forEach(prod => newSelected.add(`produto:${prod.id}`));
      }
    }
    setSelectedItems(newSelected);
  };

  const handleAdicionarItem = () => {
    if (selectedItems.size === 0) return;
    const novosItems: VisualizacaoItem[] = [];
    selectedItems.forEach(itemKey => {
      const [tipo, id] = itemKey.split(':');
      if (tipo === 'produto') {
        const produto = produtos.find(p => p.id === id);
        if (produto && !visualizacaoItems.some(i => i.id === id)) {
          novosItems.push({ tipo: 'produto', id: produto.id, nome: produto.nome, parentId: produto.subgrupoId });
        }
      }
    });
    if (novosItems.length > 0) setVisualizacaoItems(prev => [...prev, ...novosItems]);
    setSelectedItems(new Set());
  };

  const handleMoverItem = (index: number, direcao: 'up' | 'down') => {
    const newItems = [...visualizacaoItems];
    const item = newItems[index];
    if (direcao === 'up' && index > 0 && newItems[index - 1].parentId === item.parentId) {
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
      setVisualizacaoItems(newItems);
    } else if (direcao === 'down' && index < newItems.length - 1 && newItems[index + 1].parentId === item.parentId) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      setVisualizacaoItems(newItems);
    }
  };

  const handleMoverSubgrupo = (subgrupoId: string, direcao: 'up' | 'down') => {
    const newItems = [...visualizacaoItems];
    const blocoAtual = newItems.map((item, idx) => ({ item, idx })).filter(({ item }) => item.parentId === subgrupoId);
    if (blocoAtual.length === 0) return;
    const primeiroIdx = blocoAtual[0].idx;
    const ultimoIdx = blocoAtual[blocoAtual.length - 1].idx;
    let blocoAdjacente;
    if (direcao === 'up' && primeiroIdx > 0) {
      const adjId = newItems[primeiroIdx - 1].parentId;
      if (adjId === subgrupoId) return;
      blocoAdjacente = newItems.map((item, idx) => ({ item, idx })).filter(({ item }) => item.parentId === adjId);
    } else if (direcao === 'down' && ultimoIdx < newItems.length - 1) {
      const adjId = newItems[ultimoIdx + 1].parentId;
      if (adjId === subgrupoId) return;
      blocoAdjacente = newItems.map((item, idx) => ({ item, idx })).filter(({ item }) => item.parentId === adjId);
    }
    if (!blocoAdjacente || blocoAdjacente.length === 0) return;
    const inicio = Math.min(primeiroIdx, blocoAdjacente[0].idx);
    const fim = Math.max(ultimoIdx, blocoAdjacente[blocoAdjacente.length - 1].idx);
    const antes = newItems.slice(0, inicio);
    const depois = newItems.slice(fim + 1);
    const itemsAtual = blocoAtual.map(({ item }) => item);
    const itemsAdj = blocoAdjacente.map(({ item }) => item);
    setVisualizacaoItems(direcao === 'up' ? [...antes, ...itemsAtual, ...itemsAdj, ...depois] : [...antes, ...itemsAdj, ...itemsAtual, ...depois]);
  };

  const handleMoverGrupo = (grupoId: string, direcao: 'up' | 'down') => {
    const newItems = [...visualizacaoItems];
    const subIds = subgrupos.filter(s => s.grupoId === grupoId).map(s => s.id);
    const blocoAtual = newItems.map((item, idx) => ({ item, idx })).filter(({ item }) => subIds.includes(item.parentId || ''));
    if (blocoAtual.length === 0) return;
    const primeiroIdx = blocoAtual[0].idx;
    const ultimoIdx = blocoAtual[blocoAtual.length - 1].idx;
    let blocoAdjacente;
    if (direcao === 'up' && primeiroIdx > 0) {
      const adjSubId = newItems[primeiroIdx - 1].parentId;
      const adjGrupo = subgrupos.find(s => s.id === adjSubId);
      if (!adjGrupo || adjGrupo.grupoId === grupoId) return;
      const adjSubIds = subgrupos.filter(s => s.grupoId === adjGrupo.grupoId).map(s => s.id);
      blocoAdjacente = newItems.map((item, idx) => ({ item, idx })).filter(({ item }) => adjSubIds.includes(item.parentId || ''));
    } else if (direcao === 'down' && ultimoIdx < newItems.length - 1) {
      const adjSubId = newItems[ultimoIdx + 1].parentId;
      const adjGrupo = subgrupos.find(s => s.id === adjSubId);
      if (!adjGrupo || adjGrupo.grupoId === grupoId) return;
      const adjSubIds = subgrupos.filter(s => s.grupoId === adjGrupo.grupoId).map(s => s.id);
      blocoAdjacente = newItems.map((item, idx) => ({ item, idx })).filter(({ item }) => adjSubIds.includes(item.parentId || ''));
    }
    if (!blocoAdjacente || blocoAdjacente.length === 0) return;
    const inicio = Math.min(primeiroIdx, blocoAdjacente[0].idx);
    const fim = Math.max(ultimoIdx, blocoAdjacente[blocoAdjacente.length - 1].idx);
    const antes = newItems.slice(0, inicio);
    const depois = newItems.slice(fim + 1);
    const itemsAtual = blocoAtual.map(({ item }) => item);
    const itemsAdj = blocoAdjacente.map(({ item }) => item);
    setVisualizacaoItems(direcao === 'up' ? [...antes, ...itemsAtual, ...itemsAdj, ...depois] : [...antes, ...itemsAdj, ...itemsAtual, ...depois]);
  };

  const handleMoverDepartamento = (departamentoId: string, direcao: 'up' | 'down') => {
    const newItems = [...visualizacaoItems];
    const grupoIds = grupos.filter(g => g.departamentoId === departamentoId).map(g => g.id);
    const subIds = subgrupos.filter(s => grupoIds.includes(s.grupoId)).map(s => s.id);
    const blocoAtual = newItems.map((item, idx) => ({ item, idx })).filter(({ item }) => subIds.includes(item.parentId || ''));
    if (blocoAtual.length === 0) return;
    const primeiroIdx = blocoAtual[0].idx;
    const ultimoIdx = blocoAtual[blocoAtual.length - 1].idx;
    let blocoAdjacente;
    if (direcao === 'up' && primeiroIdx > 0) {
      const adjSubId = newItems[primeiroIdx - 1].parentId;
      const adjSub = subgrupos.find(s => s.id === adjSubId);
      const adjGrupo = adjSub ? grupos.find(g => g.id === adjSub.grupoId) : null;
      if (!adjGrupo || adjGrupo.departamentoId === departamentoId) return;
      const adjGrupoIds = grupos.filter(g => g.departamentoId === adjGrupo.departamentoId).map(g => g.id);
      const adjSubIds = subgrupos.filter(s => adjGrupoIds.includes(s.grupoId)).map(s => s.id);
      blocoAdjacente = newItems.map((item, idx) => ({ item, idx })).filter(({ item }) => adjSubIds.includes(item.parentId || ''));
    } else if (direcao === 'down' && ultimoIdx < newItems.length - 1) {
      const adjSubId = newItems[ultimoIdx + 1].parentId;
      const adjSub = subgrupos.find(s => s.id === adjSubId);
      const adjGrupo = adjSub ? grupos.find(g => g.id === adjSub.grupoId) : null;
      if (!adjGrupo || adjGrupo.departamentoId === departamentoId) return;
      const adjGrupoIds = grupos.filter(g => g.departamentoId === adjGrupo.departamentoId).map(g => g.id);
      const adjSubIds = subgrupos.filter(s => adjGrupoIds.includes(s.grupoId)).map(s => s.id);
      blocoAdjacente = newItems.map((item, idx) => ({ item, idx })).filter(({ item }) => adjSubIds.includes(item.parentId || ''));
    }
    if (!blocoAdjacente || blocoAdjacente.length === 0) return;
    const inicio = Math.min(primeiroIdx, blocoAdjacente[0].idx);
    const fim = Math.max(ultimoIdx, blocoAdjacente[blocoAdjacente.length - 1].idx);
    const antes = newItems.slice(0, inicio);
    const depois = newItems.slice(fim + 1);
    const itemsAtual = blocoAtual.map(({ item }) => item);
    const itemsAdj = blocoAdjacente.map(({ item }) => item);
    setVisualizacaoItems(direcao === 'up' ? [...antes, ...itemsAtual, ...itemsAdj, ...depois] : [...antes, ...itemsAdj, ...itemsAtual, ...depois]);
  };

  const handleRemoverItem = (index: number) => {
    setVisualizacaoItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoverCategoria = () => {
    if (!deleteCategory) return;
    const { tipo, id } = deleteCategory;
    if (tipo === 'subgrupo') {
      setVisualizacaoItems(prev => prev.filter(item => item.parentId !== id));
    } else if (tipo === 'grupo') {
      const subIds = subgrupos.filter(s => s.grupoId === id).map(s => s.id);
      setVisualizacaoItems(prev => prev.filter(item => !subIds.includes(item.parentId || '')));
    } else if (tipo === 'departamento') {
      const grupoIds = grupos.filter(g => g.departamentoId === id).map(g => g.id);
      const subIds = subgrupos.filter(s => grupoIds.includes(s.grupoId)).map(s => s.id);
      setVisualizacaoItems(prev => prev.filter(item => !subIds.includes(item.parentId || '')));
    }
    setDeleteCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeComprador.trim()) {
      toast({ title: "Campo obrigatório", description: "Nome do comprador é obrigatório.", variant: "destructive" });
      return;
    }
    try {
      const produtosFinais = visualizacaoItems.filter(item => item.tipo === 'produto').map(item => item.id);
      const hierarquiaCustomizada = { ordem: visualizacaoItems.map(item => ({ produtoId: item.id, parentId: item.parentId, tipo: item.tipo })) };
      const data: any = { nome: nomeComprador.trim(), cliente_id: clienteId, produtos: produtosFinais, hierarquia_customizada: hierarquiaCustomizada };

      if (editingComprador) {
        const { error } = await supabase.from('compradores' as any).update(data).eq('id', editingComprador.id) as any;
        if (error) throw error;
        toast({ title: "Sucesso", description: "Comprador atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from('compradores' as any).insert([data]) as any;
        if (error) throw error;
        toast({ title: "Sucesso", description: "Comprador cadastrado com sucesso!" });
      }
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao salvar comprador", variant: "destructive" });
    }
  };

  const buildDepartamentoHierarchy = () => {
    const searchLower = productSearchTerm.toLowerCase().trim();
    const produtosAdicionados = new Set(visualizacaoItems.map(i => i.id));
    const hierarchy: Array<{
      departamento: { id: string; nome: string };
      grupos: Array<{ id: string; nome: string; subgrupos: Array<{ id: string; nome: string; produtos: Array<{ id: string; nome: string; codigo: string; unidade: string }> }> }>;
    }> = [];

    departamentos.forEach(departamento => {
      const deptMatches = !searchLower || departamento.nome.toLowerCase().includes(searchLower);
      const gruposNoDept = grupos.filter(g => g.departamentoId === departamento.id);
      const gruposWithData = gruposNoDept.map(grupo => {
        const grupoMatches = !searchLower || grupo.nome.toLowerCase().includes(searchLower);
        const subgruposNoGrupo = subgrupos.filter(s => s.grupoId === grupo.id);
        const subgruposWithProducts = subgruposNoGrupo.map(subgrupo => {
          const subgrupoMatches = !searchLower || subgrupo.nome.toLowerCase().includes(searchLower);
          const produtosFiltrados = produtos.filter(p => {
            if (p.subgrupoId !== subgrupo.id) return false;
            if (produtosAdicionados.has(p.id)) return false;
            if (!searchLower) return true;
            if (deptMatches || grupoMatches || subgrupoMatches) return true;
            return p.nome.toLowerCase().includes(searchLower) || p.codigo.toLowerCase().includes(searchLower);
          }).map(p => ({ id: p.id, nome: p.nome, codigo: p.codigo, unidade: p.unidadeMedida }));
          return { id: subgrupo.id, nome: subgrupo.nome, produtos: produtosFiltrados };
        }).filter(sg => sg.produtos.length > 0);
        return { id: grupo.id, nome: grupo.nome, subgrupos: subgruposWithProducts };
      }).filter(g => g.subgrupos.length > 0);
      if (gruposWithData.length > 0) {
        hierarchy.push({ departamento: { id: departamento.id, nome: departamento.nome }, grupos: gruposWithData });
      }
    });
    return hierarchy;
  };

  const departamentoHierarchy = buildDepartamentoHierarchy();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingComprador ? 'Editar' : 'Novo'} Comprador</DialogTitle>
            <DialogDescription>Configure os produtos que serão alocados para este comprador</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome-comprador">Nome do Comprador *</Label>
              <Input id="nome-comprador" value={nomeComprador} onChange={(e) => setNomeComprador(e.target.value)} placeholder="Nome do comprador" required />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Seleção de Produtos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Selecionar Produtos</Label>
                  {selectedItems.size > 0 && (
                    <Button type="button" size="sm" onClick={handleAdicionarItem}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar ({selectedItems.size})
                    </Button>
                  )}
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar produtos..." value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <ScrollArea className="border rounded-md h-[500px] p-4">
                  <div className="space-y-2">
                    {departamentoHierarchy.map((deptData) => {
                      const isDeptExpanded = expandedDepartamentos.has(deptData.departamento.id);
                      return (
                        <div key={deptData.departamento.id} className="space-y-2">
                          <div className="flex items-center gap-2 py-1">
                            <button type="button" onClick={() => setExpandedDepartamentos(prev => { const s = new Set(prev); s.has(deptData.departamento.id) ? s.delete(deptData.departamento.id) : s.add(deptData.departamento.id); return s; })} className="p-0 hover:bg-muted rounded">
                              {isDeptExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            </button>
                            <Checkbox checked={selectedItems.has(`departamento:${deptData.departamento.id}`)} onCheckedChange={() => handleSelectItem('departamento', deptData.departamento.id)} />
                            <Label className="font-semibold text-base cursor-pointer" title={deptData.departamento.nome}>{deptData.departamento.nome}</Label>
                          </div>
                          {isDeptExpanded && deptData.grupos.map((grupoData) => {
                            const isGrupoExpanded = expandedGrupos.has(grupoData.id);
                            return (
                              <div key={grupoData.id} className="ml-6 space-y-2">
                                <div className="flex items-center gap-2 py-1">
                                  <button type="button" onClick={() => setExpandedGrupos(prev => { const s = new Set(prev); s.has(grupoData.id) ? s.delete(grupoData.id) : s.add(grupoData.id); return s; })} className="p-0 hover:bg-muted rounded">
                                    {isGrupoExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                  </button>
                                  <Checkbox checked={selectedItems.has(`grupo:${grupoData.id}`)} onCheckedChange={() => handleSelectItem('grupo', grupoData.id)} />
                                  <Label className="font-medium cursor-pointer" title={grupoData.nome}>{grupoData.nome}</Label>
                                </div>
                                {isGrupoExpanded && grupoData.subgrupos.map((subgrupoData) => {
                                  const isSubExpanded = expandedSubgrupos.has(subgrupoData.id);
                                  return (
                                    <div key={subgrupoData.id} className="ml-6 space-y-1">
                                      <div className="flex items-center gap-2 py-1">
                                        <button type="button" onClick={() => setExpandedSubgrupos(prev => { const s = new Set(prev); s.has(subgrupoData.id) ? s.delete(subgrupoData.id) : s.add(subgrupoData.id); return s; })} className="p-0 hover:bg-muted rounded">
                                          {isSubExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                        </button>
                                        <Checkbox checked={selectedItems.has(`subgrupo:${subgrupoData.id}`)} onCheckedChange={() => handleSelectItem('subgrupo', subgrupoData.id)} />
                                        <Label className="text-sm font-medium cursor-pointer" title={subgrupoData.nome}>
                                          {subgrupoData.nome}
                                          <span className="text-xs text-muted-foreground ml-2">({subgrupoData.produtos.length} produtos)</span>
                                        </Label>
                                      </div>
                                      {isSubExpanded && (
                                        <div className="ml-6 space-y-1">
                                          {subgrupoData.produtos.map((produto) => (
                                            <div key={produto.id} className="flex items-center gap-2 py-1">
                                              <Checkbox checked={selectedItems.has(`produto:${produto.id}`)} onCheckedChange={() => handleSelectItem('produto', produto.id)} />
                                              <Label className="text-sm cursor-pointer flex-1" title={`${produto.nome} (${produto.codigo} - ${produto.unidade})`}>
                                                <span>{produto.nome}</span>
                                                <span className="text-muted-foreground ml-2 text-xs">({produto.codigo} - {produto.unidade})</span>
                                              </Label>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Visualização */}
              <div className="space-y-4">
                <Label>Produtos do Comprador</Label>
                <ScrollArea className="border rounded-md h-[500px] p-4">
                  {visualizacaoItems.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">Nenhum produto adicionado</div>
                  ) : (
                    <div className="space-y-2">
                      {(() => {
                        const hierarquia = new Map<string, Map<string, Map<string, number[]>>>();
                        visualizacaoItems.forEach((item, index) => {
                          const produto = produtos.find(p => p.id === item.id);
                          if (!produto) return;
                          const subgrupo = subgrupos.find(s => s.id === produto.subgrupoId);
                          const grupo = grupos.find(g => g.id === produto.grupoId);
                          const dept = departamentos.find(d => d.id === grupo?.departamentoId);
                          if (!dept || !grupo || !subgrupo) return;
                          if (!hierarquia.has(dept.id)) hierarquia.set(dept.id, new Map());
                          if (!hierarquia.get(dept.id)!.has(grupo.id)) hierarquia.get(dept.id)!.set(grupo.id, new Map());
                          if (!hierarquia.get(dept.id)!.get(grupo.id)!.has(subgrupo.id)) hierarquia.get(dept.id)!.get(grupo.id)!.set(subgrupo.id, []);
                          hierarquia.get(dept.id)!.get(grupo.id)!.get(subgrupo.id)!.push(index);
                        });

                        return Array.from(hierarquia.entries()).map(([deptId, gruposMap]) => {
                          const dept = departamentos.find(d => d.id === deptId);
                          if (!dept) return null;
                          const allDeptIds = Array.from(hierarquia.keys());
                          const deptIndex = allDeptIds.indexOf(deptId);
                          return (
                            <div key={deptId} className="border rounded-md">
                              <div className="flex items-center gap-2 p-2 bg-muted">
                                <button type="button" className="p-0 hover:bg-muted/80 rounded cursor-pointer" onClick={() => setExpandedVisualizacaoDepts(prev => { const s = new Set(prev); s.has(deptId) ? s.delete(deptId) : s.add(deptId); return s; })}>
                                  {expandedVisualizacaoDepts.has(deptId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <span className="font-semibold flex-1">{dept.nome}</span>
                                <div className="flex gap-1">
                                  <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverDepartamento(deptId, 'up')} disabled={deptIndex === 0}><ArrowUp className="w-3 h-3" /></Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverDepartamento(deptId, 'down')} disabled={deptIndex === allDeptIds.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteCategory({ tipo: 'departamento', id: deptId, nome: dept.nome })}><X className="w-3 h-3" /></Button>
                                </div>
                              </div>
                              {expandedVisualizacaoDepts.has(deptId) && (
                                <div className="p-2 space-y-2">
                                  {Array.from(gruposMap.entries()).map(([grupoId, subgruposMap]) => {
                                    const grupo = grupos.find(g => g.id === grupoId);
                                    if (!grupo) return null;
                                    const allGrupoIds = Array.from(gruposMap.keys());
                                    const grupoIndex = allGrupoIds.indexOf(grupoId);
                                    return (
                                      <div key={grupoId} className="border rounded-md">
                                        <div className="flex items-center gap-2 p-2 bg-muted/50">
                                          <button type="button" className="p-0 hover:bg-muted/70 rounded cursor-pointer" onClick={() => setExpandedVisualizacaoGrupos(prev => { const s = new Set(prev); s.has(grupoId) ? s.delete(grupoId) : s.add(grupoId); return s; })}>
                                            {expandedVisualizacaoGrupos.has(grupoId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                          </button>
                                          <span className="font-medium flex-1">{grupo.nome}</span>
                                          <div className="flex gap-1">
                                            <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverGrupo(grupoId, 'up')} disabled={grupoIndex === 0}><ArrowUp className="w-3 h-3" /></Button>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverGrupo(grupoId, 'down')} disabled={grupoIndex === allGrupoIds.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteCategory({ tipo: 'grupo', id: grupoId, nome: grupo.nome })}><X className="w-3 h-3" /></Button>
                                          </div>
                                        </div>
                                        {expandedVisualizacaoGrupos.has(grupoId) && (
                                          <div className="p-2 space-y-2">
                                            {Array.from(subgruposMap.entries()).map(([subgrupoId, indices]) => {
                                              const subgrupo = subgrupos.find(s => s.id === subgrupoId);
                                              if (!subgrupo) return null;
                                              const allSubIds = Array.from(subgruposMap.keys());
                                              const subIndex = allSubIds.indexOf(subgrupoId);
                                              return (
                                                <div key={subgrupoId} className="border rounded-md">
                                                  <div className="flex items-center gap-2 p-2 bg-muted/30">
                                                    <button type="button" className="p-0 hover:bg-muted/50 rounded cursor-pointer" onClick={() => setExpandedVisualizacaoSubgrupos(prev => { const s = new Set(prev); s.has(subgrupoId) ? s.delete(subgrupoId) : s.add(subgrupoId); return s; })}>
                                                      {expandedVisualizacaoSubgrupos.has(subgrupoId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </button>
                                                    <span className="text-sm font-medium flex-1">{subgrupo.nome}</span>
                                                    <span className="text-xs text-muted-foreground">({indices.length})</span>
                                                    <div className="flex gap-1">
                                                      <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverSubgrupo(subgrupoId, 'up')} disabled={subIndex === 0}><ArrowUp className="w-3 h-3" /></Button>
                                                      <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverSubgrupo(subgrupoId, 'down')} disabled={subIndex === allSubIds.length - 1}><ArrowDown className="w-3 h-3" /></Button>
                                                      <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteCategory({ tipo: 'subgrupo', id: subgrupoId, nome: subgrupo.nome })}><X className="w-3 h-3" /></Button>
                                                    </div>
                                                  </div>
                                                  {expandedVisualizacaoSubgrupos.has(subgrupoId) && (
                                                    <div className="p-2 space-y-1">
                                                      {indices.map(index => {
                                                        const item = visualizacaoItems[index];
                                                        const canMoveUp = index > 0 && visualizacaoItems[index - 1].parentId === item.parentId;
                                                        const canMoveDown = index < visualizacaoItems.length - 1 && visualizacaoItems[index + 1].parentId === item.parentId;
                                                        return (
                                                          <div key={`${item.id}-${index}`} className="flex items-center gap-2 p-2 border rounded bg-background">
                                                            <span className="flex-1 text-sm" title={item.nome}>{item.nome}</span>
                                                            <div className="flex gap-1">
                                                              <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverItem(index, 'up')} disabled={!canMoveUp}><ArrowUp className="w-3 h-3" /></Button>
                                                              <Button type="button" variant="ghost" size="sm" onClick={() => handleMoverItem(index, 'down')} disabled={!canMoveDown}><ArrowDown className="w-3 h-3" /></Button>
                                                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoverItem(index)}><X className="w-3 h-3" /></Button>
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </ScrollArea>
                <div className="text-sm text-muted-foreground">{visualizacaoItems.length} produto(s)</div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit">{editingComprador ? 'Atualizar' : 'Cadastrar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deleteCategory?.tipo}</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover o {deleteCategory?.tipo} "{deleteCategory?.nome}" e todos os seus produtos?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoverCategoria}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
