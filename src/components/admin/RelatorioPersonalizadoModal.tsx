import { useState, useMemo, useEffect, useDeferredValue, useCallback, memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Edit, Trash2, ArrowUp, ArrowDown, FileDown, X, Pencil, MoveRight, Search, ChevronDown, ChevronRight, Check } from 'lucide-react';
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

  // Collapse na visualização (lado direito)
  const [collapsedDeps, setCollapsedDeps] = useState<Set<string>>(new Set());
  const [collapsedGrupos, setCollapsedGrupos] = useState<Set<string>>(new Set());
  const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(new Set());

  const departamentosMap = useMemo(() => new Map(departamentos.map(d => [d.id, d])), [departamentos]);
  const gruposMap = useMemo(() => new Map(grupos.map(g => [g.id, g])), [grupos]);
  const subgruposMap = useMemo(() => new Map(subgrupos.map(s => [s.id, s])), [subgrupos]);
  const produtosMap = useMemo(() => new Map(produtos.map(p => [p.id, p])), [produtos]);

  // Índices pré-computados (uma vez por mudança das listas-base)
  const gruposByDep = useMemo(() => {
    const m = new Map<string, any[]>();
    grupos.forEach(g => {
      const arr = m.get(g.departamentoId) || [];
      arr.push(g); m.set(g.departamentoId, arr);
    });
    return m;
  }, [grupos]);
  const subsByGrupo = useMemo(() => {
    const m = new Map<string, any[]>();
    subgrupos.forEach(s => {
      const arr = m.get(s.grupoId) || [];
      arr.push(s); m.set(s.grupoId, arr);
    });
    return m;
  }, [subgrupos]);
  const prodsBySub = useMemo(() => {
    const m = new Map<string, any[]>();
    produtos.forEach(p => {
      const arr = m.get(p.subgrupoId) || [];
      arr.push(p); m.set(p.subgrupoId, arr);
    });
    return m;
  }, [produtos]);
  // Nomes em lowercase em cache (evita recomputar a cada keystroke)
  const produtoLower = useMemo(() => {
    const m = new Map<string, { nome: string; codigo: string }>();
    produtos.forEach(p => m.set(p.id, { nome: (p.nome || '').toLowerCase(), codigo: (p.codigo || '').toLowerCase() }));
    return m;
  }, [produtos]);
  const subLower = useMemo(() => {
    const m = new Map<string, string>();
    subgrupos.forEach(s => m.set(s.id, (s.nome || '').toLowerCase()));
    return m;
  }, [subgrupos]);
  const grupoLower = useMemo(() => {
    const m = new Map<string, string>();
    grupos.forEach(g => m.set(g.id, (g.nome || '').toLowerCase()));
    return m;
  }, [grupos]);

  const getNome = (tipo: string, id: string) => {
    if (tipo === 'departamento') return nomes?.departamentos?.[id] || departamentosMap.get(id)?.nome || '?';
    if (tipo === 'grupo') return nomes?.grupos?.[id] || gruposMap.get(id)?.nome || '?';
    if (tipo === 'subgrupo') return nomes?.subgrupos?.[id] || subgruposMap.get(id)?.nome || '?';
    if (tipo === 'produto') return produtosMap.get(id)?.nome || '?';
    return '?';
  };

  // Busca deferida — mantém o input responsivo enquanto a árvore recomputa em background
  const buscaDeferred = useDeferredValue(busca);

  // Construir hierarquia completa, usando índices pré-computados
  const departamentoHierarchy = useMemo(() => {
    const term = buscaDeferred.trim().toLowerCase();
    return departamentos.map(dep => {
      const gruposDoDep = (gruposByDep.get(dep.id) || []).map(g => {
        const subsDoGrupo = (subsByGrupo.get(g.id) || []).map(s => {
          const allProds = prodsBySub.get(s.id) || [];
          const matchSub = !term || (subLower.get(s.id) || '').includes(term);
          const prods = !term
            ? allProds
            : matchSub
              ? allProds
              : allProds.filter(p => {
                  const low = produtoLower.get(p.id);
                  return !!low && (low.nome.includes(term) || low.codigo.includes(term));
                });
          return { ...s, produtos: prods };
        }).filter(s => {
          if (!term) return true;
          return (subLower.get(s.id) || '').includes(term) || s.produtos.length > 0;
        });
        return { ...g, subgrupos: subsDoGrupo };
      }).filter(g => {
        if (!term) return true;
        return (grupoLower.get(g.id) || '').includes(term) || g.subgrupos.length > 0;
      });
      return { departamento: dep, grupos: gruposDoDep };
    });
  }, [departamentos, gruposByDep, subsByGrupo, prodsBySub, produtoLower, subLower, grupoLower, buscaDeferred]);

  // Auto-expandir nós que casam com a busca
  useEffect(() => {
    if (!buscaDeferred.trim()) return;
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
  }, [buscaDeferred, departamentoHierarchy]);

  // Cascata de seleção (idêntica à de Listas) — usa índices pré-computados
  const handleSelectItem = (tipo: 'departamento' | 'grupo' | 'subgrupo' | 'produto', id: string) => {
    const key = `${tipo}:${id}`;
    setSelectedItems(prev => {
      const next = new Set(prev);
      const add = !next.has(key);
      if (add) next.add(key); else next.delete(key);
      const op = (k: string) => add ? next.add(k) : next.delete(k);
      if (tipo === 'departamento') {
        (gruposByDep.get(id) || []).forEach(g => {
          op(`grupo:${g.id}`);
          (subsByGrupo.get(g.id) || []).forEach(s => {
            op(`subgrupo:${s.id}`);
            (prodsBySub.get(s.id) || []).forEach(p => op(`produto:${p.id}`));
          });
        });
      } else if (tipo === 'grupo') {
        (subsByGrupo.get(id) || []).forEach(s => {
          op(`subgrupo:${s.id}`);
          (prodsBySub.get(s.id) || []).forEach(p => op(`produto:${p.id}`));
        });
      } else if (tipo === 'subgrupo') {
        (prodsBySub.get(id) || []).forEach(p => op(`produto:${p.id}`));
      }
      return next;
    });
  };

  // Toggle estável usando setter funcional — não depende do Set atual
  const toggleSetStable = useCallback((setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);
  // Wrapper para manter chamadas atuais (toggleSet(set, setter, id))
  const toggleSet = useCallback((_set: Set<string>, setter: any, id: string) => {
    toggleSetStable(setter, id);
  }, [toggleSetStable]);

  const toggleCollapseRow = useCallback((tipo: string, id: string) => {
    if (tipo === 'departamento') toggleSetStable(setCollapsedDeps, id);
    else if (tipo === 'grupo') toggleSetStable(setCollapsedGrupos, id);
    else if (tipo === 'subgrupo') toggleSetStable(setCollapsedSubs, id);
  }, [toggleSetStable]);

  const handleAdicionarSelecionados = () => {
    if (selectedItems.size === 0) return;
    const produtosAdicionar: string[] = [];
    selectedItems.forEach(k => { if (k.startsWith('produto:')) produtosAdicionar.push(k.slice(8)); });
    if (produtosAdicionar.length === 0) { setSelectedItems(new Set()); return; }

    setItems(prev => {
      const next = [...prev];
      const hasProduto = new Set<string>();
      const hasSubgrupo = new Set<string>();
      const hasGrupo = new Set<string>();
      const hasDep = new Set<string>();
      for (const it of next) {
        if (it.tipo === 'produto') hasProduto.add(it.id);
        else if (it.tipo === 'subgrupo') hasSubgrupo.add(it.id);
        else if (it.tipo === 'grupo') hasGrupo.add(it.id);
        else if (it.tipo === 'departamento') hasDep.add(it.id);
      }
      for (const pid of produtosAdicionar) {
        if (hasProduto.has(pid)) continue;
        const produto = produtosMap.get(pid);
        if (!produto) continue;
        const subgrupo = subgruposMap.get(produto.subgrupoId);
        const grupo = subgrupo ? gruposMap.get(subgrupo.grupoId) : undefined;
        const depId = grupo?.departamentoId;
        if (depId && !hasDep.has(depId)) {
          next.push({ tipo: 'departamento', id: depId });
          hasDep.add(depId);
        }
        if (grupo && !hasGrupo.has(grupo.id)) {
          next.push({ tipo: 'grupo', id: grupo.id, parentId: depId });
          hasGrupo.add(grupo.id);
        }
        if (subgrupo && !hasSubgrupo.has(subgrupo.id)) {
          next.push({ tipo: 'subgrupo', id: subgrupo.id, parentId: grupo?.id });
          hasSubgrupo.add(subgrupo.id);
        }
        next.push({ tipo: 'produto', id: pid, parentId: subgrupo?.id });
        hasProduto.add(pid);
      }
      return next;
    });
    setSelectedItems(new Set());
  };

  const removerItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const tipoNivel = (t: VisualizacaoItem['tipo']) =>
    t === 'departamento' ? 0 : t === 'grupo' ? 1 : t === 'subgrupo' ? 2 : 3;

  // Bloco = item + descendentes consecutivos (níveis maiores que o do item)
  const getBlocoRange = (arr: VisualizacaoItem[], start: number): [number, number] => {
    const nivel = tipoNivel(arr[start].tipo);
    let end = start + 1;
    while (end < arr.length && tipoNivel(arr[end].tipo) > nivel) end++;
    return [start, end];
  };

  const parentTipo = (t: VisualizacaoItem['tipo']): VisualizacaoItem['tipo'] | null =>
    t === 'grupo' ? 'departamento' : t === 'subgrupo' ? 'grupo' : t === 'produto' ? 'subgrupo' : null;

  const moverItem = (idx: number, dir: -1 | 1) => {
    setItems(prev => {
      const arr = [...prev];
      const alvo = arr[idx];
      if (!alvo) return prev;
      const Tlvl = tipoNivel(alvo.tipo);
      const Ptype = parentTipo(alvo.tipo);
      const [aStart, aEnd] = getBlocoRange(arr, idx);

      if (dir === 1) {
        // 1) próximo irmão do mesmo tipo dentro do mesmo pai
        let nStart = -1;
        for (let i = aEnd; i < arr.length; i++) {
          if (arr[i].tipo === alvo.tipo) { nStart = i; break; }
          if (tipoNivel(arr[i].tipo) < Tlvl) break; // saiu do pai atual
        }
        if (nStart !== -1) {
          const [, nEnd] = getBlocoRange(arr, nStart);
          const blocoAlvo = arr.slice(aStart, aEnd);
          const entre = arr.slice(aEnd, nStart);
          const blocoViz = arr.slice(nStart, nEnd);
          return [
            ...arr.slice(0, aStart),
            ...blocoViz,
            ...entre,
            ...blocoAlvo,
            ...arr.slice(nEnd),
          ];
        }
        // 2) cross-parent: vai pro próximo pai como PRIMEIRO filho
        if (!Ptype) return prev;
        let pIdx = -1;
        for (let i = aEnd; i < arr.length; i++) {
          if (arr[i].tipo === Ptype && arr[i].id !== alvo.parentId) { pIdx = i; break; }
        }
        if (pIdx === -1) return prev;
        const blocoAlvo = arr.slice(aStart, aEnd).map((it, i) =>
          i === 0 ? { ...it, parentId: arr[pIdx].id } : it
        );
        const removed = [...arr.slice(0, aStart), ...arr.slice(aEnd)];
        const newPIdx = pIdx - (aEnd - aStart); // pIdx > aEnd, então desloca
        return [
          ...removed.slice(0, newPIdx + 1),
          ...blocoAlvo,
          ...removed.slice(newPIdx + 1),
        ];
      } else {
        // 1) irmão anterior do mesmo tipo dentro do mesmo pai
        let pStart = -1;
        for (let i = aStart - 1; i >= 0; i--) {
          if (tipoNivel(arr[i].tipo) < Tlvl) break;
          if (arr[i].tipo === alvo.tipo) { pStart = i; break; }
        }
        if (pStart !== -1) {
          const pEnd = aStart; // bloco do irmão termina onde alvo começa
          const blocoPrev = arr.slice(pStart, pEnd);
          const blocoAlvo = arr.slice(aStart, aEnd);
          return [
            ...arr.slice(0, pStart),
            ...blocoAlvo,
            ...blocoPrev,
            ...arr.slice(aEnd),
          ];
        }
        // 2) cross-parent: vai pro pai anterior como ÚLTIMO filho
        if (!Ptype) return prev;
        let pIdx = -1;
        for (let i = aStart - 1; i >= 0; i--) {
          if (arr[i].tipo === Ptype && arr[i].id !== alvo.parentId) { pIdx = i; break; }
        }
        if (pIdx === -1) return prev;
        const [, pEnd] = getBlocoRange(arr, pIdx);
        const blocoAlvo = arr.slice(aStart, aEnd).map((it, i) =>
          i === 0 ? { ...it, parentId: arr[pIdx].id } : it
        );
        const removed = [...arr.slice(0, aStart), ...arr.slice(aEnd)];
        // pEnd <= aStart, então não desloca
        return [
          ...removed.slice(0, pEnd),
          ...blocoAlvo,
          ...removed.slice(pEnd),
        ];
      }
    });
  };

  const reatribuirParent = (idx: number, novoParentId: string) => {
    setItems(prev => {
      const arr = [...prev];
      const alvo = arr[idx];
      if (!alvo || alvo.parentId === novoParentId) return prev;
      const Ptype = parentTipo(alvo.tipo);
      if (!Ptype) return prev;
      const [aStart, aEnd] = getBlocoRange(arr, idx);
      const bloco = arr.slice(aStart, aEnd).map((it, i) =>
        i === 0 ? { ...it, parentId: novoParentId } : it
      );
      const semBloco = [...arr.slice(0, aStart), ...arr.slice(aEnd)];
      const pIdx = semBloco.findIndex(it => it.tipo === Ptype && it.id === novoParentId);
      if (pIdx === -1) return prev;
      const [, pEnd] = getBlocoRange(semBloco, pIdx);
      return [...semBloco.slice(0, pEnd), ...bloco, ...semBloco.slice(pEnd)];
    });
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

  // Pré-computa ancestrais e listas de pai por tipo para o painel direito
  const itemMeta = useMemo(() => {
    const subParent = new Map<string, string | undefined>(); // sub.id -> grupo.id
    const grupoParent = new Map<string, string | undefined>(); // grupo.id -> dep.id
    const depOpts: { id: string; nome: string }[] = [];
    const grupoOpts: { id: string; nome: string }[] = [];
    const subOpts: { id: string; nome: string }[] = [];
    for (const it of items) {
      if (it.tipo === 'subgrupo') subParent.set(it.id, it.parentId);
      else if (it.tipo === 'grupo') grupoParent.set(it.id, it.parentId);
    }
    for (const it of items) {
      if (it.tipo === 'departamento') depOpts.push({ id: it.id, nome: getNome('departamento', it.id) });
      else if (it.tipo === 'grupo') grupoOpts.push({ id: it.id, nome: getNome('grupo', it.id) });
      else if (it.tipo === 'subgrupo') subOpts.push({ id: it.id, nome: getNome('subgrupo', it.id) });
    }
    return { subParent, grupoParent, depOpts, grupoOpts, subOpts };
  }, [items, nomes, departamentosMap, gruposMap, subgruposMap]);

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
                // Resolver ancestrais via mapas pré-computados
                let subId: string | undefined;
                let grupoId: string | undefined;
                let depId: string | undefined;
                if (item.tipo === 'produto') {
                  subId = item.parentId;
                  grupoId = subId ? itemMeta.subParent.get(subId) : undefined;
                  depId = grupoId ? itemMeta.grupoParent.get(grupoId) : undefined;
                } else if (item.tipo === 'subgrupo') {
                  grupoId = item.parentId;
                  depId = grupoId ? itemMeta.grupoParent.get(grupoId) : undefined;
                } else if (item.tipo === 'grupo') {
                  depId = item.parentId;
                }
                const hiddenByAncestor =
                  (depId && collapsedDeps.has(depId)) ||
                  (grupoId && collapsedGrupos.has(grupoId)) ||
                  (subId && collapsedSubs.has(subId));
                if (hiddenByAncestor) return null;

                const indent = item.tipo === 'departamento' ? 0
                  : item.tipo === 'grupo' ? 4
                  : item.tipo === 'subgrupo' ? 8
                  : 12;
                const podeRenomear = item.tipo !== 'produto';
                const podeColapsar = item.tipo !== 'produto';
                const colapsado =
                  item.tipo === 'departamento' ? collapsedDeps.has(item.id) :
                  item.tipo === 'grupo' ? collapsedGrupos.has(item.id) :
                  item.tipo === 'subgrupo' ? collapsedSubs.has(item.id) : false;
                const onToggleCollapse = () => {
                  if (item.tipo === 'departamento') toggleSet(collapsedDeps, setCollapsedDeps, item.id);
                  else if (item.tipo === 'grupo') toggleSet(collapsedGrupos, setCollapsedGrupos, item.id);
                  else if (item.tipo === 'subgrupo') toggleSet(collapsedSubs, setCollapsedSubs, item.id);
                };
                const opcoesPai =
                  item.tipo === 'grupo' ? itemMeta.depOpts :
                  item.tipo === 'subgrupo' ? itemMeta.grupoOpts :
                  item.tipo === 'produto' ? itemMeta.subOpts :
                  [];
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
                    {podeColapsar ? (
                      <button
                        type="button"
                        onClick={onToggleCollapse}
                        className="p-0 hover:bg-muted rounded shrink-0"
                        title={colapsado ? 'Expandir' : 'Contrair'}
                      >
                        {colapsado ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    ) : (
                      <span className="w-3 shrink-0" />
                    )}
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
                        <SelectContent position="popper" align="start" className="max-h-[min(240px,var(--radix-select-content-available-height))]">
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
