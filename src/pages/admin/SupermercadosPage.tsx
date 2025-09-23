import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Supermercado, Contato } from '@/types';
import { Plus, Search, Edit, Trash2, Phone, Mail, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const SupermercadosPage = () => {
  const [supermercados, setSupermercados] = useState<Supermercado[]>([
    {
      id: '1',
      codigo: 'SUP001',
      nome: 'Extra Hiper',
      sigla: 'EXT',
      situacao: 'Cliente',
      contatos: [
        { id: '1', nome: 'João Silva', telefone: '(11) 99999-9999', email: 'joao@extra.com' }
      ],
      dataInicioContrato: '2024-01-15'
    },
    {
      id: '2',
      codigo: 'SUP002',
      nome: 'Pão de Açúcar',
      sigla: 'PDA',
      situacao: 'Não Cliente',
      contatos: [],
      dataInicioContrato: undefined
    }
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingSupermercado, setEditingSupermercado] = useState<Supermercado | null>(null);
  const [deleteSupermercado, setDeleteSupermercado] = useState<Supermercado | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    sigla: '',
    situacao: '' as 'Cliente' | 'Não Cliente' | '',
    dataInicioContrato: '',
    contatos: [] as Contato[]
  });

  const generateCode = () => {
    const nextNum = supermercados.length + 1;
    return `SUP${nextNum.toString().padStart(3, '0')}`;
  };

  const resetForm = () => {
    setFormData({
      codigo: generateCode(),
      nome: '',
      sigla: '',
      situacao: '',
      dataInicioContrato: '',
      contatos: []
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.situacao) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e situação são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const supermercado: Supermercado = {
      id: editingSupermercado?.id || Date.now().toString(),
      codigo: formData.codigo || generateCode(),
      nome: formData.nome,
      sigla: formData.sigla,
      situacao: formData.situacao,
      contatos: formData.contatos,
      dataInicioContrato: formData.dataInicioContrato || undefined
    };

    if (editingSupermercado) {
      setSupermercados(prev => prev.map(s => s.id === editingSupermercado.id ? supermercado : s));
      toast({
        title: "Sucesso",
        description: "Supermercado atualizado com sucesso!"
      });
    } else {
      setSupermercados(prev => [...prev, supermercado]);
      toast({
        title: "Sucesso",
        description: "Supermercado cadastrado com sucesso!"
      });
    }

    setShowForm(false);
    setEditingSupermercado(null);
    resetForm();
  };

  const handleEdit = (supermercado: Supermercado) => {
    setEditingSupermercado(supermercado);
    setFormData({
      codigo: supermercado.codigo,
      nome: supermercado.nome,
      sigla: supermercado.sigla,
      situacao: supermercado.situacao,
      dataInicioContrato: supermercado.dataInicioContrato || '',
      contatos: [...supermercado.contatos]
    });
    setShowForm(true);
  };

  const handleDelete = (supermercado: Supermercado) => {
    setSupermercados(prev => prev.filter(s => s.id !== supermercado.id));
    setDeleteSupermercado(null);
    toast({
      title: "Supermercado excluído",
      description: "O supermercado foi removido do sistema."
    });
  };

  const addContato = () => {
    const newContato: Contato = {
      id: Date.now().toString(),
      nome: '',
      telefone: '',
      email: ''
    };
    setFormData(prev => ({
      ...prev,
      contatos: [...prev.contatos, newContato]
    }));
  };

  const updateContato = (index: number, field: keyof Contato, value: string) => {
    setFormData(prev => ({
      ...prev,
      contatos: prev.contatos.map((contato, i) => 
        i === index ? { ...contato, [field]: value } : contato
      )
    }));
  };

  const removeContato = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contatos: prev.contatos.filter((_, i) => i !== index)
    }));
  };

  const filteredSupermercados = supermercados
    .filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Supermercados</h2>
          <p className="text-muted-foreground">Gerencie os supermercados cadastrados no sistema</p>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Supermercado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSupermercado ? 'Editar' : 'Novo'} Supermercado
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do supermercado
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="SUP001"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sigla">Sigla</Label>
                  <Input
                    id="sigla"
                    value={formData.sigla}
                    onChange={(e) => setFormData(prev => ({ ...prev, sigla: e.target.value }))}
                    placeholder="EXT"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Supermercado *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome completo do supermercado"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="situacao">Situação *</Label>
                  <Select value={formData.situacao} onValueChange={(value: 'Cliente' | 'Não Cliente') => setFormData(prev => ({ ...prev, situacao: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a situação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cliente">Cliente</SelectItem>
                      <SelectItem value="Não Cliente">Não Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataContrato">Data de Início do Contrato</Label>
                  <Input
                    id="dataContrato"
                    type="date"
                    value={formData.dataInicioContrato}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataInicioContrato: e.target.value }))}
                  />
                </div>
              </div>

              {/* Contatos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Contatos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addContato}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Contato
                  </Button>
                </div>

                {formData.contatos.map((contato, index) => (
                  <Card key={contato.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Contato {index + 1}</h4>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeContato(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input
                            placeholder="Nome"
                            value={contato.nome}
                            onChange={(e) => updateContato(index, 'nome', e.target.value)}
                          />
                          <Input
                            placeholder="Telefone"
                            value={contato.telefone}
                            onChange={(e) => updateContato(index, 'telefone', e.target.value)}
                          />
                          <Input
                            placeholder="Email"
                            type="email"
                            value={contato.email}
                            onChange={(e) => updateContato(index, 'email', e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingSupermercado(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingSupermercado ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar supermercados..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredSupermercados.map((supermercado) => (
          <Card key={supermercado.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{supermercado.nome}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      supermercado.situacao === 'Cliente' 
                        ? 'bg-success/10 text-success' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {supermercado.situacao}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div>
                      <strong>Código:</strong> {supermercado.codigo}
                    </div>
                    {supermercado.sigla && (
                      <div>
                        <strong>Sigla:</strong> {supermercado.sigla}
                      </div>
                    )}
                    {supermercado.dataInicioContrato && (
                      <div>
                        <strong>Contrato:</strong> {new Date(supermercado.dataInicioContrato).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    <div>
                      <strong>Contatos:</strong> {supermercado.contatos.length}
                    </div>
                  </div>

                  {supermercado.contatos.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {supermercado.contatos.map((contato) => (
                        <div key={contato.id} className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {contato.nome}
                          </div>
                          {contato.telefone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contato.telefone}
                            </div>
                          )}
                          {contato.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {contato.email}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(supermercado)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteSupermercado(supermercado)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredSupermercados.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum supermercado encontrado</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteSupermercado} onOpenChange={() => setDeleteSupermercado(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o supermercado "{deleteSupermercado?.nome}"? 
              <br /><strong>Essa ação não pode ser desfeita.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteSupermercado && handleDelete(deleteSupermercado)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive-hover"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};