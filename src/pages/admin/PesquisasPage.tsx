import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Coleta, Supermercado, Pesquisador } from '@/types';
import { Plus, Search, Calendar, Store, User, FileText, Package, Bell } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const PesquisasPage = () => {
  // Mock data
  const [coletas, setColetas] = useState<Coleta[]>([
    {
      id: '1',
      data: '2024-01-20',
      supermercadoId: '1',
      pesquisadorId: '1',
      numero: '001',
      grupo: 'A',
      ano: '2024',
      status: 'finalizada',
      produtos: ['1', '2', '3']
    },
    {
      id: '2',
      data: '2024-01-18',
      supermercadoId: '2',
      pesquisadorId: '2',
      numero: '002',
      grupo: 'A',
      ano: '2024',
      status: 'iniciada',
      produtos: ['1', '4', '5']
    },
    {
      id: '3',
      data: '2024-01-15',
      supermercadoId: '1',
      pesquisadorId: '2',
      numero: '003',
      grupo: 'A',
      ano: '2024',
      status: 'finalizada',
      produtos: ['1', '2', '3'],
      observacoesFinais: [
        {
          id: '1',
          texto: 'Produto 1 estava em promoção',
          dataHora: '2024-01-15T10:30:00-03:00'
        }
      ],
      adminVisualizouObservacoes: false
    }
  ]);

  const mockSupermercados: Supermercado[] = [
    { id: '1', nome: 'Extra Hiper', endereco: 'Av. Paulista, 1000 - São Paulo, SP' },
    { id: '2', nome: 'Pão de Açúcar', endereco: 'Rua Augusta, 2500 - São Paulo, SP' },
    { id: '3', nome: 'Carrefour', endereco: 'Rua da Consolação, 3000 - São Paulo, SP' }
  ];

  const mockPesquisadores: Pesquisador[] = [
    { id: '1', codigo: 'PES001', nome: 'Maria Silva', email: 'maria@sistema.com', telefone: '(11) 99999-1111', ativo: true, login: 'maria.silva', senha: '123456' },
    { id: '2', codigo: 'PES002', nome: 'João Santos', email: 'joao@sistema.com', telefone: '(11) 99999-2222', ativo: true, login: 'joao.santos', senha: '123456' },
    { id: '3', codigo: 'PES003', nome: 'Ana Costa', email: 'ana@sistema.com', telefone: '(11) 99999-3333', ativo: false, login: 'ana.costa', senha: '123456' }
  ];

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
    supermercadoId: '',
    pesquisadorId: '',
    ano: new Date().getFullYear().toString()
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supermercadoId || !formData.pesquisadorId) {
      toast({
        title: "Campos obrigatórios",
        description: "Supermercado e pesquisador são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    // Produtos padrão fixos para demonstração
    const produtosPadrao = ['1', '2', '3'];

    // Gerar número automaticamente baseado no total de coletas + 1
    const proximoNumero = String(coletas.length + 1).padStart(3, '0');

    const novaColeta: Coleta = {
      id: Date.now().toString(),
      data: formData.data,
      supermercadoId: formData.supermercadoId,
      pesquisadorId: formData.pesquisadorId,
      numero: proximoNumero,
      ano: formData.ano,
      status: 'não iniciada',
      produtos: produtosPadrao
    };

    setColetas(prev => [novaColeta, ...prev]);
    
    toast({
      title: "Sucesso",
      description: "Coleta cadastrada com sucesso!"
    });

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      data: new Date().toISOString().split('T')[0],
      supermercadoId: '',
      pesquisadorId: '',
      ano: new Date().getFullYear().toString()
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getSupermercadoNome = (id: string) => {
    return mockSupermercados.find(s => s.id === id)?.nome || 'N/A';
  };

  const getPesquisadorNome = (id: string) => {
    return mockPesquisadores.find(p => p.id === id)?.nome || 'N/A';
  };

  // Ordenar coletas por data (mais recente primeiro)
  const coletasOrdenadas = [...coletas].sort((a, b) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  const getStatusColor = (status: Coleta['status']) => {
    switch (status) {
      case 'não iniciada':
        return 'bg-destructive text-destructive-foreground';
      case 'iniciada':
        return 'bg-yellow-500 text-white';
      case 'finalizada':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Coletas</h2>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Coleta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Coleta</DialogTitle>
              <DialogDescription>
                Cadastre uma nova coleta de preços
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Formato: DD/MM/AAAA, GMT -03:00 (Horário de Brasília)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supermercado">Supermercado Pesquisado *</Label>
                <Select 
                  value={formData.supermercadoId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supermercadoId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o supermercado" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockSupermercados.map((supermercado) => (
                      <SelectItem key={supermercado.id} value={supermercado.id}>
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4" />
                          {supermercado.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pesquisador">Pesquisador *</Label>
                <Select 
                  value={formData.pesquisadorId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, pesquisadorId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o pesquisador" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockPesquisadores.filter(p => p.ativo).map((pesquisador) => (
                      <SelectItem key={pesquisador.id} value={pesquisador.id}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {pesquisador.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <Label htmlFor="ano">Ano</Label>
                <Input
                  id="ano"
                  value={formData.ano}
                  onChange={(e) => setFormData(prev => ({ ...prev, ano: e.target.value }))}
                  placeholder="2024"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Cadastrar Coleta
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Coletas */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Coletas Realizadas
            </CardTitle>
            <CardDescription>
              Ordenadas cronologicamente (mais recentes primeiro)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {coletasOrdenadas.map((coleta) => (
                <div 
                  key={coleta.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(coleta.data)}</span>
                      </div>
                      
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(coleta.status)}`}>
                        {coleta.status.charAt(0).toUpperCase() + coleta.status.slice(1)}
                      </span>
                      
                      {coleta.numero && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Nº:</span>
                          <span className="text-sm font-medium">{coleta.numero}</span>
                        </div>
                      )}
                      
                      {coleta.ano && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Ano:</span>
                          <span className="text-sm font-medium">{coleta.ano}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        <span><strong>Supermercado:</strong> {getSupermercadoNome(coleta.supermercadoId)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span><strong>Pesquisador:</strong> {getPesquisadorNome(coleta.pesquisadorId)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span><strong>Produtos:</strong> {coleta.produtos.length} itens</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 sm:mt-0">
                    <Button variant="outline" size="sm">
                      <Search className="w-4 h-4 mr-1" />
                      Visualizar
                    </Button>
                    {/* Notification Bell for Post-completion Observations */}
                    {coleta.observacoesFinais && 
                     coleta.observacoesFinais.length > 0 && 
                     !coleta.adminVisualizouObservacoes && (
                      <div className="relative">
                        <Bell className="w-4 h-4 text-yellow-500" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                          {coleta.observacoesFinais.length}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {coletasOrdenadas.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma coleta encontrada</h3>
                  <p className="text-muted-foreground">
                    Cadastre a primeira coleta clicando no botão "Nova Coleta"
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};