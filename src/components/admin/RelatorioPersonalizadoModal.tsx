import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Edit, Trash2, ArrowUp, ArrowDown, FileDown, X, Pencil, MoveRight, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { useColetas } from '@/hooks/useColetas';
import { useSupermercados } from '@/hooks/useSupermercados';
import {
  useRelatoriosPersonalizados,
  RelatorioPersonalizado,
  VisualizacaoItem,
  HierarquiaPersonalizada,
} from '@/hooks/useRelatoriosPersonalizados';
import { generateRelatorioPersonalizadoPDF } from '@/lib/reportGenerator';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type ViewMode = 'list' | 'editor';

export const RelatorioPersonalizadoModal = ({ open, onOpenChange }: Props) => {
  const { items, loading, create, update, remove } = useRelatoriosPersonalizados();
  const { departamentos } = useDepartamentos();
  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();
  const { produtos } = useProdutos();
  const { coletas } = useColetas();
  const { supermercados } = useSupermercados();

  const [view, setView] = useState<ViewMode>('list');
  const [editing, setEditing] = useState<RelatorioPersonalizado | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showColetasDialog, setShowColetasDialog] = useState(false);
  const [coletasSelecionadas, setColetasSelecionadas] = useState<Set<string>>(new Set());

  const coletasFinalizadas = useMemo(
    () => coletas.filter(c => c.status === 'finalizada'),
    [coletas]
  );

  useEffect(() => {
    if (!open) {
      setView('list');
      setEditing(null);
      setSelected(new Set());
      setColetasSelecionadas(new Set());
    }
  }, [open]);

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await remove(deletingId);
    if (error) toast({ title: 'Erro', description: String(error), variant: 'destructive' });
    else toast({ title: 'Excluído', description: 'Relatório personalizado removido.' });
    setDeletingId(null);
    setSelected(prev => {
      const n = new Set(prev);
      n.delete(deletingId);
      return n;
    });
  };

  const handleGerar = () => {
    if (selected.size === 0) {
      toast({ title: 'Selecione', description: 'Escolha pelo menos um relatório.', variant: 'destructive' });
      return;
    }
    setColetasSelecionadas(new Set(coletasFinalizadas.map(c => c.id)));
    setShowColetasDialog(true);
  };

  const handleConfirmGerar = () => {
    if (coletasSelecionadas.size === 0) {
      toast({ title: 'Selecione coletas', description: 'Escolha pelo menos uma coleta.', variant: 'destructive' });
      return;
    }
    const coletasUsadas = coletas.filter(c => coletasSelecionadas.has(c.id));
    const today = new Date().toISOString().split('T')[0];
    items
      .filter(r => selected.has(r.id))
      .forEach(rel => {
        const produtosRel = rel.produtos
          .map(id => produtos.find(p => p.id === id))
          .filter((p): p is NonNullable<typeof p> => !!p);
        generateRelatorioPersonalizadoPDF({
          nome: rel.nome,
          data: today,
          produtos: produtosRel,
          coletas: coletasUsadas,
          supermercados,
          grupos,
          subgrupos,
          departamentos,
          hierarquia: rel.hierarquiaCustomizada || {},
        });
      });
    setShowColetasDialog(false);
    onOpenChange(false);
    toast({ title: 'Sucesso', description: `${selected.size} PDF(s) gerado(s).` });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
          {view === 'list' ? (
            <>
              <DialogHeader>
                <DialogTitle>Relatórios Personalizados</DialogTitle>
                <DialogDescription>
                  Selecione um ou mais para gerar PDFs, ou crie um novo.
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-between items-center gap-2 py-2">
                <p className="text-sm text-muted-foreground">
                  {items.length} relatório(s) cadastrado(s)
                </p>
                <Button onClick={() => { setEditing(null); setView('editor'); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar novo relatório personalizado
                </Button>
              </div>

              <ScrollArea className="flex-1 border rounded-md min-h-[300px]">
                <div className="p-2 space-y-1">
                  {loading ? (
                    <p className="text-center text-muted-foreground py-8">Carregando...</p>
                  ) : items.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum relatório personalizado criado ainda.
                    </p>
                  ) : (
                    items.map(rel => (
                      <div key={rel.id} className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50">
                        <Checkbox
                          checked={selected.has(rel.id)}
                          onCheckedChange={() => {
                            setSelected(prev => {
                              const n = new Set(prev);
                              if (n.has(rel.id)) n.delete(rel.id); else n.add(rel.id);
                              return n;
                            });
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{rel.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {rel.produtos.length} produto(s)
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditing(rel); setView('editor'); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(rel.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-end pt-2 border-t">
                <Button onClick={handleGerar} disabled={selected.size === 0}>
                  <FileDown className="w-4 h-4 mr-2" />
                  Gerar Relatório ({selected.size})
                </Button>
              </div>
            </>
          ) : (
            <RelatorioEditor
              key={editing?.id || 'new'}
              initial={editing}
              onBack={() => setView('list')}
              onSaved={async (nome, prods, hierarquia) => {
                if (editing) {
                  const { error } = await update(editing.id, nome, prods, hierarquia);
                  if (error) {
                    toast({ title: 'Erro', description: String(error), variant: 'destructive' });
                    return;
                  }
                  toast({ title: 'Atualizado', description: 'Relatório atualizado.' });
                } else {
                  const { error } = await create(nome, prods, hierarquia);
                  if (error) {
                    toast({ title: 'Erro', description: String(error), variant: 'destructive' });
                    return;
                  }
                  toast({ title: 'Criado', description: 'Relatório personalizado criado.' });
                }
                setView('list');
              }}
              departamentos={departamentos}
              grupos={grupos}
              subgrupos={subgrupos}
              produtos={produtos}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de seleção de coletas para geração */}
      <Dialog open={showColetasDialog} onOpenChange={setShowColetasDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Selecionar Coletas</DialogTitle>
            <DialogDescription>
              Coletas finalizadas que serão usadas nos PDFs.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px] border rounded p-2">
            {coletasFinalizadas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma coleta finalizada disponível
              </p>
            ) : (
              coletasFinalizadas.map(c => {
                const sup = supermercados.find(s => s.id === c.supermercadoId);
                const [y, m, d] = c.data.split('T')[0].split('-');
                return (
                  <div key={c.id} className="flex items-center gap-2 py-1">
                    <Checkbox
                      checked={coletasSelecionadas.has(c.id)}
                      onCheckedChange={() => {
                        setColetasSelecionadas(prev => {
                          const n = new Set(prev);
                          if (n.has(c.id)) n.delete(c.id); else n.add(c.id);
                          return n;
                        });
                      }}
                    />
                    <span className="text-sm">{`${d}/${m}/${y}`} - {sup?.nome || 'N/A'}</span>
                  </div>
                );
              })
            )}
          </ScrollArea>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowColetasDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmGerar}>
              <FileDown className="w-4 h-4 mr-2" />Gerar PDFs
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório personalizado?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ----------------------------------------------------------------------------
// Editor (criação/edição)
// ----------------------------------------------------------------------------
interface EditorProps {
  initial: RelatorioPersonalizado | null;
  onBack: () => void;
  onSaved: (nome: string, produtos: string[], hierarquia: HierarquiaPersonalizada) => void;
  departamentos: any[];
  grupos: any[];
  subgrupos: any[];
  produtos: any[];
}

const RelatorioEditor = ({ initial, onBack, onSaved, departamentos, grupos, subgrupos, produtos }: EditorProps) => {
  const [nome, setNome] = useState(initial?.nome || '');
  const [items, setItems] = useState<VisualizacaoItem[]>(() => {
    return initial?.hierarquiaCustomizada?.ordem || [];
  });
  const [nomes, setNomes] = useState<HierarquiaPersonalizada['nomes']>(
    initial?.hierarquiaCustomizada?.nomes || { departamentos: {}, grupos: {}, subgrupos: {} }
  );
  const [busca, setBusca] = useState('');
  const [renomeando, setRenomeando] = useState<{ tipo: 'departamento' | 'grupo' | 'subgrupo'; id: string } | null>(null);
  const [renomeValor, setRenomeValor] = useState('');

  // Seleção em cascata da árvore (lado esquerdo)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [expandedDeps, setExpandedDeps] = useState<Set<string>>(new Set());
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  const departamentosMap = useMemo(() => new Map(departamentos.map(d => [d.id, d])), [departamentos]);
  const gruposMap = useMemo(() => new Map(grupos.map(g => [g.id, g])), [grupos]);
  const subgruposMap = useMemo(() => new Map(subgrupos.map(s => [s.id, s])), [subgrupos]);
  const produtosMap = useMemo(() => new Map(produtos.map(p => [p.id, p])), [produtos]);

  const getNome = (tipo: string, id: string) => {
    if (tipo === 'departamento') return nomes?.departamentos?.[id] || departamentosMap.get(id)?.nome || '?';
    if (tipo === 'grupo') return nomes?.grupos?.[id] || gruposMap.get(id)?.nome || '?';
    if (tipo === 'subgrupo') return nomes?.subgrupos?.[id] || subgruposMap.get(id)?.nome || '?';
    if (tipo === 'produto') return produtosMap.get(id)?.nome || '?';
    return '?';
  };

  // Construir hierarquia completa (departamento → grupo → subgrupo → produtos), filtrada por busca
  const departamentoHierarchy = useMemo(() => {
    const term = busca.trim().toLowerCase();
    const matchProduto = (p: any) =>
      !term || p.nome.toLowerCase().includes(term) || (p.codigo || '').toLowerCase().includes(term);

    return departamentos.map(dep => {
      const gruposDoDep = grupos
        .filter(g => g.departamentoId === dep.id)
        .map(g => {
          const subsDoGrupo = subgrupos
            .filter(s => s.grupoId === g.id)
            .map(s => {
              const prods = produtos.filter(p => p.subgrupoId === s.id && matchProduto(p));
              const matchSub = !term || s.nome.toLowerCase().includes(term);
              return { ...s, produtos: matchSub ? produtos.filter(p => p.subgrupoId === s.id) : prods };
            })
            .filter(s => {
              if (!term) return true;
              return s.nome.toLowerCase().includes(term) || s.produtos.length > 0;
            });
          return { ...g, subgrupos: subsDoGrupo };
        })
        .filter(g => {
          if (!term) return true;
          return g.nome.toLowerCase().includes(term) || g.subgrupos.length > 0;
        });
      return { departamento: dep, grupos: gruposDoDep };
    });
  }, [departamentos, grupos, subgrupos, produtos, busca]);

  // Auto-expandir nós que casam com a busca
  useEffect(() => {
    if (!busca.trim()) return;
    const deps = new Set<string>();
    const grps = new Set<string>();
    const subs = new Set<string>();
    departamentoHierarchy.forEach(d => {
      if (d.grupos.length > 0) {
        deps.add(d.departamento.id);
        d.grupos.forEach(g => {
          grps.add(g.id);
          g.subgrupos.forEach(s => subs.add(s.id));
        });
      }
    });
    setExpandedDeps(deps);
    setExpandedGrupos(grps);
    setExpandedSubs(subs);
  }, [busca, departamentoHierarchy]);

  // Cascata de seleção (idêntica à de Listas)
  const handleSelectItem = (tipo: 'departamento' | 'grupo' | 'subgrupo' | 'produto', id: string) => {
    const key = `${tipo}:${id}`;
    setSelectedItems(prev => {
      const next = new Set(prev);
      const add = !next.has(key);
      if (add) next.add(key); else next.delete(key);

      const op = (k: string) => add ? next.add(k) : next.delete(k);
      if (tipo === 'departamento') {
        grupos.filter(g => g.departamentoId === id).forEach(g => {
          op(`grupo:${g.id}`);
          subgrupos.filter(s => s.grupoId === g.id).forEach(s => {
            op(`subgrupo:${s.id}`);
            produtos.filter(p => p.subgrupoId === s.id).forEach(p => op(`produto:${p.id}`));
          });
        });
      } else if (tipo === 'grupo') {
        subgrupos.filter(s => s.grupoId === id).forEach(s => {
          op(`subgrupo:${s.id}`);
          produtos.filter(p => p.subgrupoId === s.id).forEach(p => op(`produto:${p.id}`));
        });
      } else if (tipo === 'subgrupo') {
        produtos.filter(p => p.subgrupoId === id).forEach(p => op(`produto:${p.id}`));
      }
      return next;
    });
  };

  const toggleSet = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id); else n.add(id);
    setter(n);
  };

  // Adicionar produto à visualização (já cria a cadeia dep/grupo/subgrupo)
  const adicionarProduto = (produtoId: string, base?: VisualizacaoItem[]) => {
    const produto = produtosMap.get(produtoId);
    if (!produto) return base ?? items;
    const arr = base ? [...base] : [...items];
    if (arr.some(i => i.tipo === 'produto' && i.id === produtoId)) return arr;

    const subgrupo = subgruposMap.get(produto.subgrupoId);
    const grupo = subgrupo ? gruposMap.get(subgrupo.grupoId) : undefined;
    const depId = grupo?.departamentoId;

    if (depId && !arr.some(i => i.tipo === 'departamento' && i.id === depId)) {
      arr.push({ tipo: 'departamento', id: depId });
    }
    if (grupo && !arr.some(i => i.tipo === 'grupo' && i.id === grupo.id)) {
      arr.push({ tipo: 'grupo', id: grupo.id, parentId: depId });
    }
    if (subgrupo && !arr.some(i => i.tipo === 'subgrupo' && i.id === subgrupo.id)) {
      arr.push({ tipo: 'subgrupo', id: subgrupo.id, parentId: grupo?.id });
    }
    arr.push({ tipo: 'produto', id: produtoId, parentId: subgrupo?.id });
    return arr;
  };

  const handleAdicionarSelecionados = () => {
    if (selectedItems.size === 0) return;
    let next = [...items];
    // Coletar IDs de produtos das chaves "produto:..."
    const produtosAdicionar = Array.from(selectedItems)
      .filter(k => k.startsWith('produto:'))
      .map(k => k.split(':')[1]);
    produtosAdicionar.forEach(pid => { next = adicionarProduto(pid, next) ?? next; });
    setItems(next);
    setSelectedItems(new Set());
  };

  const removerItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const moverItem = (idx: number, dir: -1 | 1) => {
    setItems(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return next;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const reatribuirParent = (idx: number, novoParentId: string) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, parentId: novoParentId } : it));
  };

  const aplicarRenomeio = () => {
    if (!renomeando) return;
    const valor = renomeValor.trim();
    setNomes(prev => {
      const next = { ...prev } as any;
      const key = renomeando.tipo === 'departamento' ? 'departamentos' : renomeando.tipo === 'grupo' ? 'grupos' : 'subgrupos';
      next[key] = { ...(next[key] || {}) };
      if (valor) next[key][renomeando.id] = valor;
      else delete next[key][renomeando.id];
      return next;
    });
    setRenomeando(null);
    setRenomeValor('');
  };

  const handleSalvar = () => {
    if (!nome.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe o nome do relatório.', variant: 'destructive' });
      return;
    }
    const produtosFinais = items.filter(i => i.tipo === 'produto').map(i => i.id);
    onSaved(nome, produtosFinais, { ordem: items, nomes });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 pb-3 border-b">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <span className="text-muted-foreground text-sm">
          {initial ? 'Editar relatório personalizado' : 'Novo relatório personalizado'}
        </span>
      </div>

      <div className="space-y-3 py-3">
        <div>
          <Label htmlFor="nome-rel">Nome do Relatório *</Label>
          <Input id="nome-rel" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Relatório Trimestral X" />
        </div>
      </div>

      {/* Dual panel */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden">
        {/* Esquerda: árvore hierárquica completa */}
        <div className="border rounded-md flex flex-col min-h-0">
          <div className="p-2 border-b space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">Selecionar Produtos</span>
              {selectedItems.size > 0 && (
                <Button type="button" size="sm" onClick={handleAdicionarSelecionados}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar ({Array.from(selectedItems).filter(k => k.startsWith('produto:')).length})
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar produtos, departamentos, grupos ou subgrupos..."
                className="pl-8 h-8"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {departamentoHierarchy.map(deptData => {
                const hasContent = deptData.grupos.length > 0;
                if (!hasContent) return null;
                const depExpanded = expandedDeps.has(deptData.departamento.id);
                return (
                  <div key={deptData.departamento.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleSet(expandedDeps, setExpandedDeps, deptData.departamento.id)}
                        className="p-0 hover:bg-muted rounded"
                      >
                        {depExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <Checkbox
                        checked={selectedItems.has(`departamento:${deptData.departamento.id}`)}
                        onCheckedChange={() => handleSelectItem('departamento', deptData.departamento.id)}
                      />
                      <span className="font-semibold text-sm">{deptData.departamento.nome}</span>
                    </div>
                    {depExpanded && deptData.grupos.map(grupoData => {
                      const grpExpanded = expandedGrupos.has(grupoData.id);
                      return (
                        <div key={grupoData.id} className="ml-5 space-y-1">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleSet(expandedGrupos, setExpandedGrupos, grupoData.id)}
                              className="p-0 hover:bg-muted rounded"
                            >
                              {grpExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                            <Checkbox
                              checked={selectedItems.has(`grupo:${grupoData.id}`)}
                              onCheckedChange={() => handleSelectItem('grupo', grupoData.id)}
                            />
                            <span className="font-medium text-sm">{grupoData.nome}</span>
                          </div>
                          {grpExpanded && grupoData.subgrupos.map((subData: any) => {
                            const subExpanded = expandedSubs.has(subData.id);
                            return (
                              <div key={subData.id} className="ml-5 space-y-1">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleSet(expandedSubs, setExpandedSubs, subData.id)}
                                    className="p-0 hover:bg-muted rounded"
                                  >
                                    {subExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                  <Checkbox
                                    checked={selectedItems.has(`subgrupo:${subData.id}`)}
                                    onCheckedChange={() => handleSelectItem('subgrupo', subData.id)}
                                  />
                                  <span className="text-sm">
                                    {subData.nome}
                                    <span className="text-xs text-muted-foreground ml-1">({subData.produtos.length})</span>
                                  </span>
                                </div>
                                {subExpanded && (
                                  <div className="ml-5 space-y-1">
                                    {subData.produtos.map((p: any) => (
                                      <div key={p.id} className="flex items-center gap-2">
                                        <Checkbox
                                          checked={selectedItems.has(`produto:${p.id}`)}
                                          onCheckedChange={() => handleSelectItem('produto', p.id)}
                                        />
                                        <span className="text-xs text-muted-foreground w-12">{p.codigo}</span>
                                        <span className="text-sm flex-1 truncate">{p.nome}</span>
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
              {departamentoHierarchy.every(d => d.grupos.length === 0) && (
                <p className="text-center text-muted-foreground text-sm py-4">Nenhum item encontrado</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Direita: visualização ordenada */}
        <div className="border rounded-md flex flex-col min-h-0">
          <div className="p-2 border-b text-sm font-medium">Hierarquia ({items.length} itens)</div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {items.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Selecione produtos à esquerda para construir a hierarquia.
                </p>
              ) : items.map((item, idx) => {
                const indent = item.tipo === 'departamento' ? 0
                  : item.tipo === 'grupo' ? 4
                  : item.tipo === 'subgrupo' ? 8
                  : 12;
                const podeRenomear = item.tipo !== 'produto';
                // Opções de novo pai
                let opcoesPai: { id: string; nome: string }[] = [];
                if (item.tipo === 'grupo') {
                  opcoesPai = items
                    .filter(i => i.tipo === 'departamento')
                    .map(i => ({ id: i.id, nome: getNome('departamento', i.id) }));
                } else if (item.tipo === 'subgrupo') {
                  opcoesPai = items
                    .filter(i => i.tipo === 'grupo')
                    .map(i => ({ id: i.id, nome: getNome('grupo', i.id) }));
                } else if (item.tipo === 'produto') {
                  opcoesPai = items
                    .filter(i => i.tipo === 'subgrupo')
                    .map(i => ({ id: i.id, nome: getNome('subgrupo', i.id) }));
                }
                return (
                  <div
                    key={`${item.tipo}-${item.id}-${idx}`}
                    className={`flex items-center gap-1 p-1 rounded text-xs ${
                      item.tipo === 'departamento' ? 'bg-muted font-bold' :
                      item.tipo === 'grupo' ? 'bg-muted/60 font-semibold' :
                      item.tipo === 'subgrupo' ? 'bg-muted/30' : ''
                    }`}
                    style={{ paddingLeft: indent + 4 }}
                  >
                    <span className="flex-1 truncate">
                      <span className="text-muted-foreground mr-1">[{item.tipo[0].toUpperCase()}]</span>
                      {getNome(item.tipo, item.id)}
                    </span>
                    {podeRenomear && (
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                        onClick={() => {
                          setRenomeando({ tipo: item.tipo as any, id: item.id });
                          setRenomeValor(getNome(item.tipo, item.id));
                        }}
                        title="Renomear">
                        <Pencil className="w-3 h-3" />
                      </Button>
                    )}
                    {opcoesPai.length > 0 && item.tipo !== 'departamento' && (
                      <Select
                        value={item.parentId || ''}
                        onValueChange={(v) => reatribuirParent(idx, v)}
                      >
                        <SelectTrigger className="h-6 w-7 p-0 border-0 bg-transparent">
                          <MoveRight className="w-3 h-3" />
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom" align="start" avoidCollisions={false} className="max-h-[240px]">
                          {opcoesPai.map(o => (
                            <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                      onClick={() => moverItem(idx, -1)} title="Mover para cima">
                      <ArrowUp className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                      onClick={() => moverItem(idx, 1)} title="Mover para baixo">
                      <ArrowDown className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                      onClick={() => removerItem(idx)} title="Remover">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renomeando} onOpenChange={(v) => !v && setRenomeando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear {renomeando?.tipo}</DialogTitle>
            <DialogDescription>O nome será aplicado apenas neste relatório.</DialogDescription>
          </DialogHeader>
          <Input value={renomeValor} onChange={e => setRenomeValor(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenomeando(null)}>Cancelar</Button>
            <Button onClick={aplicarRenomeio}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button variant="outline" onClick={onBack}>Cancelar</Button>
        <Button onClick={handleSalvar}>{initial ? 'Atualizar' : 'Criar'} Relatório</Button>
      </div>
    </div>
  );
};
