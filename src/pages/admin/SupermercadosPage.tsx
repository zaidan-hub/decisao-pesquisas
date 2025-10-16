import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Supermercado } from '@/types';
import { Plus, Search, Edit, Trash2, MapPin } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSupermercados } from '@/hooks/useSupermercados';
import { supabase } from '@/integrations/supabase/client';

export const SupermercadosPage = () => {
  const { supermercados, loading, refetch } = useSupermercados();

  const [showForm, setShowForm] = useState(false);
  const [editingSupermercado, setEditingSupermercado] = useState<Supermercado | null>(null);
  const [deleteSupermercado, setDeleteSupermercado] = useState<Supermercado | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    abreviacao: ''
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      endereco: '',
      abreviacao: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.endereco) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e endereço são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingSupermercado) {
        const { error } = await supabase
          .from('supermercados' as any)
          .update({ 
            nome: formData.nome, 
            endereco: formData.endereco,
            abreviacao: formData.abreviacao || null
          })
          .eq('id', editingSupermercado.id) as any;

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Supermercado atualizado com sucesso!"
        });
      } else {
        const { error } = await supabase
          .from('supermercados' as any)
          .insert([{ 
            nome: formData.nome, 
            endereco: formData.endereco,
            abreviacao: formData.abreviacao || null
          }]) as any;

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Supermercado cadastrado com sucesso!"
        });
      }

      await refetch();
      setShowForm(false);
      setEditingSupermercado(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar supermercado",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (supermercado: Supermercado) => {
    setEditingSupermercado(supermercado);
    setFormData({
      nome: supermercado.nome,
      endereco: supermercado.endereco,
      abreviacao: supermercado.abreviacao || ''
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deleteSupermercado) {
      try {
        const { error } = await supabase
          .from('supermercados' as any)
          .delete()
          .eq('id', deleteSupermercado.id) as any;

        if (error) throw error;

        await refetch();
        setDeleteSupermercado(null);
        toast({
          title: "Supermercado excluído",
          description: "O supermercado foi removido do sistema."
        });
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao excluir supermercado",
          variant: "destructive"
        });
      }
    }
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
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Supermercado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingSupermercado ? 'Editar' : 'Novo'} Supermercado
              </DialogTitle>
              <DialogDescription>
                Preencha as informações do supermercado
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Supermercado *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do supermercado"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abreviacao">Abreviação</Label>
                <Input
                  id="abreviacao"
                  value={formData.abreviacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, abreviacao: e.target.value }))}
                  placeholder="Abreviação para usar nas colunas"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço *</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
                  placeholder="Endereço completo"
                  required
                />
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
                    {supermercado.abreviacao && (
                      <span className="text-sm px-2 py-0.5 bg-primary/10 text-primary rounded">
                        {supermercado.abreviacao}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{supermercado.endereco}</span>
                  </div>
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
              onClick={handleDelete}
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