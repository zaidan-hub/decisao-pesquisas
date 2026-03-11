import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Supermercado } from '@/types';
import { Plus, Search, MapPin, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSupermercados } from '@/hooks/useSupermercados';
import { supabase } from '@/integrations/supabase/client';

interface SupermercadosPageProps {
  onSelectSupermercado?: (supermercado: Supermercado) => void;
}

export const SupermercadosPage = ({ onSelectSupermercado }: SupermercadosPageProps) => {
  const { supermercados, loading, refetch } = useSupermercados();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ nome: '', endereco: '', abreviacao: '' });

  const resetForm = () => setFormData({ nome: '', endereco: '', abreviacao: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.endereco) {
      toast({ title: "Campos obrigatórios", description: "Nome e endereço são obrigatórios.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from('supermercados' as any)
        .insert([{ nome: formData.nome, endereco: formData.endereco, abreviacao: formData.abreviacao || null }]) as any;
      if (error) throw error;
      toast({ title: "Sucesso", description: "Supermercado cadastrado com sucesso!" });
      await refetch();
      setShowForm(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao salvar supermercado", variant: "destructive" });
    }
  };

  const filteredSupermercados = supermercados
    .filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold">Supermercados</h2>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Supermercado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Supermercado</DialogTitle>
              <DialogDescription>Preencha as informações do supermercado</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Supermercado *</Label>
                <Input id="nome" value={formData.nome} onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome do supermercado" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="abreviacao">Abreviação</Label>
                <Input id="abreviacao" value={formData.abreviacao} onChange={(e) => setFormData(prev => ({ ...prev, abreviacao: e.target.value }))} placeholder="Abreviação para usar nas colunas" maxLength={20} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço *</Label>
                <Input id="endereco" value={formData.endereco} onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))} placeholder="Endereço completo" required />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
                <Button type="submit">Cadastrar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar supermercados..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <div className="grid gap-4">
        {filteredSupermercados.map((supermercado) => (
          <Card 
            key={supermercado.id} 
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onSelectSupermercado?.(supermercado)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{supermercado.nome}</h3>
                    {supermercado.abreviacao && (
                      <span className="text-sm px-2 py-0.5 bg-primary/10 text-primary rounded">{supermercado.abreviacao}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{supermercado.endereco}</span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
    </div>
  );
};
