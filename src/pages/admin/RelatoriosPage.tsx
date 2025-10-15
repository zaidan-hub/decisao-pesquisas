import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileText, Trash2, FileDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useProdutos } from '@/hooks/useProdutos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useSupermercados } from '@/hooks/useSupermercados';
import { useListas } from '@/hooks/useListas';
import { useRelatorios } from '@/hooks/useRelatorios';
import type { Relatorio } from '@/hooks/useRelatorios';
import { useColetas } from '@/hooks/useColetas';
import { generatePDF, generateTXT, generateProdutosNaoEncontradosPDF } from '@/lib/reportGenerator';

export const RelatoriosPage = () => {
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { grupos, loading: loadingGrupos } = useGrupos();
  const { subgrupos, loading: loadingSubgrupos } = useSubgrupos();
  const { departamentos, loading: loadingDepartamentos } = useDepartamentos();
  const { supermercados, loading: loadingSupermercados } = useSupermercados();
  const { listas, loading: loadingListas } = useListas();
  const { relatorios, loading: loadingRelatorios, createRelatorio, deleteRelatorio } = useRelatorios();
  const { coletas, loading: loadingColetas } = useColetas();

  // Estados para relatório
  const [showRelatorioDialog, setShowRelatorioDialog] = useState(false);
  const [listaSelecionada, setListaSelecionada] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [dataRelatorio, setDataRelatorio] = useState(new Date().toISOString().split('T')[0]);
  const [coletasSelecionadas, setColetasSelecionadas] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filtrar apenas coletas finalizadas para os relatórios (otimizado com useMemo)
  const coletasFinalizadas = useMemo(
    () => coletas.filter(c => c.status === 'finalizada'),
    [coletas]
  );

  // Loading geral
  const isLoading = loadingProdutos || loadingGrupos || loadingSubgrupos || loadingDepartamentos ||
                    loadingSupermercados || loadingListas || loadingRelatorios || loadingColetas;

  // Handlers para relatório (otimizados com useCallback)
  const handleCreateRelatorio = useCallback(async () => {
    if (!listaSelecionada) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione uma lista.",
        variant: "destructive"
      });
      return;
    }

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

    const lista = listas.find(l => l.id === listaSelecionada);
    const produtosLista = lista?.produtos || [];
    const nomeRelatorioFinal = `${nomeCliente} - ${new Date(dataRelatorio).toLocaleDateString('pt-BR')}`;

    const { error } = await createRelatorio(
      nomeRelatorioFinal,
      nomeCliente,
      dataRelatorio,
      produtosLista,
      coletasSelecionadas,
      undefined
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
  }, [listaSelecionada, nomeCliente, coletasSelecionadas, listas, dataRelatorio, createRelatorio]);

  const resetRelatorioForm = useCallback(() => {
    setListaSelecionada('');
    setNomeCliente('');
    setDataRelatorio(new Date().toISOString().split('T')[0]);
    setColetasSelecionadas([]);
    setShowRelatorioDialog(false);
  }, []);

  const handleExportPDF = useCallback((relatorio: Relatorio) => {
    const produtosRelatorio = produtos.filter(p => relatorio.produtos.includes(p.id));
    const coletasRelatorio = coletas.filter(c => relatorio.coletas.includes(c.id));

    generatePDF({
      nome: relatorio.nome,
      nomeCliente: relatorio.nome_cliente,
      data: relatorio.data,
      produtos: produtosRelatorio,
      coletas: coletasRelatorio,
      supermercados,
      grupos,
      subgrupos,
      departamentos
    });
  }, [produtos, coletas, supermercados, grupos, subgrupos, departamentos]);

  const handleExportTXT = useCallback((relatorio: Relatorio) => {
    const produtosRelatorio = produtos.filter(p => relatorio.produtos.includes(p.id));
    const coletasRelatorio = coletas.filter(c => relatorio.coletas.includes(c.id));

    generateTXT({
      nome: relatorio.nome,
      nomeCliente: relatorio.nome_cliente,
      data: relatorio.data,
      produtos: produtosRelatorio,
      coletas: coletasRelatorio,
      supermercados,
      grupos,
      subgrupos,
      departamentos
    });
  }, [produtos, coletas, supermercados, grupos, subgrupos, departamentos]);

  const handleExportProdutosNaoEncontrados = useCallback((relatorio: Relatorio) => {
    const produtosRelatorio = produtos.filter(p => relatorio.produtos.includes(p.id));
    const coletasRelatorio = coletas.filter(c => relatorio.coletas.includes(c.id));

    generateProdutosNaoEncontradosPDF({
      nome: relatorio.nome,
      nomeCliente: relatorio.nome_cliente,
      data: relatorio.data,
      produtos: produtosRelatorio,
      coletas: coletasRelatorio,
      supermercados,
      grupos,
      subgrupos,
      departamentos
    });
  }, [produtos, coletas, supermercados, grupos, subgrupos, departamentos]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Relatórios</h2>
          <p className="text-muted-foreground">Crie relatórios com base em listas e coletas finalizadas</p>
        </div>
        
        <Dialog open={showRelatorioDialog} onOpenChange={setShowRelatorioDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetRelatorioForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Relatório
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Relatório</DialogTitle>
              <DialogDescription>
                Selecione uma lista e as coletas para gerar o relatório
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Lista *</Label>
                <Select value={listaSelecionada} onValueChange={setListaSelecionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma lista" />
                  </SelectTrigger>
                  <SelectContent>
                    {listas.map(lista => (
                      <SelectItem key={lista.id} value={lista.id}>
                        {lista.nome} ({lista.produtos.length} produtos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                  {coletasFinalizadas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma coleta finalizada disponível
                    </p>
                  ) : (
                    coletasFinalizadas.map(coleta => {
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

      {/* Relatórios Gerados */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Gerados</CardTitle>
          <CardDescription>Relatórios criados e prontos para exportação</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRelatorios ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : relatorios.length === 0 ? (
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
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportProdutosNaoEncontrados(rel)}
                      title="Produtos Não Encontrados"
                    >
                      <FileDown className="w-4 h-4 mr-1" />
                      Não Encontrados
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deletingId) {
                deleteRelatorio(deletingId);
                setDeletingId(null);
                toast({
                  title: "Sucesso",
                  description: "Relatório excluído!"
                });
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
