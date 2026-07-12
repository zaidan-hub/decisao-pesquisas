import { useState, useMemo, useEffect, useDeferredValue, useCallback, memo } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ArrowUp, ArrowDown, X, Pencil, MoveRight, Search, ChevronDown, ChevronRight, Check, Minus, Plus, Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { VisualizacaoItem, HierarquiaPersonalizada } from '@/hooks/useRelatoriosPersonalizados';
import { Cliente } from '@/types';

type CheckState = boolean | 'indeterminate';

const TriCheckbox = ({ state, onToggle }: { state: CheckState; onToggle: () => void }) => (
  <CheckboxPrimitive.Root
    checked={state === true}
    data-state={state === 'indeterminate' ? 'indeterminate' : state ? 'checked' : 'unchecked'}
    onClick={(e) => { e.preventDefault(); onToggle(); }}
    className={cn(
      'peer h-4 w-4 shrink-0 rounded-[4px] border border-primary ring-offset-background',
      'data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    )}
  >
    <span className="flex items-center justify-center text-current">
      {state === 'indeterminate' ? <Minus className="h-4 w-4" /> : state ? <Check className="h-4 w-4" /> : null}
    </span>
  </CheckboxPrimitive.Root>
);

// ---------- Lazy popover para reatribuir pai ----------
interface ReatribuirPaiOption { id: string; nome: string; }
const ReatribuirPaiButton = memo(({ value, opcoes, onChange }: { value?: string; opcoes: ReatribuirPaiOption[]; onChange: (id: string) => void; }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Mover para outro pai">
          <MoveRight className="w-3 h-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-1 w-64 max-h-60 overflow-auto" align="start" sideOffset={4}>
        {opcoes.map(o => (
          <button
            key={o.id}
            type="button"
            onClick={() => { onChange(o.id); setOpen(false); }}
            className="w-full text-left text-xs px-2 py-1 rounded hover:bg-muted flex items-center gap-2"
          >
            <span className="w-3 shrink-0">{o.id === value && <Check className="w-3 h-3" />}</span>
            <span className="truncate">{o.nome}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
});
ReatribuirPaiButton.displayName = 'ReatribuirPaiButton';

// ---------- Linha memoizada do painel direito (Hierarquia) ----------
interface HierarquiaRowProps {
  item: VisualizacaoItem;
  idx: number;
  nome: string;
  colapsado: boolean;
  podeColapsar: boolean;
  podeRenomear: boolean;
  opcoesPai: ReatribuirPaiOption[];
  onToggleCollapse: (tipo: string, id: string) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onRemove: (idx: number) => void;
  onRename: (tipo: 'departamento' | 'grupo' | 'subgrupo', id: string, nomeAtual: string) => void;
  onReatribuir: (idx: number, novoParentId: string) => void;
}
const HierarquiaRow = memo(({
  item, idx, nome, colapsado, podeColapsar, podeRenomear, opcoesPai,
  onToggleCollapse, onMove, onRemove, onRename, onReatribuir,
}: HierarquiaRowProps) => {
  const indent = item.tipo === 'departamento' ? 0 : item.tipo === 'grupo' ? 4 : item.tipo === 'subgrupo' ? 8 : 12;
  const rowClass = item.tipo === 'departamento' ? 'bg-muted font-bold'
    : item.tipo === 'grupo' ? 'bg-muted/60 font-semibold'
    : item.tipo === 'subgrupo' ? 'bg-muted/30' : '';
  return (
    <div className={`flex items-center gap-1 p-1 rounded text-xs ${rowClass}`} style={{ paddingLeft: indent + 4 }}>
      {podeColapsar ? (
        <button type="button" onClick={() => onToggleCollapse(item.tipo, item.id)} className="p-0 hover:bg-muted rounded shrink-0" title={colapsado ? 'Expandir' : 'Contrair'}>
          {colapsado ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      ) : (
        <span className="w-3 shrink-0" />
      )}
      <span className="flex-1 truncate">
        <span className="text-muted-foreground mr-1">[{item.tipo[0].toUpperCase()}]</span>
        {nome}
      </span>
      {podeRenomear && (
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onRename(item.tipo as any, item.id, nome)} title="Renomear">
          <Pencil className="w-3 h-3" />
        </Button>
      )}
      {opcoesPai.length > 0 && item.tipo !== 'departamento' && (
        <ReatribuirPaiButton value={item.parentId} opcoes={opcoesPai} onChange={(v) => onReatribuir(idx, v)} />
      )}
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onMove(idx, -1)} title="Mover para cima">
        <ArrowUp className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onMove(idx, 1)} title="Mover para baixo">
        <ArrowDown className="w-3 h-3" />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onRemove(idx)} title="Remover">
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
});
HierarquiaRow.displayName = 'HierarquiaRow';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cliente: Cliente | null;
  onSaved: (produtos: string[], hierarquia: HierarquiaPersonalizada) => Promise<void> | void;
}

export const GuiaPrecosEditor = ({ open, onOpenChange, cliente, onSaved }: Props) => {
  const { departamentos } = useDepartamentos();
  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();
  const { produtos } = useProdutos();

  const [items, setItems] = useState<VisualizacaoItem[]>([]);
  const [nomes, setNomes] = useState<HierarquiaPersonalizada['nomes']>({ departamentos: {}, grupos: {}, subgrupos: {} });
  const [busca, setBusca] = useState('');
  const [buscaHierarquia, setBuscaHierarquia] = useState('');
  const buscaHierarquiaDeferred = useDeferredValue(buscaHierarquia);
  const [renomeando, setRenomeando] = useState<{ tipo: 'departamento' | 'grupo' | 'subgrupo'; id: string } | null>(null);
  const [renomeValor, setRenomeValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Seleção (staging) — produtos marcados no painel esquerdo
  const [stagedProdutos, setStagedProdutos] = useState<Set<string>>(new Set());
  const [expandedDeps, setExpandedDeps] = useState<Set<string>>(new Set());
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  // Collapse no painel direito
  const [collapsedDeps, setCollapsedDeps] = useState<Set<string>>(new Set());
  const [collapsedGrupos, setCollapsedGrupos] = useState<Set<string>>(new Set());
  const [collapsedSubs, setCollapsedSubs] = useState<Set<string>>(new Set());

  // Inicializa a partir do cliente ao abrir
  useEffect(() => {
    if (open) {
      const g = cliente?.guiaPrecos;
      setItems(g?.hierarquiaCustomizada?.ordem || []);
      setNomes(g?.hierarquiaCustomizada?.nomes || { departamentos: {}, grupos: {}, subgrupos: {} });
      setStagedProdutos(new Set());
      setBusca('');
      setBuscaHierarquia('');
      setExpandedDeps(new Set());
      setExpandedGrupos(new Set());
      setExpandedSubs(new Set());
      setCollapsedDeps(new Set());
      setCollapsedGrupos(new Set());
      setCollapsedSubs(new Set());
    }
  }, [open, cliente]);

  const departamentosMap = useMemo(() => new Map(departamentos.map(d => [d.id, d])), [departamentos]);
  const gruposMap = useMemo(() => new Map(grupos.map(g => [g.id, g])), [grupos]);
  const subgruposMap = useMemo(() => new Map(subgrupos.map(s => [s.id, s])), [subgrupos]);
  const produtosMap = useMemo(() => new Map(produtos.map(p => [p.id, p])), [produtos]);

  const gruposByDep = useMemo(() => {
    const m = new Map<string, any[]>();
    grupos.forEach(g => { const arr = m.get(g.departamentoId) || []; arr.push(g); m.set(g.departamentoId, arr); });
    return m;
  }, [grupos]);
  const subsByGrupo = useMemo(() => {
    const m = new Map<string, any[]>();
    subgrupos.forEach(s => { const arr = m.get(s.grupoId) || []; arr.push(s); m.set(s.grupoId, arr); });
    return m;
  }, [subgrupos]);
  const prodsBySub = useMemo(() => {
    const m = new Map<string, any[]>();
    produtos.forEach(p => { const arr = m.get(p.subgrupoId) || []; arr.push(p); m.set(p.subgrupoId, arr); });
    return m;
  }, [produtos]);
  const produtoLower = useMemo(() => {
    const m = new Map<string, { nome: string; codigo: string }>();
    produtos.forEach(p => m.set(p.id, { nome: (p.nome || '').toLowerCase(), codigo: (p.codigo || '').toLowerCase() }));
    return m;
  }, [produtos]);
  const subLower = useMemo(() => { const m = new Map<string, string>(); subgrupos.forEach(s => m.set(s.id, (s.nome || '').toLowerCase())); return m; }, [subgrupos]);
  const grupoLower = useMemo(() => { const m = new Map<string, string>(); grupos.forEach(g => m.set(g.id, (g.nome || '').toLowerCase())); return m; }, [grupos]);

  const getNome = (tipo: string, id: string) => {
    if (tipo === 'departamento') return nomes?.departamentos?.[id] || departamentosMap.get(id)?.nome || '?';
    if (tipo === 'grupo') return nomes?.grupos?.[id] || gruposMap.get(id)?.nome || '?';
    if (tipo === 'subgrupo') return nomes?.subgrupos?.[id] || subgruposMap.get(id)?.nome || '?';
    if (tipo === 'produto') return produtosMap.get(id)?.nome || '?';
    return '?';
  };

  const produtosNaHierarquia = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.tipo === 'produto') set.add(i.id); });
    return set;
  }, [items]);

  const buscaDeferred = useDeferredValue(busca);

  const departamentoHierarchy = useMemo(() => {
    const term = buscaDeferred.trim().toLowerCase();
    return departamentos.map(dep => {
      const gruposDoDep = (gruposByDep.get(dep.id) || []).map(g => {
        const subsDoGrupo = (subsByGrupo.get(g.id) || []).map(s => {
          const allProds = (prodsBySub.get(s.id) || []).filter(p => !produtosNaHierarquia.has(p.id));
          const matchSub = !term || (subLower.get(s.id) || '').includes(term);
          const prods = !term ? allProds : matchSub ? allProds : allProds.filter(p => {
            const low = produtoLower.get(p.id);
            return !!low && (low.nome.includes(term) || low.codigo.includes(term));
          });
          return { ...s, produtos: prods };
        }).filter(s => { if (!term) return true; return (subLower.get(s.id) || '').includes(term) || s.produtos.length > 0; });
        return { ...g, subgrupos: subsDoGrupo };
      }).filter(g => { if (!term) return true; return (grupoLower.get(g.id) || '').includes(term) || g.subgrupos.length > 0; });
      return { departamento: dep, grupos: gruposDoDep };
    });
  }, [departamentos, gruposByDep, subsByGrupo, prodsBySub, produtoLower, subLower, grupoLower, buscaDeferred, produtosNaHierarquia]);

  useEffect(() => {
    if (!buscaDeferred.trim()) return;
    const deps = new Set<string>(); const grps = new Set<string>(); const subs = new Set<string>();
    departamentoHierarchy.forEach(d => {
      if (d.grupos.length > 0) {
        deps.add(d.departamento.id);
        d.grupos.forEach(g => { grps.add(g.id); g.subgrupos.forEach(s => subs.add(s.id)); });
      }
    });
    setExpandedDeps(deps); setExpandedGrupos(grps); setExpandedSubs(subs);
  }, [buscaDeferred, departamentoHierarchy]);

  // ---- Tri-state (baseado em produtos staged) ----
  const getStateFor = (prods: { id: string }[]): CheckState => {
    if (prods.length === 0) return false;
    const checked = prods.filter(p => stagedProdutos.has(p.id)).length;
    if (checked === 0) return false;
    if (checked === prods.length) return true;
    return 'indeterminate';
  };
  const toggleProdutos = (prods: { id: string }[]) => {
    setStagedProdutos(prev => {
      const next = new Set(prev);
      const allChecked = prods.length > 0 && prods.every(p => next.has(p.id));
      if (allChecked) prods.forEach(p => next.delete(p.id));
      else prods.forEach(p => next.add(p.id));
      return next;
    });
  };

  const toggleSetStable = useCallback((setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const toggleCollapseRow = useCallback((tipo: string, id: string) => {
    if (tipo === 'departamento') toggleSetStable(setCollapsedDeps, id);
    else if (tipo === 'grupo') toggleSetStable(setCollapsedGrupos, id);
    else if (tipo === 'subgrupo') toggleSetStable(setCollapsedSubs, id);
  }, [toggleSetStable]);

  const tipoNivel = (t: VisualizacaoItem['tipo']) => t === 'departamento' ? 0 : t === 'grupo' ? 1 : t === 'subgrupo' ? 2 : 3;
  const getBlocoRange = (arr: VisualizacaoItem[], start: number): [number, number] => {
    const nivel = tipoNivel(arr[start].tipo);
    let end = start + 1;
    while (end < arr.length && tipoNivel(arr[end].tipo) > nivel) end++;
    return [start, end];
  };
  const parentTipo = (t: VisualizacaoItem['tipo']): VisualizacaoItem['tipo'] | null =>
    t === 'grupo' ? 'departamento' : t === 'subgrupo' ? 'grupo' : t === 'produto' ? 'subgrupo' : null;

  const stagedCount = stagedProdutos.size;

  const handleAdicionar = () => {
    if (stagedProdutos.size === 0) return;
    const produtosAdicionar = Array.from(stagedProdutos);
    const novosDeps: string[] = []; const novosGrupos: string[] = []; const novosSubs: string[] = [];
    const expandirDeps: string[] = []; const expandirGrupos: string[] = []; const expandirSubs: string[] = [];
    let adicionados = 0; let jaExistentes = 0;

    setItems(prev => {
      const next = [...prev];
      const findIdx = (tipo: VisualizacaoItem['tipo'], id: string) => next.findIndex(i => i.tipo === tipo && i.id === id);
      const ensureNode = (node: VisualizacaoItem, pTipo: VisualizacaoItem['tipo'] | null, pId: string | undefined): number => {
        const existing = findIdx(node.tipo, node.id);
        if (existing !== -1) return existing;
        if (!pTipo || !pId) { next.push(node); return next.length - 1; }
        const pIdx = findIdx(pTipo, pId);
        if (pIdx === -1) { next.push(node); return next.length - 1; }
        const [, pEnd] = getBlocoRange(next, pIdx);
        next.splice(pEnd, 0, node);
        return pEnd;
      };
      for (const pid of produtosAdicionar) {
        if (findIdx('produto', pid) !== -1) { jaExistentes++; continue; }
        const produto = produtosMap.get(pid);
        if (!produto) continue;
        const subgrupo = subgruposMap.get(produto.subgrupoId);
        const grupo = subgrupo ? gruposMap.get(subgrupo.grupoId) : undefined;
        const depId = grupo?.departamentoId;
        if (depId) {
          if (findIdx('departamento', depId) === -1) novosDeps.push(depId);
          ensureNode({ tipo: 'departamento', id: depId }, null, undefined);
          expandirDeps.push(depId);
        }
        if (grupo) {
          if (findIdx('grupo', grupo.id) === -1) novosGrupos.push(grupo.id);
          ensureNode({ tipo: 'grupo', id: grupo.id, parentId: depId }, 'departamento', depId);
          expandirGrupos.push(grupo.id);
        }
        if (subgrupo) {
          if (findIdx('subgrupo', subgrupo.id) === -1) novosSubs.push(subgrupo.id);
          ensureNode({ tipo: 'subgrupo', id: subgrupo.id, parentId: grupo?.id }, 'grupo', grupo?.id);
          expandirSubs.push(subgrupo.id);
        }
        ensureNode({ tipo: 'produto', id: pid, parentId: subgrupo?.id }, 'subgrupo', subgrupo?.id);
        adicionados++;
      }
      return next;
    });

    setCollapsedDeps(prev => { const n = new Set(prev); novosDeps.forEach(id => n.add(id)); expandirDeps.forEach(id => n.delete(id)); return n; });
    setCollapsedGrupos(prev => { const n = new Set(prev); novosGrupos.forEach(id => n.add(id)); expandirGrupos.forEach(id => n.delete(id)); return n; });
    setCollapsedSubs(prev => { const n = new Set(prev); novosSubs.forEach(id => n.add(id)); expandirSubs.forEach(id => n.delete(id)); return n; });
    setStagedProdutos(new Set());

    if (adicionados > 0) toast({ title: `${adicionados} produto(s) adicionado(s)`, description: jaExistentes > 0 ? `${jaExistentes} já estava(m) na hierarquia.` : undefined });
    else if (jaExistentes > 0) toast({ title: 'Nenhum produto novo', description: `Os ${jaExistentes} produto(s) selecionado(s) já estão na hierarquia.` });
  };

  const removerItem = useCallback((idx: number) => { setItems(prev => prev.filter((_, i) => i !== idx)); }, []);
  const onRenameRow = useCallback((tipo: 'departamento' | 'grupo' | 'subgrupo', id: string, nomeAtual: string) => {
    setRenomeando({ tipo, id }); setRenomeValor(nomeAtual);
  }, []);

  const moverItem = useCallback((idx: number, dir: -1 | 1) => {
    setItems(prev => {
      const arr = [...prev];
      const alvo = arr[idx];
      if (!alvo) return prev;
      const Tlvl = tipoNivel(alvo.tipo);
      const Ptype = parentTipo(alvo.tipo);
      const [aStart, aEnd] = getBlocoRange(arr, idx);
      if (dir === 1) {
        let nStart = -1;
        for (let i = aEnd; i < arr.length; i++) {
          if (arr[i].tipo === alvo.tipo) { nStart = i; break; }
          if (tipoNivel(arr[i].tipo) < Tlvl) break;
        }
        if (nStart !== -1) {
          const [, nEnd] = getBlocoRange(arr, nStart);
          const blocoAlvo = arr.slice(aStart, aEnd);
          const entre = arr.slice(aEnd, nStart);
          const blocoViz = arr.slice(nStart, nEnd);
          return [...arr.slice(0, aStart), ...blocoViz, ...entre, ...blocoAlvo, ...arr.slice(nEnd)];
        }
        if (!Ptype) return prev;
        let pIdx = -1;
        for (let i = aEnd; i < arr.length; i++) { if (arr[i].tipo === Ptype && arr[i].id !== alvo.parentId) { pIdx = i; break; } }
        if (pIdx === -1) return prev;
        const blocoAlvo = arr.slice(aStart, aEnd).map((it, i) => i === 0 ? { ...it, parentId: arr[pIdx].id } : it);
        const removed = [...arr.slice(0, aStart), ...arr.slice(aEnd)];
        const newPIdx = pIdx - (aEnd - aStart);
        return [...removed.slice(0, newPIdx + 1), ...blocoAlvo, ...removed.slice(newPIdx + 1)];
      } else {
        let pStart = -1;
        for (let i = aStart - 1; i >= 0; i--) { if (tipoNivel(arr[i].tipo) < Tlvl) break; if (arr[i].tipo === alvo.tipo) { pStart = i; break; } }
        if (pStart !== -1) {
          const pEnd = aStart;
          const blocoPrev = arr.slice(pStart, pEnd);
          const blocoAlvo = arr.slice(aStart, aEnd);
          return [...arr.slice(0, pStart), ...blocoAlvo, ...blocoPrev, ...arr.slice(aEnd)];
        }
        if (!Ptype) return prev;
        let pIdx = -1;
        for (let i = aStart - 1; i >= 0; i--) { if (arr[i].tipo === Ptype && arr[i].id !== alvo.parentId) { pIdx = i; break; } }
        if (pIdx === -1) return prev;
        const [, pEnd] = getBlocoRange(arr, pIdx);
        const blocoAlvo = arr.slice(aStart, aEnd).map((it, i) => i === 0 ? { ...it, parentId: arr[pIdx].id } : it);
        const removed = [...arr.slice(0, aStart), ...arr.slice(aEnd)];
        return [...removed.slice(0, pEnd), ...blocoAlvo, ...removed.slice(pEnd)];
      }
    });
  }, []);

  const reatribuirParent = useCallback((idx: number, novoParentId: string) => {
    setItems(prev => {
      const arr = [...prev];
      const alvo = arr[idx];
      if (!alvo || alvo.parentId === novoParentId) return prev;
      const Ptype = parentTipo(alvo.tipo);
      if (!Ptype) return prev;
      const [aStart, aEnd] = getBlocoRange(arr, idx);
      const bloco = arr.slice(aStart, aEnd).map((it, i) => i === 0 ? { ...it, parentId: novoParentId } : it);
      const semBloco = [...arr.slice(0, aStart), ...arr.slice(aEnd)];
      const pIdx = semBloco.findIndex(it => it.tipo === Ptype && it.id === novoParentId);
      if (pIdx === -1) return prev;
      const [, pEnd] = getBlocoRange(semBloco, pIdx);
      return [...semBloco.slice(0, pEnd), ...bloco, ...semBloco.slice(pEnd)];
    });
  }, []);

  const aplicarRenomeio = () => {
    if (!renomeando) return;
    const valor = renomeValor.trim();
    setNomes(prev => {
      const next = { ...prev } as any;
      const key = renomeando.tipo === 'departamento' ? 'departamentos' : renomeando.tipo === 'grupo' ? 'grupos' : 'subgrupos';
      next[key] = { ...(next[key] || {}) };
      if (valor) next[key][renomeando.id] = valor; else delete next[key][renomeando.id];
      return next;
    });
    setRenomeando(null); setRenomeValor('');
  };

  const itemMeta = useMemo(() => {
    const subParent = new Map<string, string | undefined>();
    const grupoParent = new Map<string, string | undefined>();
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

  const itensVisiveis = useMemo(() => {
    const termo = buscaHierarquiaDeferred.trim().toLowerCase();
    const out: { item: VisualizacaoItem; idx: number; nome: string; colapsado: boolean; opcoesPai: ReatribuirPaiOption[] }[] = [];
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      let subId: string | undefined; let grupoId: string | undefined; let depId: string | undefined;
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
      const rowNome = getNome(item.tipo, item.id);
      if (termo) {
        if (!rowNome.toLowerCase().includes(termo)) continue;
      } else {
        const hidden = (depId && collapsedDeps.has(depId)) || (grupoId && collapsedGrupos.has(grupoId)) || (subId && collapsedSubs.has(subId));
        if (hidden) continue;
      }
      const colapsado = item.tipo === 'departamento' ? collapsedDeps.has(item.id)
        : item.tipo === 'grupo' ? collapsedGrupos.has(item.id)
        : item.tipo === 'subgrupo' ? collapsedSubs.has(item.id) : false;
      const opcoesPai = item.tipo === 'grupo' ? itemMeta.depOpts
        : item.tipo === 'subgrupo' ? itemMeta.grupoOpts
        : item.tipo === 'produto' ? itemMeta.subOpts : [];
      out.push({ item, idx, nome: rowNome, colapsado, opcoesPai });
    }
    return out;
  }, [items, itemMeta, collapsedDeps, collapsedGrupos, collapsedSubs, nomes, departamentosMap, gruposMap, subgruposMap, produtosMap, buscaHierarquiaDeferred]);

  const produtosDeSubgrupo = (id: string) => (prodsBySub.get(id) || []).filter(p => !produtosNaHierarquia.has(p.id));

  const handleSalvar = async () => {
    const produtosFinais = items.filter(i => i.tipo === 'produto').map(i => i.id);
    setSalvando(true);
    try {
      await onSaved(produtosFinais, { ordem: items, nomes });
      onOpenChange(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Guia de Preços Personalizado</DialogTitle>
          <DialogDescription>
            {cliente?.nome ? `Cliente: ${cliente.nome}. ` : ''}Selecione os produtos e organize a hierarquia.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 flex-1 min-h-0 overflow-hidden">
          {/* Esquerda: Selecionar Produtos (tri-state) */}
          <div className="border rounded-md flex flex-col min-h-0">
            <div className="p-2 border-b space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Selecionar Produtos</span>
                {stagedCount > 0 && (
                  <Button type="button" size="sm" onClick={handleAdicionar}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar ({stagedCount})
                  </Button>
                )}
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar produtos, departamentos, grupos ou subgrupos..." className="pl-8 h-8" />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="p-2 space-y-1">
                {departamentoHierarchy.map(deptData => {
                  if (deptData.grupos.length === 0) return null;
                  const depExpanded = expandedDeps.has(deptData.departamento.id);
                  const deptProds = deptData.grupos.flatMap(g => g.subgrupos.flatMap((s: any) => s.produtos));
                  return (
                    <div key={deptData.departamento.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => toggleSetStable(setExpandedDeps, deptData.departamento.id)} className="p-0 hover:bg-muted rounded">
                          {depExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <TriCheckbox state={getStateFor(deptProds)} onToggle={() => toggleProdutos(deptProds)} />
                        <span className="font-semibold text-sm cursor-pointer" onClick={() => toggleProdutos(deptProds)}>{deptData.departamento.nome}</span>
                      </div>
                      {depExpanded && deptData.grupos.map(grupoData => {
                        const grpExpanded = expandedGrupos.has(grupoData.id);
                        const grupoProds = grupoData.subgrupos.flatMap((s: any) => s.produtos);
                        return (
                          <div key={grupoData.id} className="ml-5 space-y-1">
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => toggleSetStable(setExpandedGrupos, grupoData.id)} className="p-0 hover:bg-muted rounded">
                                {grpExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <TriCheckbox state={getStateFor(grupoProds)} onToggle={() => toggleProdutos(grupoProds)} />
                              <span className="font-medium text-sm cursor-pointer" onClick={() => toggleProdutos(grupoProds)}>{grupoData.nome}</span>
                            </div>
                            {grpExpanded && grupoData.subgrupos.map((subData: any) => {
                              const subExpanded = expandedSubs.has(subData.id);
                              return (
                                <div key={subData.id} className="ml-5 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => toggleSetStable(setExpandedSubs, subData.id)} className="p-0 hover:bg-muted rounded">
                                      {subExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                    <TriCheckbox state={getStateFor(subData.produtos)} onToggle={() => toggleProdutos(subData.produtos)} />
                                    <span className="text-sm cursor-pointer" onClick={() => toggleProdutos(subData.produtos)}>
                                      {subData.nome}
                                      <span className="text-xs text-muted-foreground ml-1">({subData.produtos.length})</span>
                                    </span>
                                  </div>
                                  {subExpanded && (
                                    <div className="ml-5 space-y-1">
                                      {subData.produtos.map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-2">
                                          <TriCheckbox state={stagedProdutos.has(p.id)} onToggle={() => toggleProdutos([p])} />
                                          <span className="text-xs text-muted-foreground w-12">{p.codigo}</span>
                                          <span className="text-sm flex-1 truncate cursor-pointer" onClick={() => toggleProdutos([p])}>{p.nome}</span>
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
            </div>
          </div>

          {/* Direita: Hierarquia */}
          <div className="border rounded-md flex flex-col min-h-0">
            <div className="p-2 border-b space-y-2">
              <span className="text-sm font-medium">Hierarquia ({items.length} itens)</span>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={buscaHierarquia} onChange={e => setBuscaHierarquia(e.target.value)} placeholder="Buscar na hierarquia..." className="pl-8 h-8" />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <div className="p-2 space-y-1">
                {items.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">Selecione produtos à esquerda para construir a hierarquia.</p>
                ) : itensVisiveis.map(({ item, idx, nome: rowNome, colapsado, opcoesPai }) => (
                  <HierarquiaRow
                    key={`${item.tipo}-${item.id}-${idx}`}
                    item={item}
                    idx={idx}
                    nome={rowNome}
                    colapsado={colapsado}
                    podeColapsar={item.tipo !== 'produto'}
                    podeRenomear={item.tipo !== 'produto'}
                    opcoesPai={opcoesPai}
                    onToggleCollapse={toggleCollapseRow}
                    onMove={moverItem}
                    onRemove={removerItem}
                    onRename={onRenameRow}
                    onReatribuir={reatribuirParent}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Rename dialog */}
        <Dialog open={!!renomeando} onOpenChange={(v) => !v && setRenomeando(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renomear {renomeando?.tipo}</DialogTitle>
              <DialogDescription>O nome será aplicado apenas neste guia de preços.</DialogDescription>
            </DialogHeader>
            <Input value={renomeValor} onChange={e => setRenomeValor(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRenomeando(null)}>Cancelar</Button>
              <Button onClick={aplicarRenomeio}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            <Save className="w-4 h-4 mr-2" />{salvando ? 'Salvando...' : 'Salvar Guia de Preços'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
