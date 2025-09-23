import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart3, 
  Calendar as CalendarIcon, 
  Download, 
  Filter,
  TrendingUp,
  Store,
  Package,
  Users,
  FileSpreadsheet,
  Eye
} from 'lucide-react';

export const RelatoriosPage = () => {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedSupermercado, setSelectedSupermercado] = useState<string>('');
  const [selectedProduto, setSelectedProduto] = useState<string>('');
  const [selectedPesquisador, setSelectedPesquisador] = useState<string>('');

  // Mock data para os filtros
  const mockSupermercados = [
    { id: '1', nome: 'Extra Hiper' },
    { id: '2', nome: 'Pão de Açúcar' },
    { id: '3', nome: 'Carrefour' },
    { id: '4', nome: 'Walmart' }
  ];

  const mockProdutos = [
    { id: '1', nome: 'Arroz Branco 5kg' },
    { id: '2', nome: 'Feijão Preto 1kg' },
    { id: '3', nome: 'Óleo de Soja 900ml' },
    { id: '4', nome: 'Açúcar Cristal 1kg' }
  ];

  const mockPesquisadores = [
    { id: '1', nome: 'Maria Silva' },
    { id: '2', nome: 'João Santos' },
    { id: '3', nome: 'Ana Costa' }
  ];

  const tiposRelatorio = [
    {
      id: 'comparativo-precos',
      title: 'Comparativo de Preços',
      description: 'Compare preços entre supermercados por produto ou período',
      icon: BarChart3,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      id: 'evolucao-precos',
      title: 'Evolução de Preços',
      description: 'Acompanhe a variação de preços ao longo do tempo',
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100'
    },
    {
      id: 'pesquisas-periodo',
      title: 'Pesquisas por Período',
      description: 'Relatório de pesquisas realizadas em um período específico',
      icon: CalendarIcon,
      color: 'text-purple-600 bg-purple-100'
    },
    {
      id: 'supermercados-ranking',
      title: 'Ranking de Supermercados',
      description: 'Ranking dos supermercados com melhores preços',
      icon: Store,
      color: 'text-orange-600 bg-orange-100'
    },
    {
      id: 'produtos-mais-pesquisados',
      title: 'Produtos Mais Pesquisados',
      description: 'Lista dos produtos com maior número de pesquisas',
      icon: Package,
      color: 'text-red-600 bg-red-100'
    },
    {
      id: 'performance-pesquisadores',
      title: 'Performance dos Pesquisadores',
      description: 'Relatório de produtividade dos pesquisadores',
      icon: Users,
      color: 'text-indigo-600 bg-indigo-100'
    }
  ];

  const handleGenerateReport = (tipoRelatorio: string) => {
    // Simular geração de relatório
    console.log('Gerando relatório:', tipoRelatorio, {
      dateFrom,
      dateTo,
      supermercado: selectedSupermercado,
      produto: selectedProduto,
      pesquisador: selectedPesquisador
    });
    
    // Aqui você implementaria a lógica real de geração do relatório
  };

  const handleExportReport = (tipo: 'pdf' | 'excel', relatorio: string) => {
    // Simular exportação
    console.log(`Exportando relatório ${relatorio} em formato ${tipo}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-bold">Relatórios</h2>
          <p className="text-muted-foreground">
            Gere relatórios analíticos sobre preços, pesquisas e performance
          </p>
        </div>
      </div>

      {/* Filtros Globais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros Gerais
          </CardTitle>
          <CardDescription>
            Configure os filtros que serão aplicados a todos os relatórios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Data Início */}
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "P", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Fim */}
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "P", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Supermercado */}
            <div className="space-y-2">
              <Label>Supermercado</Label>
              <Select value={selectedSupermercado} onValueChange={setSelectedSupermercado}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os supermercados</SelectItem>
                  {mockSupermercados.map((supermercado) => (
                    <SelectItem key={supermercado.id} value={supermercado.id}>
                      {supermercado.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Produto */}
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os produtos</SelectItem>
                  {mockProdutos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pesquisador */}
            <div className="space-y-2">
              <Label>Pesquisador</Label>
              <Select value={selectedPesquisador} onValueChange={setSelectedPesquisador}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os pesquisadores</SelectItem>
                  {mockPesquisadores.map((pesquisador) => (
                    <SelectItem key={pesquisador.id} value={pesquisador.id}>
                      {pesquisador.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button 
              variant="outline"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
                setSelectedSupermercado('');
                setSelectedProduto('');
                setSelectedPesquisador('');
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tipos de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiposRelatorio.map((relatorio) => {
          const IconComponent = relatorio.icon;
          return (
            <Card key={relatorio.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${relatorio.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  {relatorio.title}
                </CardTitle>
                <CardDescription>
                  {relatorio.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={() => handleGenerateReport(relatorio.id)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Visualizar
                  </Button>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        <Download className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-2">
                      <div className="space-y-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleExportReport('pdf', relatorio.id)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleExportReport('excel', relatorio.id)}
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Excel
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Relatórios Recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Gerados Recentemente</CardTitle>
          <CardDescription>
            Histórico dos últimos relatórios gerados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { nome: 'Comparativo de Preços - Janeiro 2024', data: '2024-01-20', tipo: 'PDF' },
              { nome: 'Evolução de Preços - Arroz', data: '2024-01-18', tipo: 'Excel' },
              { nome: 'Ranking Supermercados - Dezembro', data: '2024-01-15', tipo: 'PDF' }
            ].map((relatorio, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{relatorio.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    Gerado em {new Date(relatorio.data).toLocaleDateString('pt-BR')} • {relatorio.tipo}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Baixar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};