import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, FileText, Trash2, FileDown, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useProdutos } from '@/hooks/useProdutos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useSupermercados } from '@/hooks/useSupermercados';
import { useListas } from '@/hooks/useListas';
import { useClientes } from '@/hooks/useClientes';
import { useListaColetaGeralOrdem } from '@/hooks/useListaColetaGeralOrdem';
import { useRelatorios } from '@/hooks/useRelatorios';
import type { Relatorio } from '@/hooks/useRelatorios';
import { useColetas } from '@/hooks/useColetas';
import { generatePDF, generateTXT, generateProdutosNaoEncontradosPDF, generateComparativoConcorrenciaPDF, generateComparativoPorDepartamentoPDF, generateEstatisticasPDF, generateComparadoresPDF } from '@/lib/reportGenerator';
import { supabase } from '@/integrations/supabase/client';

// Função helper para formatar datas sem problemas de timezone
const formatDate = (dateString: string) => {
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

export const RelatoriosPage = () => {
  const { produtos, loading: loadingProdutos } = useProdutos();
  const { grupos, loading: loadingGrupos } = useGrupos();
  const { subgrupos, loading: loadingSubgrupos } = useSubgrupos();
  const { departamentos, loading: loadingDepartamentos } = useDepartamentos();
  const { supermercados, loading: loadingSupermercados } = useSupermercados();
  const { listas, loading: loadingListas } = useListas();
  const { clientes, loading: loadingClientes } = useClientes();
  const { ordemProdutos } = useListaColetaGeralOrdem();
  const { relatorios, loading: loadingRelatorios, createRelatorio, deleteRelatorio } = useRelatorios();
  const { coletas, loading: loadingColetas } = useColetas();

  // Estados para relatório
  const [showRelatorioDialog, setShowRelatorioDialog] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [dataRelatorio, setDataRelatorio] = useState(new Date().toISOString().split('T')[0]);
  const [coletasSelecionadas, setColetasSelecionadas] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Estados para comparativo de concorrência
  const [showComparativoModoDialog, setShowComparativoModoDialog] = useState(false);
  const [comparativoModo, setComparativoModo] = useState<'geral' | 'comprador' | 'departamento'>('geral');
  const [showComparativoDialog, setShowComparativoDialog] = useState(false);
  const [relatorioComparativo, setRelatorioComparativo] = useState<Relatorio | null>(null);
  const [supermercadoRefSelecionado, setSupermercadoRefSelecionado] = useState('');
  const [gerandoComparativo, setGerandoComparativo] = useState(false);
  
  // Estados para estatísticas
  const [showEstatisticasDialog, setShowEstatisticasDialog] = useState(false);
  const [relatorioEstatisticas, setRelatorioEstatisticas] = useState<Relatorio | null>(null);
  const [percentualMinimo, setPercentualMinimo] = useState('');

  // Estado para modal de detalhes do relatório
  const [relatorioDetalhe, setRelatorioDetalhe] = useState<Relatorio | null>(null);
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
    if (!clienteSelecionado) {
      toast({
        title: "Campo obrigatório",
        description: "Selecione um cliente.",
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

    const cliente = clientes.find(c => c.id === clienteSelecionado);
    if (!cliente) {
      toast({
        title: "Erro",
        description: "Cliente não encontrado.",
        variant: "destructive"
      });
      return;
    }

    let produtosLista: string[] = [];
    let hierarquiaNomes: {
      departamentos?: { [id: string]: string };
      grupos?: { [id: string]: string };
      subgrupos?: { [id: string]: string };
    } = {};

    const guia = cliente.guiaPrecos;
    if (guia && guia.produtos && guia.produtos.length > 0) {
      // Cliente possui Guia de Preços Personalizado -> usa produtos, nomes e ordem do guia
      const ordem = guia.hierarquiaCustomizada?.ordem || [];
      const seen = new Set<string>();
      ordem.forEach(item => {
        if (item.tipo === 'produto' && guia.produtos.includes(item.id) && !seen.has(item.id)) {
          produtosLista.push(item.id);
          seen.add(item.id);
        }
      });
      guia.produtos.forEach(id => {
        if (!seen.has(id)) {
          produtosLista.push(id);
          seen.add(id);
        }
      });
      hierarquiaNomes = guia.hierarquiaCustomizada?.nomes || {};
    } else {
      // Sem guia -> usa a lista padrão de produtos (LISTA COLETA GERAL)
      produtosLista = ordemProdutos.length > 0 ? ordemProdutos : produtos.map(p => p.id);
    }

    const nomeRelatorioFinal = `${cliente.nome} - ${formatDate(dataRelatorio)}`;

    const { error } = await createRelatorio(
      nomeRelatorioFinal,
      cliente.nome,
      dataRelatorio,
      produtosLista,
      coletasSelecionadas,
      undefined,
      hierarquiaNomes
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
        description: "Guia de preços criado com sucesso!"
      });
      resetRelatorioForm();
    }
  }, [clienteSelecionado, clientes, coletasSelecionadas, dataRelatorio, createRelatorio, ordemProdutos, produtos]);

  const resetRelatorioForm = useCallback(() => {
    setClienteSelecionado('');
    setDataRelatorio(new Date().toISOString().split('T')[0]);
    setColetasSelecionadas([]);
    setShowRelatorioDialog(false);
  }, []);

  const handleExportPDF = useCallback((relatorio: Relatorio) => {
    const produtosRelatorio = relatorio.produtos
      .map(id => produtos.find(p => p.id === id))
      .filter((p): p is typeof produtos[0] => !!p);
    const coletasRelatorio = coletas.filter(c => relatorio.coletas.includes(c.id));

    console.log('🟢 EXPORTANDO PDF - Relatório:', relatorio);
    console.log('🟢 Produtos do relatório:', produtosRelatorio);
    console.log('🟢 Coletas do relatório:', coletasRelatorio);
    console.log('🟢 IDs coletas esperadas:', relatorio.coletas);
    console.log('🟢 Coletas completas disponíveis:', coletas);

    generatePDF({
      nome: relatorio.nome,
      nomeCliente: relatorio.nome_cliente,
      data: relatorio.data,
      produtos: produtosRelatorio,
      coletas: coletasRelatorio,
      supermercados,
      grupos,
      subgrupos,
      departamentos,
      hierarquiaCustomizada: relatorio.hierarquiaCustomizada
    });
  }, [produtos, coletas, supermercados, grupos, subgrupos, departamentos]);

  const handleExportTXT = useCallback((relatorio: Relatorio) => {
    const produtosRelatorio = relatorio.produtos
      .map(id => produtos.find(p => p.id === id))
      .filter((p): p is typeof produtos[0] => !!p);
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
    const produtosRelatorio = relatorio.produtos
      .map(id => produtos.find(p => p.id === id))
      .filter((p): p is typeof produtos[0] => !!p);
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

  const handleOpenComparativo = useCallback((relatorio: Relatorio) => {
    setRelatorioComparativo(relatorio);
    setComparativoModo('geral');
    setShowComparativoModoDialog(true);
  }, []);

  const handleConfirmComparativoModo = useCallback(() => {
    setShowComparativoModoDialog(false);
    setSupermercadoRefSelecionado('');
    setShowComparativoDialog(true);
  }, []);

  const handleOpenEstatisticas = useCallback((relatorio: Relatorio) => {
    setRelatorioEstatisticas(relatorio);
    setPercentualMinimo('');
    setShowEstatisticasDialog(true);
  }, []);

  const handleExportEstatisticas = useCallback(() => {
    if (!relatorioEstatisticas || !percentualMinimo) {
      toast({
        title: "Erro",
        description: "Informe o valor percentual mínimo",
        variant: "destructive"
      });
      return;
    }

    const percentual = parseFloat(percentualMinimo);
    if (isNaN(percentual) || percentual < 0) {
      toast({
        title: "Erro",
        description: "Por favor, insira um valor percentual válido",
        variant: "destructive"
      });
      return;
    }

    const produtosRelatorio = relatorioEstatisticas.produtos
      .map(id => produtos.find(p => p.id === id))
      .filter((p): p is typeof produtos[0] => !!p);
    const coletasRelatorio = coletas.filter(c => relatorioEstatisticas.coletas.includes(c.id));

    generateEstatisticasPDF(
      {
        nome: relatorioEstatisticas.nome,
        nomeCliente: relatorioEstatisticas.nome_cliente,
        data: relatorioEstatisticas.data,
        produtos: produtosRelatorio,
        coletas: coletasRelatorio,
        supermercados,
        grupos,
        subgrupos,
        departamentos
      },
      percentual
    );

    setShowEstatisticasDialog(false);
    toast({
      title: "Sucesso",
      description: "Relatório de estatísticas gerado com sucesso!"
    });
  }, [relatorioEstatisticas, percentualMinimo, produtos, coletas, supermercados, grupos, subgrupos, departamentos]);

  const handleExportComparativo = useCallback(async () => {
    if (!relatorioComparativo || !supermercadoRefSelecionado) {
      toast({
        title: "Erro",
        description: "Selecione um supermercado de referência",
        variant: "destructive"
      });
      return;
    }

    const produtosRelatorio = relatorioComparativo.produtos
      .map(id => produtos.find(p => p.id === id))
      .filter((p): p is typeof produtos[0] => !!p);
    const coletasRelatorio = coletas.filter(c => relatorioComparativo.coletas.includes(c.id));

    const base = {
      nome: relatorioComparativo.nome,
      nomeCliente: relatorioComparativo.nome_cliente,
      data: relatorioComparativo.data,
      produtos: produtosRelatorio,
      coletas: coletasRelatorio,
      supermercados,
      grupos,
      subgrupos,
      departamentos
    };

    setGerandoComparativo(true);
    try {
      if (comparativoModo === 'comprador') {
        const { data: compradoresData, error } = await supabase
          .from('compradores' as any)
          .select('*')
          .eq('supermercado_id', supermercadoRefSelecionado)
          .order('nome') as any;
        if (error) throw error;
        if (!compradoresData || compradoresData.length === 0) {
          toast({ title: "Erro", description: "Nenhum comprador cadastrado para este supermercado", variant: "destructive" });
          return;
        }
        generateComparadoresPDF(
          base,
          supermercadoRefSelecionado,
          compradoresData.map((c: any) => ({ nome: c.nome, produtos: c.produtos }))
        );
      } else if (comparativoModo === 'departamento') {
        generateComparativoPorDepartamentoPDF(base, supermercadoRefSelecionado);
      } else {
        generateComparativoConcorrenciaPDF(base, supermercadoRefSelecionado);
      }

      setShowComparativoDialog(false);
      toast({
        title: "Sucesso",
        description: "Relatório comparativo gerado com sucesso!"
      });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao gerar relatório", variant: "destructive" });
    } finally {
      setGerandoComparativo(false);
    }
  }, [relatorioComparativo, supermercadoRefSelecionado, comparativoModo, produtos, coletas, supermercados, grupos, subgrupos, departamentos]);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Relatórios</h2>
          <p className="text-muted-foreground">Crie relatórios com base em listas e coletas finalizadas</p>
        </div>
        
        <div className="flex gap-2">
        <Dialog open={showRelatorioDialog} onOpenChange={setShowRelatorioDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetRelatorioForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Guia de Preços
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Guia de Preços</DialogTitle>
              <DialogDescription>
                Selecione o cliente e as coletas para gerar o guia de preços
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Clientes *</Label>
                <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome}
                        {cliente.guiaPrecos && cliente.guiaPrecos.produtos.length > 0
                          ? ` (guia personalizado: ${cliente.guiaPrecos.produtos.length} produtos)`
                          : ' (lista padrão)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Escolha o cliente que receberá o guia
                </p>
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
                            {formatDate(coleta.data)} - {supermercado?.nome || 'N/A'}
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
                  Criar Guia de Preços
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
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
                <div
                  key={rel.id}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setRelatorioDetalhe(rel)}
                  title="Clique para ver detalhes"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-medium flex items-center gap-1 min-w-0 truncate">
                      <Info className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{rel.nome_cliente}</span>
                    </h4>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {formatDate(rel.data)}
                    </span>
                  </div>
                  <div
                    className="flex flex-wrap gap-2 mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="outline" size="sm" onClick={() => handleExportPDF(rel)}>
                      <FileDown className="w-4 h-4 mr-1" />
                      PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportTXT(rel)}>
                      <FileDown className="w-4 h-4 mr-1" />
                      TXT
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportProdutosNaoEncontrados(rel)} title="Produtos Não Encontrados">
                      <FileDown className="w-4 h-4 mr-1" />
                      Não Encontrados
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenComparativo(rel)} title="Comparativo da Concorrência">
                      <FileDown className="w-4 h-4 mr-1" />
                      Comparativo
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleOpenEstatisticas(rel)} title="Estatísticas">
                      <FileDown className="w-4 h-4 mr-1" />
                      Estatísticas
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeletingId(rel.id)} title="Excluir">
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

      {/* Comparativo - escolha do tipo (geral / comprador / departamento) */}
      <Dialog open={showComparativoModoDialog} onOpenChange={setShowComparativoModoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comparativo da Concorrência</DialogTitle>
            <DialogDescription>
              Escolha como o comparativo deve ser gerado.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup
            value={comparativoModo}
            onValueChange={(v) => setComparativoModo(v as 'geral' | 'comprador' | 'departamento')}
            className="gap-3 py-2"
          >
            <label htmlFor="rmodo-geral" className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="geral" id="rmodo-geral" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Geral</p>
                <p className="text-xs text-muted-foreground">Comparativo consolidado da concorrência.</p>
              </div>
            </label>
            <label htmlFor="rmodo-comprador" className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="comprador" id="rmodo-comprador" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Por Comprador</p>
                <p className="text-xs text-muted-foreground">Usa as listas dos compradores cadastrados.</p>
              </div>
            </label>
            <label htmlFor="rmodo-departamento" className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/50">
              <RadioGroupItem value="departamento" id="rmodo-departamento" className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">Por Departamento</p>
                <p className="text-xs text-muted-foreground">Mesmos cálculos, segmentados por departamento.</p>
              </div>
            </label>
          </RadioGroup>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowComparativoModoDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmComparativoModo}>Continuar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comparativo Concorrência Dialog */}
      <Dialog open={showComparativoDialog} onOpenChange={setShowComparativoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comparativo da Concorrência</DialogTitle>
            <DialogDescription>
              Selecione o supermercado de referência para gerar o relatório comparativo
            </DialogDescription>
          </DialogHeader>

          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Supermercado de Referência *</Label>
              <Select value={supermercadoRefSelecionado} onValueChange={setSupermercadoRefSelecionado}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um supermercado" />
                </SelectTrigger>
                <SelectContent>
                  {relatorioComparativo && coletas
                    .filter(c => relatorioComparativo.coletas.includes(c.id))
                    .map(coleta => {
                      const supermercado = supermercados.find(s => s.id === coleta.supermercadoId);
                      return supermercado ? (
                        <SelectItem key={supermercado.id} value={supermercado.id}>
                          {supermercado.nome}
                        </SelectItem>
                      ) : null;
                    })
                  }
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowComparativoDialog(false); setShowComparativoModoDialog(true); }} disabled={gerandoComparativo}>
                Voltar
              </Button>
              <Button onClick={handleExportComparativo} disabled={!supermercadoRefSelecionado || gerandoComparativo}>
                <FileDown className="w-4 h-4 mr-2" />
                {gerandoComparativo ? 'Gerando...' : 'Gerar PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Estatísticas Dialog */}
      <Dialog open={showEstatisticasDialog} onOpenChange={setShowEstatisticasDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar Estatísticas</DialogTitle>
            <DialogDescription>
              Informe o valor percentual mínimo para comparação de diferença de preços.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="percentual-minimo">Qual o valor percentual mínimo que você quer comparar? *</Label>
              <Input
                id="percentual-minimo"
                type="number"
                placeholder="Ex: 10"
                value={percentualMinimo}
                onChange={(e) => setPercentualMinimo(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEstatisticasDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleExportEstatisticas} disabled={!percentualMinimo}>
                <FileDown className="w-4 h-4 mr-2" />
                Gerar PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Modal de Detalhes do Relatório */}
      <Dialog open={!!relatorioDetalhe} onOpenChange={() => setRelatorioDetalhe(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Relatório</DialogTitle>
            <DialogDescription>Informações completas do relatório</DialogDescription>
          </DialogHeader>
          {relatorioDetalhe && (() => {
            // Encontrar lista correspondente comparando produtos
            const listaCorrespondente = listas.find(l => {
              if (!l.produtos || !relatorioDetalhe.produtos) return false;
              if (l.produtos.length !== relatorioDetalhe.produtos.length) return false;
              return l.produtos.every((p: string) => relatorioDetalhe.produtos.includes(p));
            });
            const coletasDoRelatorio = coletas.filter(c => relatorioDetalhe.coletas.includes(c.id));
            
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Nome</Label>
                    <p className="font-medium">{relatorioDetalhe.nome}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Cliente</Label>
                    <p className="font-medium">{relatorioDetalhe.nome_cliente}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Data</Label>
                    <p className="font-medium">{formatDate(relatorioDetalhe.data)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Produtos</Label>
                    <p className="font-medium">{relatorioDetalhe.produtos.length} produtos</p>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Lista Utilizada</Label>
                  <p className="font-medium">
                    {listaCorrespondente ? listaCorrespondente.nome : 'Lista não identificada (pode ter sido alterada ou excluída)'}
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Coletas Consideradas ({coletasDoRelatorio.length})</Label>
                  <div className="border rounded-md p-3 mt-1 space-y-1 max-h-[200px] overflow-y-auto">
                    {coletasDoRelatorio.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhuma coleta encontrada</p>
                    ) : (
                      coletasDoRelatorio.map(coleta => {
                        const supermercado = supermercados.find(s => s.id === coleta.supermercadoId);
                        return (
                          <div key={coleta.id} className="text-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            <span>{formatDate(coleta.data)} - {supermercado?.nome || 'N/A'}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Criado em</Label>
                  <p className="font-medium">{formatDate(relatorioDetalhe.created_at)}</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
