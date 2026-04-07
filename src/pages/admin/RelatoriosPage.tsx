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
import { Plus, FileText, Trash2, FileDown, Info } from 'lucide-react';
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
import { generatePDF, generateTXT, generateProdutosNaoEncontradosPDF, generateComparativoConcorrenciaPDF, generateEstatisticasPDF, generateComparadoresPDF } from '@/lib/reportGenerator';
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
  const { relatorios, loading: loadingRelatorios, createRelatorio, deleteRelatorio } = useRelatorios();
  const { coletas, loading: loadingColetas } = useColetas();

  // Estados para relatório
  const [showRelatorioDialog, setShowRelatorioDialog] = useState(false);
  const [listaSelecionada, setListaSelecionada] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [dataRelatorio, setDataRelatorio] = useState(new Date().toISOString().split('T')[0]);
  const [coletasSelecionadas, setColetasSelecionadas] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Estados para comparativo de concorrência
  const [showComparativoDialog, setShowComparativoDialog] = useState(false);
  const [relatorioComparativo, setRelatorioComparativo] = useState<Relatorio | null>(null);
  const [supermercadoRefSelecionado, setSupermercadoRefSelecionado] = useState('');
  
  // Estados para estatísticas
  const [showEstatisticasDialog, setShowEstatisticasDialog] = useState(false);
  const [relatorioEstatisticas, setRelatorioEstatisticas] = useState<Relatorio | null>(null);
  const [percentualMinimo, setPercentualMinimo] = useState('');

  // Estados para compradores
  const [showCompradoresDialog, setShowCompradoresDialog] = useState(false);
  const [relatorioCompradores, setRelatorioCompradores] = useState<Relatorio | null>(null);
  const [supermercadoRefCompradores, setSupermercadoRefCompradores] = useState('');
  const [loadingCompradores, setLoadingCompradores] = useState(false);

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
    const nomeRelatorioFinal = `${nomeCliente} - ${formatDate(dataRelatorio)}`;

    const { error } = await createRelatorio(
      nomeRelatorioFinal,
      nomeCliente,
      dataRelatorio,
      produtosLista,
      coletasSelecionadas,
      undefined,
      lista?.hierarquiaCustomizada // Passar hierarquia customizada da lista
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

  const handleOpenComparativo = useCallback((relatorio: Relatorio) => {
    setRelatorioComparativo(relatorio);
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

    const produtosRelatorio = produtos.filter(p => relatorioEstatisticas.produtos.includes(p.id));
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

  const handleExportComparativo = useCallback(() => {
    if (!relatorioComparativo || !supermercadoRefSelecionado) {
      toast({
        title: "Erro",
        description: "Selecione um supermercado de referência",
        variant: "destructive"
      });
      return;
    }

    const produtosRelatorio = produtos.filter(p => relatorioComparativo.produtos.includes(p.id));
    const coletasRelatorio = coletas.filter(c => relatorioComparativo.coletas.includes(c.id));

    generateComparativoConcorrenciaPDF(
      {
        nome: relatorioComparativo.nome,
        nomeCliente: relatorioComparativo.nome_cliente,
        data: relatorioComparativo.data,
        produtos: produtosRelatorio,
        coletas: coletasRelatorio,
        supermercados,
        grupos,
        subgrupos,
        departamentos
      },
      supermercadoRefSelecionado
    );

    setShowComparativoDialog(false);
    toast({
      title: "Sucesso",
      description: "Relatório comparativo gerado com sucesso!"
    });
  }, [relatorioComparativo, supermercadoRefSelecionado, produtos, coletas, supermercados, grupos, subgrupos, departamentos]);

  const handleOpenCompradores = useCallback((relatorio: Relatorio) => {
    setRelatorioCompradores(relatorio);
    setSupermercadoRefCompradores('');
    setShowCompradoresDialog(true);
  }, []);

  const handleExportCompradores = useCallback(async () => {
    if (!relatorioCompradores || !supermercadoRefCompradores) {
      toast({ title: "Erro", description: "Selecione um supermercado de referência", variant: "destructive" });
      return;
    }

    setLoadingCompradores(true);
    try {
      // Fetch compradores for selected supermarket
      const { data: compradoresData, error } = await supabase
        .from('compradores' as any)
        .select('*')
        .eq('supermercado_id', supermercadoRefCompradores)
        .order('nome') as any;

      if (error) throw error;

      if (!compradoresData || compradoresData.length === 0) {
        toast({ title: "Erro", description: "Nenhum comprador cadastrado para este supermercado", variant: "destructive" });
        return;
      }

      const produtosRelatorio = produtos.filter(p => relatorioCompradores.produtos.includes(p.id));
      const coletasRelatorio = coletas.filter(c => relatorioCompradores.coletas.includes(c.id));

      generateComparadoresPDF(
        {
          nome: relatorioCompradores.nome,
          nomeCliente: relatorioCompradores.nome_cliente,
          data: relatorioCompradores.data,
          produtos: produtosRelatorio,
          coletas: coletasRelatorio,
          supermercados,
          grupos,
          subgrupos,
          departamentos
        },
        supermercadoRefCompradores,
        compradoresData.map((c: any) => ({ nome: c.nome, produtos: c.produtos }))
      );

      setShowCompradoresDialog(false);
      toast({ title: "Sucesso", description: "Relatório de compradores gerado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao gerar relatório", variant: "destructive" });
    } finally {
      setLoadingCompradores(false);
    }
  }, [relatorioCompradores, supermercadoRefCompradores, produtos, coletas, supermercados, grupos, subgrupos, departamentos]);

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
                  <div 
                    className="cursor-pointer hover:opacity-70 transition-opacity"
                    onClick={() => setRelatorioDetalhe(rel)}
                    title="Clique para ver detalhes"
                  >
                    <h4 className="font-medium flex items-center gap-1">
                      <Info className="w-4 h-4 text-muted-foreground" />
                      {rel.nome}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Cliente: {rel.nome_cliente} | Data: {formatDate(rel.data)} | {rel.produtos.length} produtos | {rel.coletas.length} coletas
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
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenComparativo(rel)}
                      title="Comparativo da Concorrência"
                    >
                      <FileDown className="w-4 h-4 mr-1" />
                      Comparativo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEstatisticas(rel)}
                      title="Estatísticas"
                    >
                      <FileDown className="w-4 h-4 mr-1" />
                      Estatísticas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCompradores(rel)}
                      title="Comparativo por Compradores"
                    >
                      <FileDown className="w-4 h-4 mr-1" />
                      Compradores
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
              <Button variant="outline" onClick={() => setShowComparativoDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleExportComparativo}>
                <FileDown className="w-4 h-4 mr-2" />
                Gerar PDF
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

      {/* Compradores Dialog */}
      <Dialog open={showCompradoresDialog} onOpenChange={setShowCompradoresDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comparativo por Compradores</DialogTitle>
            <DialogDescription>
              Selecione o supermercado de referência. O sistema usará as listas dos compradores cadastrados para gerar o comparativo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Supermercado de Referência *</Label>
              <Select value={supermercadoRefCompradores} onValueChange={setSupermercadoRefCompradores}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um supermercado" />
                </SelectTrigger>
                <SelectContent>
                  {relatorioCompradores && coletas
                    .filter(c => relatorioCompradores.coletas.includes(c.id))
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
              <Button variant="outline" onClick={() => setShowCompradoresDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleExportCompradores} disabled={!supermercadoRefCompradores || loadingCompradores}>
                <FileDown className="w-4 h-4 mr-2" />
                {loadingCompradores ? 'Gerando...' : 'Gerar PDF'}
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
