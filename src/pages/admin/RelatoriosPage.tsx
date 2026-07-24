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
import {
  generatePDF,
  generateTXT,
  generateProdutosNaoEncontradosPDF,
  generateProdutosNaoEncontradosTXT,
  generateComparativoConcorrenciaPDF,
  generateComparativoConcorrenciaTXT,
  generateComparativoPorDepartamentoPDF,
  generateComparativoPorDepartamentoTXT,
  generateEstatisticasPDF,
  generateEstatisticasTXT,
  generateComparadoresPDF,
  generateComparadoresTXT,
  generateGuiaPrecosPorCompradorPDF,
  generateGuiaPrecosPorCompradorTXT,
} from '@/lib/reportGenerator';
import { supabase } from '@/integrations/supabase/client';

const formatDate = (dateString: string) => {
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

type ReportType =
  | 'guia'
  | 'guia_comprador'
  | 'estatisticas'
  | 'nao_encontrados'
  | 'comp_geral'
  | 'comp_comprador'
  | 'comp_departamento'
  | 'todos';
type ReportFormat = 'pdf' | 'txt';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

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

  const [showRelatorioDialog, setShowRelatorioDialog] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [dataRelatorio, setDataRelatorio] = useState(new Date().toISOString().split('T')[0]);
  const [coletasSelecionadas, setColetasSelecionadas] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Exportação unificada
  const [exportRelatorio, setExportRelatorio] = useState<Relatorio | null>(null);
  const [exportType, setExportType] = useState<ReportType>('guia');
  const [exportFormat, setExportFormat] = useState<ReportFormat>('pdf');
  const [exportSupermercadoRef, setExportSupermercadoRef] = useState('');
  const [exportPercentual, setExportPercentual] = useState('');
  const [exportando, setExportando] = useState(false);

  const [relatorioDetalhe, setRelatorioDetalhe] = useState<Relatorio | null>(null);

  const coletasFinalizadas = useMemo(
    () => coletas.filter(c => c.status === 'finalizada'),
    [coletas]
  );

  const isLoading = loadingProdutos || loadingGrupos || loadingSubgrupos || loadingDepartamentos ||
                    loadingSupermercados || loadingListas || loadingClientes || loadingRelatorios || loadingColetas;

  const resetRelatorioForm = useCallback(() => {
    setClienteSelecionado('');
    setDataRelatorio(new Date().toISOString().split('T')[0]);
    setColetasSelecionadas([]);
    setShowRelatorioDialog(false);
  }, []);

  const handleCreateRelatorio = useCallback(async () => {
    if (!clienteSelecionado) {
      toast({ title: "Campo obrigatório", description: "Selecione um cliente.", variant: "destructive" });
      return;
    }
    if (coletasSelecionadas.length === 0) {
      toast({ title: "Nenhuma coleta selecionada", description: "Selecione pelo menos uma coleta.", variant: "destructive" });
      return;
    }
    const cliente = clientes.find(c => c.id === clienteSelecionado);
    if (!cliente) return;

    let produtosLista: string[] = [];
    let hierarquiaNomes: any = {};
    const guia = cliente.guiaPrecos;
    if (guia && guia.produtos && guia.produtos.length > 0) {
      const ordem = guia.hierarquiaCustomizada?.ordem || [];
      const seen = new Set<string>();
      ordem.forEach(item => {
        if (item.tipo === 'produto' && guia.produtos.includes(item.id) && !seen.has(item.id)) {
          produtosLista.push(item.id); seen.add(item.id);
        }
      });
      guia.produtos.forEach(id => { if (!seen.has(id)) { produtosLista.push(id); seen.add(id); } });
      hierarquiaNomes = guia.hierarquiaCustomizada?.nomes || {};
    } else {
      produtosLista = ordemProdutos.length > 0 ? ordemProdutos : produtos.map(p => p.id);
    }

    const nomeRelatorioFinal = `${cliente.nome} - ${formatDate(dataRelatorio)}`;
    const { error } = await createRelatorio(
      nomeRelatorioFinal, cliente.nome, dataRelatorio, produtosLista, coletasSelecionadas, undefined, hierarquiaNomes
    );
    if (error) toast({ title: "Erro", description: error, variant: "destructive" });
    else { toast({ title: "Sucesso", description: "Guia de preços criado com sucesso!" }); resetRelatorioForm(); }
  }, [clienteSelecionado, clientes, coletasSelecionadas, dataRelatorio, createRelatorio, ordemProdutos, produtos, resetRelatorioForm]);

  const openExportDialog = useCallback((rel: Relatorio) => {
    setExportRelatorio(rel);
    setExportType('guia');
    setExportFormat('pdf');
    setExportSupermercadoRef('');
    setExportPercentual('');
  }, []);

  const buildBase = useCallback((rel: Relatorio) => {
    const produtosRelatorio = rel.produtos
      .map(id => produtos.find(p => p.id === id))
      .filter((p): p is typeof produtos[0] => !!p);
    const coletasRelatorio = coletas.filter(c => rel.coletas.includes(c.id));
    return {
      nome: rel.nome,
      nomeCliente: rel.nome_cliente,
      data: rel.data,
      produtos: produtosRelatorio,
      coletas: coletasRelatorio,
      supermercados,
      grupos,
      subgrupos,
      departamentos,
      hierarquiaCustomizada: rel.hierarquiaCustomizada,
    };
  }, [produtos, coletas, supermercados, grupos, subgrupos, departamentos]);

  const fetchCompradores = useCallback(async (nomeCliente: string) => {
    const { data: clienteData } = await supabase
      .from('clientes' as any).select('id').eq('nome', nomeCliente).maybeSingle() as any;
    if (!clienteData?.id) return [];
    const { data: comps } = await supabase
      .from('compradores' as any).select('*').eq('cliente_id', clienteData.id).order('nome') as any;
    return (comps || []).map((c: any) => ({ nome: c.nome, produtos: c.produtos as string[] }));
  }, []);

  // Executa a exportação para um tipo específico. Retorna true se gerou algo.
  const runExport = useCallback(async (rel: Relatorio, type: ReportType, fmt: ReportFormat, supermercadoRefId: string, perc: string): Promise<boolean> => {
    const base = buildBase(rel);
    switch (type) {
      case 'guia':
        if (fmt === 'pdf') generatePDF(base); else generateTXT(base);
        return true;
      case 'nao_encontrados':
        if (fmt === 'pdf') generateProdutosNaoEncontradosPDF(base); else generateProdutosNaoEncontradosTXT(base);
        return true;
      case 'estatisticas': {
        const p = parseFloat(perc);
        if (isNaN(p) || p < 0) { toast({ title: 'Estatísticas ignoradas', description: 'Informe um percentual válido para Estatísticas.' }); return false; }
        if (fmt === 'pdf') generateEstatisticasPDF(base, p); else generateEstatisticasTXT(base, p);
        return true;
      }
      case 'comp_geral':
        if (!supermercadoRefId) { toast({ title: 'Comparativo Geral ignorado', description: 'Selecione o supermercado de referência.' }); return false; }
        if (fmt === 'pdf') generateComparativoConcorrenciaPDF(base, supermercadoRefId); else generateComparativoConcorrenciaTXT(base, supermercadoRefId);
        return true;
      case 'comp_departamento':
        if (!supermercadoRefId) { toast({ title: 'Comparativo por Departamento ignorado', description: 'Selecione o supermercado de referência.' }); return false; }
        if (fmt === 'pdf') generateComparativoPorDepartamentoPDF(base, supermercadoRefId); else generateComparativoPorDepartamentoTXT(base, supermercadoRefId);
        return true;
      case 'comp_comprador': {
        if (!supermercadoRefId) { toast({ title: 'Comparativo por Comprador ignorado', description: 'Selecione o supermercado de referência.' }); return false; }
        const comps = await fetchCompradores(rel.nome_cliente);
        if (comps.length === 0) { toast({ title: 'Comparativo por Comprador ignorado', description: 'Cliente sem compradores cadastrados.' }); return false; }
        if (fmt === 'pdf') generateComparadoresPDF(base, supermercadoRefId, comps); else generateComparadoresTXT(base, supermercadoRefId, comps);
        return true;
      }
      case 'guia_comprador': {
        const comps = await fetchCompradores(rel.nome_cliente);
        if (comps.length === 0) { toast({ title: 'Guia por Comprador ignorado', description: 'Cliente sem compradores cadastrados.' }); return false; }
        if (fmt === 'pdf') generateGuiaPrecosPorCompradorPDF(base, comps); else generateGuiaPrecosPorCompradorTXT(base, comps);
        return true;
      }
      default:
        return false;
    }
  }, [buildBase, fetchCompradores]);

  const handleExport = useCallback(async () => {
    if (!exportRelatorio) return;
    setExportando(true);
    try {
      if (exportType === 'todos') {
        const tipos: ReportType[] = ['guia', 'guia_comprador', 'estatisticas', 'nao_encontrados', 'comp_geral', 'comp_comprador', 'comp_departamento'];
        let gerados = 0;
        for (const t of tipos) {
          const ok = await runExport(exportRelatorio, t, exportFormat, exportSupermercadoRef, exportPercentual);
          if (ok) gerados++;
          await sleep(600); // dá tempo do browser processar cada download
        }
        toast({ title: 'Exportação concluída', description: `${gerados} relatório(s) gerado(s).` });
      } else {
        const ok = await runExport(exportRelatorio, exportType, exportFormat, exportSupermercadoRef, exportPercentual);
        if (ok) toast({ title: 'Sucesso', description: 'Relatório gerado.' });
      }
      setExportRelatorio(null);
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Falha ao exportar', variant: 'destructive' });
    } finally {
      setExportando(false);
    }
  }, [exportRelatorio, exportType, exportFormat, exportSupermercadoRef, exportPercentual, runExport]);

  const precisaSupermercadoRef = exportType === 'comp_geral' || exportType === 'comp_comprador' || exportType === 'comp_departamento' || exportType === 'todos';
  const precisaPercentual = exportType === 'estatisticas' || exportType === 'todos';

  const supermercadosDoRelatorio = useMemo(() => {
    if (!exportRelatorio) return [];
    return coletas
      .filter(c => exportRelatorio.coletas.includes(c.id))
      .map(c => supermercados.find(s => s.id === c.supermercadoId))
      .filter((s): s is typeof supermercados[0] => !!s);
  }, [exportRelatorio, coletas, supermercados]);

  return (
    <div className="space-y-6">
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
              <DialogDescription>Selecione o cliente e as coletas para gerar o guia de preços</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Clientes *</Label>
                <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                  <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
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
                <p className="text-sm text-muted-foreground">Escolha o cliente que receberá o guia</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataRelatorio">Data *</Label>
                <Input id="dataRelatorio" type="date" value={dataRelatorio} onChange={(e) => setDataRelatorio(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Coletas Consideradas *</Label>
                <div className="border rounded-md p-4 space-y-2 max-h-[200px] overflow-y-auto">
                  {coletasFinalizadas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma coleta finalizada disponível</p>
                  ) : (
                    coletasFinalizadas.map(coleta => {
                      const supermercado = supermercados.find(s => s.id === coleta.supermercadoId);
                      return (
                        <div key={coleta.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={coletasSelecionadas.includes(coleta.id)}
                            onCheckedChange={() => {
                              if (coletasSelecionadas.includes(coleta.id))
                                setColetasSelecionadas(coletasSelecionadas.filter(id => id !== coleta.id));
                              else setColetasSelecionadas([...coletasSelecionadas, coleta.id]);
                            }}
                          />
                          <span className="text-sm">{formatDate(coleta.data)} - {supermercado?.nome || 'N/A'}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetRelatorioForm}>Cancelar</Button>
                <Button onClick={handleCreateRelatorio}>Criar Guia de Preços</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

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
              <p className="text-muted-foreground">Crie um relatório para começar</p>
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
                    <span className="text-sm text-muted-foreground shrink-0">{formatDate(rel.data)}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" onClick={() => openExportDialog(rel)}>
                      <FileDown className="w-4 h-4 mr-1" />
                      Exportar
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

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (deletingId) { deleteRelatorio(deletingId); setDeletingId(null); toast({ title: "Sucesso", description: "Relatório excluído!" }); }
            }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog unificado de exportação */}
      <Dialog open={!!exportRelatorio} onOpenChange={(o) => !o && setExportRelatorio(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exportar Relatório</DialogTitle>
            <DialogDescription>Escolha o tipo de relatório e o formato de saída.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de relatório</Label>
              <RadioGroup value={exportType} onValueChange={(v) => setExportType(v as ReportType)} className="gap-2">
                {[
                  { v: 'guia', l: 'Guia de Preços' },
                  { v: 'guia_comprador', l: 'Guia de Preços por Comprador' },
                  { v: 'estatisticas', l: 'Estatísticas' },
                  { v: 'nao_encontrados', l: 'Não Encontrados' },
                  { v: 'comp_geral', l: 'Comparativo — Geral' },
                  { v: 'comp_comprador', l: 'Comparativo — Por Comprador' },
                  { v: 'comp_departamento', l: 'Comparativo — Por Departamento' },
                  { v: 'todos', l: 'Todos (baixa cada relatório em sequência)' },
                ].map(o => (
                  <label key={o.v} htmlFor={`rt-${o.v}`} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-muted/50">
                    <RadioGroupItem value={o.v} id={`rt-${o.v}`} />
                    <span className="text-sm">{o.l}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Formato</Label>
              <RadioGroup value={exportFormat} onValueChange={(v) => setExportFormat(v as ReportFormat)} className="flex gap-4">
                <label htmlFor="fmt-pdf" className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="pdf" id="fmt-pdf" /> PDF
                </label>
                <label htmlFor="fmt-txt" className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="txt" id="fmt-txt" /> TXT
                </label>
              </RadioGroup>
            </div>

            {precisaSupermercadoRef && (
              <div className="space-y-2">
                <Label>Supermercado de Referência{exportType === 'todos' ? ' (para Comparativos)' : ' *'}</Label>
                <Select value={exportSupermercadoRef} onValueChange={setExportSupermercadoRef}>
                  <SelectTrigger><SelectValue placeholder="Selecione um supermercado" /></SelectTrigger>
                  <SelectContent>
                    {supermercadosDoRelatorio.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {precisaPercentual && (
              <div className="space-y-2">
                <Label htmlFor="perc-min">Percentual mínimo{exportType === 'todos' ? ' (para Estatísticas)' : ' *'}</Label>
                <Input
                  id="perc-min"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="Ex: 10"
                  value={exportPercentual}
                  onChange={(e) => setExportPercentual(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExportRelatorio(null)} disabled={exportando}>Cancelar</Button>
              <Button
                onClick={handleExport}
                disabled={
                  exportando ||
                  (exportType !== 'todos' && precisaSupermercadoRef && !exportSupermercadoRef) ||
                  (exportType !== 'todos' && precisaPercentual && !exportPercentual)
                }
              >
                <FileDown className="w-4 h-4 mr-2" />
                {exportando ? 'Gerando...' : `Exportar ${exportFormat.toUpperCase()}`}
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
            const listaCorrespondente = listas.find(l => {
              if (!l.produtos || !relatorioDetalhe.produtos) return false;
              if (l.produtos.length !== relatorioDetalhe.produtos.length) return false;
              return l.produtos.every((p: string) => relatorioDetalhe.produtos.includes(p));
            });
            const coletasDoRelatorio = coletas.filter(c => relatorioDetalhe.coletas.includes(c.id));

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-xs">Nome</Label><p className="font-medium">{relatorioDetalhe.nome}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Cliente</Label><p className="font-medium">{relatorioDetalhe.nome_cliente}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Data</Label><p className="font-medium">{formatDate(relatorioDetalhe.data)}</p></div>
                  <div><Label className="text-muted-foreground text-xs">Produtos</Label><p className="font-medium">{relatorioDetalhe.produtos.length} produtos</p></div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Lista Utilizada</Label>
                  <p className="font-medium">{listaCorrespondente ? listaCorrespondente.nome : 'Lista não identificada (pode ter sido alterada ou excluída)'}</p>
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
