import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, FileText, Copy, Edit, Trash2, FileDown, Calendar } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useProdutos } from '@/hooks/useProdutos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useSupermercados } from '@/hooks/useSupermercados';
import { useRelatoriosPadrao, RelatorioPadrao } from '@/hooks/useRelatoriosPadrao';
import { useRelatorios, Relatorio } from '@/hooks/useRelatorios';
import { generatePDF, generateTXT } from '@/lib/reportGenerator';
import { Produto, Coleta } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, ChevronDown } from 'lucide-react';

export const RelatoriosPage = () => {
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();
  const { supermercados } = useSupermercados();
  const { relatoriosPadrao, createRelatorioPadrao, updateRelatorioPadrao, deleteRelatorioPadrao } = useRelatoriosPadrao();
  const { relatorios, createRelatorio, deleteRelatorio } = useRelatorios();

  // Estados para relatório padrão
  const [showRelatorioPadraoDialog, setShowRelatorioPadraoDialog] = useState(false);
  const [editingRelatorioPadrao, setEditingRelatorioPadrao] = useState<RelatorioPadrao | null>(null);
  const [nomeRelatorioPadrao, setNomeRelatorioPadrao] = useState('');
  const [produtosSelecionadosPadrao, setProdutosSelecionadosPadrao] = useState<string[]>([]);
  const [showConfirmSelectAll, setShowConfirmSelectAll] = useState(false);
  const [pendingSelectAllAction, setPendingSelectAllAction] = useState<'select' | 'deselect' | null>(null);

  // Estados para relatório
  const [showRelatorioDialog, setShowRelatorioDialog] = useState(false);
  const [tipoRelatorio, setTipoRelatorio] = useState<'padrao' | 'manual'>('padrao');
  const [relatorioPadraoSelecionado, setRelatorioPadraoSelecionado] = useState('');
  const [nomeRelatorio, setNomeRelatorio] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [dataRelatorio, setDataRelatorio] = useState(new Date().toISOString().split('T')[0]);
  const [produtosSelecionadosRelatorio, setProdutosSelecionadosRelatorio] = useState<string[]>([]);
  const [coletasSelecionadas, setColetasSelecionadas] = useState<string[]>([]);

  // Mock de coletas para o exemplo
  const mockColetas: Coleta[] = [];

  // Estados de controle
  const [expandedSubgrupos, setExpandedSubgrupos] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Funções auxiliares para seleção hierárquica
  const getProdutosByGrupo = (grupoId: string) => {
    return produtos.filter(p => p.grupoId === grupoId);
  };

  const getProdutosBySubgrupo = (subgrupoId: string) => {
    return produtos.filter(p => p.subgrupoId === subgrupoId);
  };

  const isGrupoSelected = (grupoId: string, selectedProducts: string[]) => {
    const produtosGrupo = getProdutosByGrupo(grupoId);
    return produtosGrupo.length > 0 && produtosGrupo.every(p => selectedProducts.includes(p.id));
  };

  const isSubgrupoSelected = (subgrupoId: string, selectedProducts: string[]) => {
    const produtosSubgrupo = getProdutosBySubgrupo(subgrupoId);
    return produtosSubgrupo.length > 0 && produtosSubgrupo.every(p => selectedProducts.includes(p.id));
  };

  const toggleGrupo = (grupoId: string, currentSelected: string[], setter: (value: string[]) => void) => {
    const produtosGrupo = getProdutosByGrupo(grupoId);
    const produtoIds = produtosGrupo.map(p => p.id);
    
    if (isGrupoSelected(grupoId, currentSelected)) {
      setter(currentSelected.filter(id => !produtoIds.includes(id)));
    } else {
      setter([...new Set([...currentSelected, ...produtoIds])]);
    }
  };

  const toggleSubgrupo = (subgrupoId: string, currentSelected: string[], setter: (value: string[]) => void) => {
    const produtosSubgrupo = getProdutosBySubgrupo(subgrupoId);
    const produtoIds = produtosSubgrupo.map(p => p.id);
    
    if (isSubgrupoSelected(subgrupoId, currentSelected)) {
      setter(currentSelected.filter(id => !produtoIds.includes(id)));
    } else {
      setter([...new Set([...currentSelected, ...produtoIds])]);
    }
  };

  const toggleProduto = (produtoId: string, currentSelected: string[], setter: (value: string[]) => void) => {
    if (currentSelected.includes(produtoId)) {
      setter(currentSelected.filter(id => id !== produtoId));
    } else {
      setter([...currentSelected, produtoId]);
    }
  };

  const handleSelectAllProdutos = (select: boolean, currentSelected: string[], setter: (value: string[]) => void) => {
    setPendingSelectAllAction(select ? 'select' : 'deselect');
    
    if (currentSelected.length > 0) {
      setShowConfirmSelectAll(true);
    } else {
      executeSelectAll(select, setter);
    }
  };

  const executeSelectAll = (select: boolean, setter: (value: string[]) => void) => {
    if (select) {
      setter(produtos.map(p => p.id));
    } else {
      setter([]);
    }
    setShowConfirmSelectAll(false);
  };

  // Handlers para relatório padrão
  const handleCreateRelatorioPadrao = async () => {
    if (!nomeRelatorioPadrao.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome do relatório é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    if (produtosSelecionadosPadrao.length === 0) {
      toast({
        title: "Nenhum produto selecionado",
        description: "Selecione pelo menos um produto.",
        variant: "destructive"
      });
      return;
    }

    const { error } = editingRelatorioPadrao
      ? await updateRelatorioPadrao(editingRelatorioPadrao.id, nomeRelatorioPadrao, produtosSelecionadosPadrao)
      : await createRelatorioPadrao(nomeRelatorioPadrao, produtosSelecionadosPadrao);

    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso",
        description: editingRelatorioPadrao ? "Relatório padrão atualizado!" : "Relatório padrão criado!"
      });
      resetRelatorioPadraoForm();
    }
  };

  const handleDeleteRelatorioPadrao = async (id: string) => {
    const { error } = await deleteRelatorioPadrao(id);
    
    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Relatório padrão excluído!"
      });
    }
    setDeletingId(null);
  };

  const handleDuplicateRelatorioPadrao = (relatorioPadrao: RelatorioPadrao) => {
    setNomeRelatorioPadrao(`${relatorioPadrao.nome} (cópia)`);
    setProdutosSelecionadosPadrao(relatorioPadrao.produtos);
    setEditingRelatorioPadrao(null);
    setShowRelatorioPadraoDialog(true);
  };

  const handleEditRelatorioPadrao = (relatorioPadrao: RelatorioPadrao) => {
    setNomeRelatorioPadrao(relatorioPadrao.nome);
    setProdutosSelecionadosPadrao(relatorioPadrao.produtos);
    setEditingRelatorioPadrao(relatorioPadrao);
    setShowRelatorioPadraoDialog(true);
  };

  const resetRelatorioPadraoForm = () => {
    setNomeRelatorioPadrao('');
    setProdutosSelecionadosPadrao([]);
    setEditingRelatorioPadrao(null);
    setShowRelatorioPadraoDialog(false);
  };

  // Handlers para relatório
  const handleCreateRelatorio = async () => {
    if (!nomeCliente.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "O nome do cliente é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    if (coletasSelecionadas.length === 0) {
      toast({
        title: "Nenhuma coleta selecionada",
        description: "Selecione pelo menos uma coleta.",
        variant: "destructive"
      });
      return;
    }

    let produtosFinais: string[];
    let nomeRelatorioFinal: string;

    if (tipoRelatorio === 'padrao') {
      if (!relatorioPadraoSelecionado) {
        toast({
          title: "Relatório padrão não selecionado",
          description: "Selecione um relatório padrão.",
          variant: "destructive"
        });
        return;
      }
      const padrao = relatoriosPadrao.find(rp => rp.id === relatorioPadraoSelecionado);
      produtosFinais = padrao?.produtos || [];
      nomeRelatorioFinal = `${nomeCliente} - ${new Date(dataRelatorio).toLocaleDateString('pt-BR')}`;
    } else {
      if (!nomeRelatorio.trim()) {
        toast({
          title: "Campo obrigatório",
          description: "O nome do relatório é obrigatório.",
          variant: "destructive"
        });
        return;
      }
      if (produtosSelecionadosRelatorio.length === 0) {
        toast({
          title: "Nenhum produto selecionado",
          description: "Selecione pelo menos um produto.",
          variant: "destructive"
        });
        return;
      }
      produtosFinais = produtosSelecionadosRelatorio;
      nomeRelatorioFinal = nomeRelatorio;
    }

    const { error } = await createRelatorio(
      nomeRelatorioFinal,
      nomeCliente,
      dataRelatorio,
      produtosFinais,
      coletasSelecionadas,
      tipoRelatorio === 'padrao' ? relatorioPadraoSelecionado : undefined
    );

    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Relatório criado com sucesso!"
      });
      resetRelatorioForm();
    }
  };

  const resetRelatorioForm = () => {
    setNomeRelatorio('');
    setNomeCliente('');
    setDataRelatorio(new Date().toISOString().split('T')[0]);
    setProdutosSelecionadosRelatorio([]);
    setColetasSelecionadas([]);
    setRelatorioPadraoSelecionado('');
    setShowRelatorioDialog(false);
    setTipoRelatorio('padrao');
  };

  const handleExportPDF = (relatorio: Relatorio) => {
    const produtosRelatorio = produtos.filter(p => relatorio.produtos.includes(p.id));
    const coletasRelatorio = mockColetas.filter(c => relatorio.coletas.includes(c.id));

    generatePDF({
      nome: relatorio.nome,
      nomeCliente: relatorio.nome_cliente,
      data: relatorio.data,
      produtos: produtosRelatorio,
      coletas: coletasRelatorio,
      supermercados,
      grupos,
      subgrupos
    });
  };

  const handleExportTXT = (relatorio: Relatorio) => {
    const produtosRelatorio = produtos.filter(p => relatorio.produtos.includes(p.id));
    const coletasRelatorio = mockColetas.filter(c => relatorio.coletas.includes(c.id));

    generateTXT({
      nome: relatorio.nome,
      nomeCliente: relatorio.nome_cliente,
      data: relatorio.data,
      produtos: produtosRelatorio,
      coletas: coletasRelatorio,
      supermercados,
      grupos,
      subgrupos
    });
  };

  // Agrupar produtos por grupo e subgrupo
  const buildGroupedHierarchy = () => {
    const hierarchy = new Map<string, Map<string, Produto[]>>();
    
    produtos.forEach(produto => {
      if (!hierarchy.has(produto.grupoId)) {
        hierarchy.set(produto.grupoId, new Map());
      }
      const grupoMap = hierarchy.get(produto.grupoId)!;
      if (!grupoMap.has(produto.subgrupoId)) {
        grupoMap.set(produto.subgrupoId, []);
      }
      grupoMap.get(produto.subgrupoId)!.push(produto);
    });
    
    return hierarchy;
  };

  const hierarchy = buildGroupedHierarchy();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Relatórios</h2>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showRelatorioPadraoDialog} onOpenChange={setShowRelatorioPadraoDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => resetRelatorioPadraoForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Relatório Padrão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRelatorioPadrao ? 'Editar Relatório Padrão' : 'Novo Relatório Padrão'}
                </DialogTitle>
                <DialogDescription>
                  Configure um template de relatório com produtos predefinidos
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Relatório Padrão *</Label>
                  <Input
                    id="nome"
                    value={nomeRelatorioPadrao}
                    onChange={(e) => setNomeRelatorioPadrao(e.target.value)}
                    placeholder="Ex: Relatório Mensal Básico"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Produtos ({produtosSelecionadosPadrao.length} selecionados)</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAllProdutos(true, produtosSelecionadosPadrao, setProdutosSelecionadosPadrao)}
                      >
                        Selecionar Todos
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectAllProdutos(false, produtosSelecionadosPadrao, setProdutosSelecionadosPadrao)}
                      >
                        Limpar Seleção
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-md max-h-[400px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Grupo</TableHead>
                          <TableHead>Subgrupo</TableHead>
                          <TableHead>Produto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.from(hierarchy.entries()).map(([grupoId, subgruposMap]) => {
                          const grupo = grupos.find(g => g.id === grupoId);
                          if (!grupo) return null;

                          return Array.from(subgruposMap.entries()).map(([subgrupoId, produtosSubgrupo], subgrupoIndex) => {
                            const subgrupo = subgrupos.find(s => s.id === subgrupoId);
                            if (!subgrupo) return null;

                            const isExpanded = expandedSubgrupos.has(subgrupoId);

                            return (
                              <>
                                <TableRow key={`${grupoId}-${subgrupoId}`} className="bg-muted/50">
                                  <TableCell>
                                    <Checkbox
                                      checked={isGrupoSelected(grupoId, produtosSelecionadosPadrao) && subgrupoIndex === 0}
                                      onCheckedChange={() => toggleGrupo(grupoId, produtosSelecionadosPadrao, setProdutosSelecionadosPadrao)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{subgrupoIndex === 0 ? grupo.nome : ''}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={isSubgrupoSelected(subgrupoId, produtosSelecionadosPadrao)}
                                        onCheckedChange={() => toggleSubgrupo(subgrupoId, produtosSelecionadosPadrao, setProdutosSelecionadosPadrao)}
                                      />
                                      <button
                                        type="button"
                                        className="flex items-center gap-1 hover:text-primary"
                                        onClick={() => {
                                          const newExpanded = new Set(expandedSubgrupos);
                                          if (isExpanded) {
                                            newExpanded.delete(subgrupoId);
                                          } else {
                                            newExpanded.add(subgrupoId);
                                          }
                                          setExpandedSubgrupos(newExpanded);
                                        }}
                                      >
                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                        <span className="font-medium">{subgrupo.nome}</span>
                                        <span className="text-sm text-muted-foreground">({produtosSubgrupo.length})</span>
                                      </button>
                                    </div>
                                  </TableCell>
                                  <TableCell></TableCell>
                                </TableRow>

                                {isExpanded && produtosSubgrupo.map(produto => (
                                  <TableRow key={produto.id}>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={produtosSelecionadosPadrao.includes(produto.id)}
                                          onCheckedChange={() => toggleProduto(produto.id, produtosSelecionadosPadrao, setProdutosSelecionadosPadrao)}
                                        />
                                        <span>{produto.nome}</span>
                                        <span className="text-sm text-muted-foreground">({produto.quantidade || produto.unidadeMedida})</span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </>
                            );
                          });
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetRelatorioPadraoForm}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateRelatorioPadrao}>
                    {editingRelatorioPadrao ? 'Atualizar' : 'Criar'} Relatório Padrão
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showRelatorioDialog} onOpenChange={setShowRelatorioDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => resetRelatorioForm()}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Relatório
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Relatório</DialogTitle>
                <DialogDescription>
                  Crie um relatório baseado em um template ou manualmente
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Relatório</Label>
                  <Select value={tipoRelatorio} onValueChange={(value: 'padrao' | 'manual') => setTipoRelatorio(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="padrao">Com base em Relatório Padrão</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tipoRelatorio === 'padrao' && (
                  <div className="space-y-2">
                    <Label>Relatório Padrão *</Label>
                    <Select value={relatorioPadraoSelecionado} onValueChange={setRelatorioPadraoSelecionado}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um relatório padrão" />
                      </SelectTrigger>
                      <SelectContent>
                        {relatoriosPadrao.map(rp => (
                          <SelectItem key={rp.id} value={rp.id}>
                            {rp.nome} ({rp.produtos.length} produtos)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {tipoRelatorio === 'manual' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="nomeRelatorio">Nome do Relatório *</Label>
                      <Input
                        id="nomeRelatorio"
                        value={nomeRelatorio}
                        onChange={(e) => setNomeRelatorio(e.target.value)}
                        placeholder="Ex: Relatório Janeiro 2024"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Produtos ({produtosSelecionadosRelatorio.length} selecionados)</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAllProdutos(true, produtosSelecionadosRelatorio, setProdutosSelecionadosRelatorio)}
                          >
                            Selecionar Todos
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectAllProdutos(false, produtosSelecionadosRelatorio, setProdutosSelecionadosRelatorio)}
                          >
                            Limpar Seleção
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-md max-h-[300px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Grupo</TableHead>
                              <TableHead>Subgrupo</TableHead>
                              <TableHead>Produto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Array.from(hierarchy.entries()).map(([grupoId, subgruposMap]) => {
                              const grupo = grupos.find(g => g.id === grupoId);
                              if (!grupo) return null;

                              return Array.from(subgruposMap.entries()).map(([subgrupoId, produtosSubgrupo], subgrupoIndex) => {
                                const subgrupo = subgrupos.find(s => s.id === subgrupoId);
                                if (!subgrupo) return null;

                                const isExpanded = expandedSubgrupos.has(subgrupoId);

                                return (
                                  <>
                                    <TableRow key={`${grupoId}-${subgrupoId}`} className="bg-muted/50">
                                      <TableCell>
                                        <Checkbox
                                          checked={isGrupoSelected(grupoId, produtosSelecionadosRelatorio) && subgrupoIndex === 0}
                                          onCheckedChange={() => toggleGrupo(grupoId, produtosSelecionadosRelatorio, setProdutosSelecionadosRelatorio)}
                                        />
                                      </TableCell>
                                      <TableCell className="font-medium">{subgrupoIndex === 0 ? grupo.nome : ''}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={isSubgrupoSelected(subgrupoId, produtosSelecionadosRelatorio)}
                                            onCheckedChange={() => toggleSubgrupo(subgrupoId, produtosSelecionadosRelatorio, setProdutosSelecionadosRelatorio)}
                                          />
                                          <button
                                            type="button"
                                            className="flex items-center gap-1 hover:text-primary"
                                            onClick={() => {
                                              const newExpanded = new Set(expandedSubgrupos);
                                              if (isExpanded) {
                                                newExpanded.delete(subgrupoId);
                                              } else {
                                                newExpanded.add(subgrupoId);
                                              }
                                              setExpandedSubgrupos(newExpanded);
                                            }}
                                          >
                                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            <span className="font-medium">{subgrupo.nome}</span>
                                            <span className="text-sm text-muted-foreground">({produtosSubgrupo.length})</span>
                                          </button>
                                        </div>
                                      </TableCell>
                                      <TableCell></TableCell>
                                    </TableRow>

                                    {isExpanded && produtosSubgrupo.map(produto => (
                                      <TableRow key={produto.id}>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2">
                                            <Checkbox
                                              checked={produtosSelecionadosRelatorio.includes(produto.id)}
                                              onCheckedChange={() => toggleProduto(produto.id, produtosSelecionadosRelatorio, setProdutosSelecionadosRelatorio)}
                                            />
                                            <span>{produto.nome}</span>
                                            <span className="text-sm text-muted-foreground">({produto.quantidade || produto.unidadeMedida})</span>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </>
                                );
                              });
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="nomeCliente">Nome do Cliente *</Label>
                  <Input
                    id="nomeCliente"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Digite o nome do cliente"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataRelatorio">Data *</Label>
                  <Input
                    id="dataRelatorio"
                    type="date"
                    value={dataRelatorio}
                    onChange={(e) => setDataRelatorio(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Coletas Consideradas *</Label>
                  <div className="border rounded-md p-4 space-y-2 max-h-[200px] overflow-y-auto">
                    {mockColetas.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma coleta disponível
                      </p>
                    ) : (
                      mockColetas.map(coleta => {
                        const supermercado = supermercados.find(s => s.id === coleta.supermercadoId);
                        return (
                          <div key={coleta.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={coletasSelecionadas.includes(coleta.id)}
                              onCheckedChange={() => {
                                if (coletasSelecionadas.includes(coleta.id)) {
                                  setColetasSelecionadas(coletasSelecionadas.filter(id => id !== coleta.id));
                                } else {
                                  setColetasSelecionadas([...coletasSelecionadas, coleta.id]);
                                }
                              }}
                            />
                            <span className="text-sm">
                              {new Date(coleta.data).toLocaleDateString('pt-BR')} - {supermercado?.nome || 'N/A'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={resetRelatorioForm}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateRelatorio}>
                    Criar Relatório
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Relatórios Padrão */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Padrão</CardTitle>
          <CardDescription>Templates de relatórios com produtos predefinidos</CardDescription>
        </CardHeader>
        <CardContent>
          {relatoriosPadrao.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum relatório padrão</h3>
              <p className="text-muted-foreground">
                Crie um relatório padrão para facilitar a geração de relatórios futuros
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {relatoriosPadrao.map(rp => (
                <div key={rp.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{rp.nome}</h4>
                    <p className="text-sm text-muted-foreground">
                      {rp.produtos.length} produtos
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateRelatorioPadrao(rp)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRelatorioPadrao(rp)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(rp.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Relatórios Gerados */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Gerados</CardTitle>
          <CardDescription>Relatórios criados e prontos para exportação</CardDescription>
        </CardHeader>
        <CardContent>
          {relatorios.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum relatório gerado</h3>
              <p className="text-muted-foreground">
                Crie um relatório para começar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {relatorios.map(rel => (
                <div key={rel.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{rel.nome}</h4>
                    <p className="text-sm text-muted-foreground">
                      Cliente: {rel.nome_cliente} | Data: {new Date(rel.data).toLocaleDateString('pt-BR')} | {rel.produtos.length} produtos | {rel.coletas.length} coletas
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPDF(rel)}
                    >
                      <FileDown className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportTXT(rel)}
                    >
                      <FileDown className="w-4 h-4 mr-1" />
                      TXT
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingId(rel.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Select All Dialog */}
      <AlertDialog open={showConfirmSelectAll} onOpenChange={setShowConfirmSelectAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar ação</AlertDialogTitle>
            <AlertDialogDescription>
              Você já possui produtos selecionados manualmente. Tem certeza que deseja {pendingSelectAllAction === 'select' ? 'selecionar' : 'desmarcar'} todos os produtos? Esta ação irá sobrescrever sua seleção atual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (pendingSelectAllAction === 'select') {
                executeSelectAll(true, showRelatorioPadraoDialog ? setProdutosSelecionadosPadrao : setProdutosSelecionadosRelatorio);
              } else {
                executeSelectAll(false, showRelatorioPadraoDialog ? setProdutosSelecionadosPadrao : setProdutosSelecionadosRelatorio);
              }
            }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deletingId) {
                // Verificar se é relatório padrão ou relatório
                const isRelatorioPadrao = relatoriosPadrao.some(rp => rp.id === deletingId);
                if (isRelatorioPadrao) {
                  handleDeleteRelatorioPadrao(deletingId);
                } else {
                  deleteRelatorio(deletingId);
                  setDeletingId(null);
                }
              }
            }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
