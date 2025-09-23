import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pesquisa, Supermercado, Pesquisador } from '@/types';
import { Plus, Search, Calendar, Store, User, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const PesquisasPage = () => {
  // Mock data
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([
    {
      id: '1',
      data: '2024-01-20',
      supermercadoId: '1',
      pesquisadorId: '1',
      numero: '001',
      grupo: 'A',
      ano: '2024'
    },
    {
      id: '2',
      data: '2024-01-18',
      supermercadoId: '2',
      pesquisadorId: '2',
      numero: '002',
      grupo: 'A',
      ano: '2024'
    }
  ]);

  const mockSupermercados: Supermercado[] = [
    { id: '1', codigo: 'SUP001', nome: 'Extra Hiper', sigla: 'EXT', situacao: 'Cliente', contatos: [] },
    { id: '2', codigo: 'SUP002', nome: 'Pão de Açúcar', sigla: 'PDA', situacao: 'Cliente', contatos: [] },
    { id: '3', codigo: 'SUP003', nome: 'Carrefour', sigla: 'CAR', situacao: 'Não Cliente', contatos: [] }
  ];

  const mockPesquisadores: Pesquisador[] = [
    { id: '1', codigo: 'PES001', nome: 'Maria Silva', email: 'maria@sistema.com', telefone: '(11) 99999-1111', ativo: true },
    { id: '2', codigo: 'PES002', nome: 'João Santos', email: 'joao@sistema.com', telefone: '(11) 99999-2222', ativo: true },
    { id: '3', codigo: 'PES003', nome: 'Ana Costa', email: 'ana@sistema.com', telefone: '(11) 99999-3333', ativo: false }
  ];

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0], // Data atual no formato YYYY-MM-DD
    supermercadoId: '',
    pesquisadorId: '',
    numero: '',
    grupo: '',
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

    const novaPesquisa: Pesquisa = {
      id: Date.now().toString(),
      data: formData.data,
      supermercadoId: formData.supermercadoId,
      pesquisadorId: formData.pesquisadorId,
      numero: formData.numero,
      grupo: formData.grupo,
      ano: formData.ano
    };

    setPesquisas(prev => [novaPesquisa, ...prev]);
    
    toast({
      title: "Sucesso",
      description: "Pesquisa cadastrada com sucesso!"
    });

    setShowForm(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      data: new Date().toISOString().split('T')[0],
      supermercadoId: '',
      pesquisadorId: '',
      numero: '',
      grupo: '',
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

  // Ordenar pesquisas por data (mais recente primeiro)
  const pesquisasOrdenadas = [...pesquisas].sort((a, b) => 
    new Date(b.data).getTime() - new Date(a.data).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Pesquisas</h2>
          <p className="text-muted-foreground">Gerencie as pesquisas de preços realizadas</p>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Pesquisa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Pesquisa</DialogTitle>
              <DialogDescription>
                Cadastre uma nova pesquisa de preços
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
                          <span className="text-xs text-muted-foreground">
                            ({supermercado.codigo})
                          </span>
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
                          <span className="text-xs text-muted-foreground">
                            ({pesquisador.codigo})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => setFormData(prev => ({ ...prev, numero: e.target.value }))}
                    placeholder="001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grupo">Grupo</Label>
                  <Input
                    id="grupo"
                    value={formData.grupo}
                    onChange={(e) => setFormData(prev => ({ ...prev, grupo: e.target.value }))}
                    placeholder="A"
                  />
                </div>
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
                  Cadastrar Pesquisa
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Pesquisas */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Pesquisas Realizadas
            </CardTitle>
            <CardDescription>
              Ordenadas cronologicamente (mais recentes primeiro)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pesquisasOrdenadas.map((pesquisa) => (
                <div 
                  key={pesquisa.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(pesquisa.data)}</span>
                      </div>
                      
                      {pesquisa.numero && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Nº:</span>
                          <span className="text-sm font-medium">{pesquisa.numero}</span>
                        </div>
                      )}
                      
                      {pesquisa.grupo && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Grupo:</span>
                          <span className="text-sm font-medium">{pesquisa.grupo}</span>
                        </div>
                      )}
                      
                      {pesquisa.ano && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Ano:</span>
                          <span className="text-sm font-medium">{pesquisa.ano}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        <span><strong>Supermercado:</strong> {getSupermercadoNome(pesquisa.supermercadoId)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span><strong>Pesquisador:</strong> {getPesquisadorNome(pesquisa.pesquisadorId)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 sm:mt-0">
                    <Button variant="outline" size="sm">
                      <Search className="w-4 h-4 mr-1" />
                      Visualizar
                    </Button>
                  </div>
                </div>
              ))}
              
              {pesquisasOrdenadas.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma pesquisa encontrada</h3>
                  <p className="text-muted-foreground">
                    Cadastre a primeira pesquisa clicando no botão "Nova Pesquisa"
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