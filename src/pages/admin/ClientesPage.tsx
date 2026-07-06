import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Cliente, Contato, GuiaPrecos } from '@/types';
import { Plus, Search, Edit, Trash2, Phone, Mail, User, Tags } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useClientes } from '@/hooks/useClientes';
import { supabase } from '@/integrations/supabase/client';
import { GuiaPrecosEditor } from '@/components/admin/GuiaPrecosEditor';
import { HierarquiaPersonalizada } from '@/hooks/useRelatoriosPersonalizados';

// Função helper para formatar datas sem problemas de timezone
const formatDate = (dateString: string) => {
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

export const ClientesPage = () => {
  const { clientes, loading, refetch } = useClientes();

  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteCliente, setDeleteCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    situacao: '' as 'Ativo' | 'Inativo' | '',
    dataInicioContrato: '',
    contatos: [] as Contato[]
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      situacao: '',
      dataInicioContrato: '',
      contatos: []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.situacao) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e situação são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      const clienteData = {
        nome: formData.nome,
        situacao: formData.situacao,
        data_inicio_contrato: formData.dataInicioContrato || null,
        contatos: formData.contatos
      };

      if (editingCliente) {
        const { error } = await supabase
          .from('clientes' as any)
          .update(clienteData)
          .eq('id', editingCliente.id) as any;

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Cliente atualizado com sucesso!"
        });
      } else {
        const { error } = await supabase
          .from('clientes' as any)
          .insert([clienteData]) as any;

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Cliente cadastrado com sucesso!"
        });
      }

      await refetch();
      setShowForm(false);
      setEditingCliente(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar cliente",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      situacao: cliente.situacao,
      dataInicioContrato: cliente.dataInicioContrato || '',
      contatos: [...cliente.contatos]
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteCliente) {
      try {
        const { error } = await supabase
          .from('clientes' as any)
          .delete()
          .eq('id', deleteCliente.id) as any;

        if (error) throw error;

        await refetch();
        setDeleteCliente(null);
        toast({
          title: "Cliente excluído",
          description: "O cliente foi removido do sistema."
        });
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao excluir cliente",
          variant: "destructive"
        });
      }
    }
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

  const filteredClientes = clientes
    .filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Clientes</h2>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCliente ? 'Editar' : 'Novo'} Cliente
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do cliente
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Cliente *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome completo do cliente"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="situacao">Situação *</Label>
                  <Select value={formData.situacao} onValueChange={(value: 'Ativo' | 'Inativo') => setFormData(prev => ({ ...prev, situacao: value }))}>
                    <SelectTrigger id="situacao">
                      <SelectValue placeholder="Selecione a situação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
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
                    setEditingCliente(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCliente ? 'Atualizar' : 'Cadastrar'}
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
          placeholder="Buscar clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredClientes.map((cliente) => (
          <Card
            key={cliente.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleEdit(cliente)}
          >
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-lg truncate">{cliente.nome}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteCliente(cliente);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCliente} onOpenChange={() => setDeleteCliente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{deleteCliente?.nome}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};