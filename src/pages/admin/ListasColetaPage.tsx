import { useMemo, useState } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lista } from '@/types';
import { Plus, Search, Edit, Trash2, Copy, List, ChevronRight, ChevronDown, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { useListas } from '@/hooks/useListas';
import { supabase } from '@/integrations/supabase/client';

type CheckState = boolean | 'indeterminate';

// Checkbox com estado tri-state (marcado / parcialmente marcado / desmarcado)
const TriCheckbox = ({
  state,
  onToggle,
  id,
}: {
  state: CheckState;
  onToggle: () => void;
  id?: string;
}) => (
  <CheckboxPrimitive.Root
    id={id}
    checked={state === true}
    data-state={state === 'indeterminate' ? 'indeterminate' : state ? 'checked' : 'unchecked'}
    onClick={(e) => {
      e.preventDefault();
      onToggle();
    }}
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

export const ListasColetaPage = () => {
  const { departamentos } = useDepartamentos();
  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();
  const { produtos } = useProdutos();
  const { listas, loading, refetch } = useListas();

  const [showForm, setShowForm] = useState(false);
  const [editingLista, setEditingLista] = useState<Lista | null>(null);
  const [deleteLista, setDeleteLista] = useState<Lista | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [expandedDepartamentos, setExpandedDepartamentos] = useState<Set<string>>(new Set());
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set());
  const [expandedSubgrupos, setExpandedSubgrupos] = useState<Set<string>>(new Set());
  const [selectedProdutos, setSelectedProdutos] = useState<Set<string>>(new Set());
  const [nome, setNome] = useState('');

  // ---- Mapas auxiliares para performance ----
  const produtosPorSubgrupo = useMemo(() => {
    const map = new Map<string, typeof produtos>();
    produtos.forEach((p) => {
      if (!map.has(p.subgrupoId)) map.set(p.subgrupoId, []);
      map.get(p.subgrupoId)!.push(p);
    });
    return map;
  }, [produtos]);

  const subgruposPorGrupo = useMemo(() => {
    const map = new Map<string, typeof subgrupos>();
    subgrupos.forEach((s) => {
      if (!map.has(s.grupoId)) map.set(s.grupoId, []);
      map.get(s.grupoId)!.push(s);
    });
    return map;
  }, [subgrupos]);

  const gruposPorDept = useMemo(() => {
    const map = new Map<string, typeof grupos>();
    grupos.forEach((g) => {
      const key = g.departamentoId || '__sem_dept__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });
    return map;
  }, [grupos]);

  const produtosDeSubgrupo = (subgrupoId: string) => produtosPorSubgrupo.get(subgrupoId) || [];
  const produtosDeGrupo = (grupoId: string) =>
    (subgruposPorGrupo.get(grupoId) || []).flatMap((s) => produtosDeSubgrupo(s.id));
  const produtosDeDept = (deptId: string) =>
    (gruposPorDept.get(deptId) || []).flatMap((g) => produtosDeGrupo(g.id));

  const getStateFor = (prods: { id: string }[]): CheckState => {
    if (prods.length === 0) return false;
    const checked = prods.filter((p) => selectedProdutos.has(p.id)).length;
    if (checked === 0) return false;
    if (checked === prods.length) return true;
    return 'indeterminate';
  };

  const toggleProdutos = (prods: { id: string }[]) => {
    setSelectedProdutos((prev) => {
      const next = new Set(prev);
      const allChecked = prods.length > 0 && prods.every((p) => next.has(p.id));
      if (allChecked) {
        prods.forEach((p) => next.delete(p.id));
      } else {
        prods.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const resetForm = () => {
    setNome('');
    setSelectedProdutos(new Set());
    setProductSearchTerm('');
    setExpandedDepartamentos(new Set());
    setExpandedGrupos(new Set());
    setExpandedSubgrupos(new Set());
  };

  // ---- Ordem fixa (hierarquia natural) para produtos selecionados ----
  const buildOrdenados = () => {
    const ordenados: string[] = [];
    departamentos.forEach((dept) => {
      (gruposPorDept.get(dept.id) || []).forEach((grupo) => {
        (subgruposPorGrupo.get(grupo.id) || []).forEach((subgrupo) => {
          produtosDeSubgrupo(subgrupo.id).forEach((produto) => {
            if (selectedProdutos.has(produto.id)) ordenados.push(produto.id);
          });
        });
      });
    });
    // Produtos selecionados que porventura não caírem na hierarquia (segurança)
    selectedProdutos.forEach((id) => {
      if (!ordenados.includes(id)) ordenados.push(id);
    });
    return ordenados;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome) {
      toast({ title: 'Campo obrigatório', description: 'Nome da lista é obrigatório.', variant: 'destructive' });
      return;
    }

    try {
      const produtosFinais = buildOrdenados();
      const produtosMap = new Map(produtos.map((p) => [p.id, p]));
      const hierarquiaCustomizada = {
        ordem: produtosFinais.map((id) => ({
          produtoId: id,
          tipo: 'produto' as const,
          parentId: produtosMap.get(id)?.subgrupoId,
        })),
      };

      const listaData: any = {
        nome,
        produtos: produtosFinais,
        hierarquia_customizada: hierarquiaCustomizada,
      };

      if (editingLista) {
        const { error } = (await supabase.from('listas' as any).update(listaData).eq('id', editingLista.id)) as any;
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Lista atualizada com sucesso!' });
      } else {
        const { error } = (await supabase.from('listas' as any).insert([listaData])) as any;
        if (error) throw error;
        toast({ title: 'Sucesso', description: 'Lista cadastrada com sucesso!' });
      }

      await refetch();
      setShowForm(false);
      setEditingLista(null);
      resetForm();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar lista', variant: 'destructive' });
    }
  };

  const handleNova = () => {
    setEditingLista(null);
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (lista: Lista) => {
    setEditingLista(lista);
    setNome(lista.nome);
    setSelectedProdutos(new Set(lista.produtos || []));
    setProductSearchTerm('');
    setExpandedDepartamentos(new Set());
    setExpandedGrupos(new Set());
    setExpandedSubgrupos(new Set());
    setShowForm(true);
  };

  const handleDuplicate = async (lista: Lista) => {
    try {
      const novaLista = {
        nome: `${lista.nome} (Cópia)`,
        produtos: lista.produtos,
        hierarquia_customizada: (lista as any).hierarquiaCustomizada || (lista as any).hierarquia_customizada || null,
      };
      const { error } = (await supabase.from('listas' as any).insert([novaLista])) as any;
      if (error) throw error;
      await refetch();
      toast({ title: 'Lista duplicada', description: 'Uma cópia da lista foi criada.' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao duplicar lista', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteLista) return;
    try {
      const { error } = (await supabase.from('listas' as any).delete().eq('id', deleteLista.id)) as any;
      if (error) throw error;
      await refetch();
      setDeleteLista(null);
      toast({ title: 'Lista excluída', description: 'A lista foi removida do sistema.' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao excluir lista', variant: 'destructive' });
    }
  };

  const filteredListas = listas
    .filter((l) => l.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const dateA = new Date((a as any).created_at || 0).getTime();
      const dateB = new Date((b as any).created_at || 0).getTime();
      return dateB - dateA;
    });

  // ---- Hierarquia para a árvore (com filtro por busca) ----
  const searchLower = productSearchTerm.toLowerCase().trim();
  const buildTree = () => {
    return departamentos
      .map((dept) => {
        const deptMatches = !searchLower || dept.nome.toLowerCase().includes(searchLower);
        const gruposData = (gruposPorDept.get(dept.id) || [])
          .map((grupo) => {
            const grupoMatches = !searchLower || grupo.nome.toLowerCase().includes(searchLower);
            const subgruposData = (subgruposPorGrupo.get(grupo.id) || [])
              .map((subgrupo) => {
                const subgrupoMatches = !searchLower || subgrupo.nome.toLowerCase().includes(searchLower);
                const prods = produtosDeSubgrupo(subgrupo.id).filter((p) => {
                  if (!searchLower) return true;
                  if (deptMatches || grupoMatches || subgrupoMatches) return true;
                  return (
                    p.nome.toLowerCase().includes(searchLower) || p.codigo.toLowerCase().includes(searchLower)
                  );
                });
                return { subgrupo, prods };
              })
              .filter((sg) => sg.prods.length > 0);
            return { grupo, subgrupos: subgruposData };
          })
          .filter((g) => g.subgrupos.length > 0);
        return { dept, grupos: gruposData };
      })
      .filter((d) => d.grupos.length > 0);
  };
  const tree = buildTree();

  const isExpanded = (set: Set<string>, id: string) => (searchLower ? true : set.has(id));
  const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExportarPDF = (lista: Lista) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(lista.nome, pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });

    const produtosMap = new Map(produtos.map((p) => [p.id, p]));
    const ordenados: Array<{ codigo: string; nome: string; quantidade: string; unidade: string }> = [];
    const hierarquia = (lista as any).hierarquiaCustomizada as any;
    const ordem = hierarquia?.ordem;
    const vistos = new Set<string>();

    const push = (id: string) => {
      const p = produtosMap.get(id);
      if (p && !vistos.has(id)) {
        vistos.add(id);
        ordenados.push({ codigo: p.codigo, nome: p.nome, quantidade: p.quantidade || '', unidade: p.unidadeMedida });
      }
    };

    if (Array.isArray(ordem) && ordem.length > 0) {
      ordem.filter((it: any) => it?.tipo === 'produto' && it.produtoId).forEach((it: any) => push(it.produtoId));
    }
    (lista.produtos || []).forEach(push);

    const tableData = ordenados.map((p, i) => [(i + 1).toString(), p.codigo, p.nome, p.quantidade, p.unidade]);

    autoTable(doc, {
      startY: 35,
      head: [['#', 'Código', 'Produto', 'Quantidade', 'Unidade']],
      body: tableData,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
      },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 35;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de produtos: ${ordenados.length}`, 14, finalY + 10);
    doc.save(`Lista_${lista.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    toast({ title: 'PDF exportado', description: `Lista "${lista.nome}" foi exportada com sucesso.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Listas de Coleta</h2>
          <p className="text-muted-foreground text-sm">Selecione quais produtos farão parte de cada lista</p>
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={handleNova}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Lista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLista ? 'Editar' : 'Nova'} Lista de Coleta</DialogTitle>
              <DialogDescription>Marque os produtos que farão parte desta lista</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Lista *</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da lista" required />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Visualização do Pesquisador</Label>
                  <span className="text-xs text-muted-foreground">{selectedProdutos.size} produto(s) selecionado(s)</span>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos, departamentos, grupos ou subgrupos..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="border rounded-md h-[500px] p-4">
                  <div className="space-y-2">
                    {tree.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">Nenhum produto encontrado</div>
                    ) : (
                      tree.map(({ dept, grupos: gruposData }) => {
                        const deptExpanded = isExpanded(expandedDepartamentos, dept.id);
                        const deptState = getStateFor(produtosDeDept(dept.id));
                        return (
                          <div key={dept.id} className="space-y-2">
                            <div className="flex items-center gap-2 py-1">
                              <button
                                type="button"
                                onClick={() => toggle(setExpandedDepartamentos, dept.id)}
                                className="p-0 hover:bg-muted rounded"
                              >
                                {deptExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                              </button>
                              <TriCheckbox state={deptState} onToggle={() => toggleProdutos(produtosDeDept(dept.id))} />
                              <span className="font-semibold text-base cursor-pointer" onClick={() => toggleProdutos(produtosDeDept(dept.id))}>
                                {dept.nome}
                              </span>
                            </div>

                            {deptExpanded &&
                              gruposData.map(({ grupo, subgrupos: subgruposData }) => {
                                const grupoExpanded = isExpanded(expandedGrupos, grupo.id);
                                const grupoState = getStateFor(produtosDeGrupo(grupo.id));
                                return (
                                  <div key={grupo.id} className="ml-6 space-y-2">
                                    <div className="flex items-center gap-2 py-1">
                                      <button
                                        type="button"
                                        onClick={() => toggle(setExpandedGrupos, grupo.id)}
                                        className="p-0 hover:bg-muted rounded"
                                      >
                                        {grupoExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        )}
                                      </button>
                                      <TriCheckbox state={grupoState} onToggle={() => toggleProdutos(produtosDeGrupo(grupo.id))} />
                                      <span className="font-medium cursor-pointer" onClick={() => toggleProdutos(produtosDeGrupo(grupo.id))}>
                                        {grupo.nome}
                                      </span>
                                    </div>

                                    {grupoExpanded &&
                                      subgruposData.map(({ subgrupo, prods }) => {
                                        const subgrupoExpanded = isExpanded(expandedSubgrupos, subgrupo.id);
                                        const subgrupoState = getStateFor(produtosDeSubgrupo(subgrupo.id));
                                        return (
                                          <div key={subgrupo.id} className="ml-6 space-y-1">
                                            <div className="flex items-center gap-2 py-1">
                                              <button
                                                type="button"
                                                onClick={() => toggle(setExpandedSubgrupos, subgrupo.id)}
                                                className="p-0 hover:bg-muted rounded"
                                              >
                                                {subgrupoExpanded ? (
                                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                ) : (
                                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                )}
                                              </button>
                                              <TriCheckbox
                                                state={subgrupoState}
                                                onToggle={() => toggleProdutos(produtosDeSubgrupo(subgrupo.id))}
                                              />
                                              <span
                                                className="text-sm font-medium cursor-pointer"
                                                onClick={() => toggleProdutos(produtosDeSubgrupo(subgrupo.id))}
                                              >
                                                {subgrupo.nome}
                                                <span className="text-xs text-muted-foreground ml-2">
                                                  ({produtosDeSubgrupo(subgrupo.id).length} produtos)
                                                </span>
                                              </span>
                                            </div>

                                            {subgrupoExpanded && (
                                              <div className="ml-6 space-y-1">
                                                {prods.map((produto) => (
                                                  <div key={produto.id} className="flex items-center gap-2 py-1">
                                                    <TriCheckbox
                                                      state={selectedProdutos.has(produto.id)}
                                                      onToggle={() => toggleProdutos([produto])}
                                                    />
                                                    <span
                                                      className="text-sm cursor-pointer flex-1"
                                                      onClick={() => toggleProdutos([produto])}
                                                    >
                                                      <span>{produto.nome}</span>
                                                      <span className="text-muted-foreground ml-2 text-xs">
                                                        ({produto.codigo} - {produto.unidadeMedida})
                                                      </span>
                                                    </span>
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
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingLista ? 'Salvar Alterações' : 'Criar Lista'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar listas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : filteredListas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma lista cadastrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredListas.map((lista) => (
            <Card key={lista.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <List className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{lista.nome}</p>
                    <p className="text-sm text-muted-foreground">{lista.produtos.length} produtos</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" title="Exportar PDF" onClick={() => handleExportarPDF(lista)}>
                    <FileDown className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" title="Duplicar" onClick={() => handleDuplicate(lista)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" title="Editar" onClick={() => handleEdit(lista)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" title="Excluir" onClick={() => setDeleteLista(lista)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteLista} onOpenChange={(open) => !open && setDeleteLista(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lista</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a lista "{deleteLista?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
