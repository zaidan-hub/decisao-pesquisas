import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Lista, Produto, Grupo, Subgrupo } from '@/types';
import { Plus, Search, Edit, Trash2, Copy, List, Package, Layers, FolderOpen, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { useListas } from '@/hooks/useListas';
import { supabase } from '@/integrations/supabase/client';

export const ListasPage = () => {
  // Buscar dados reais do banco
  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();
  const { produtos } = useProdutos();
  const { listas, loading, refetch } = useListas();

  const [showForm, setShowForm] = useState(false);
  const [editingLista, setEditingLista] = useState<Lista | null>(null);
  const [deleteLista, setDeleteLista] = useState<Lista | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    produtos: [] as string[]
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      produtos: []
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome) {
      toast({
        title: "Campo obrigatório",
        description: "Nome da lista é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    try {
      const listaData = {
        nome: formData.nome,
        produtos: formData.produtos
      };

      if (editingLista) {
        const { error } = await supabase
          .from('listas' as any)
          .update(listaData)
          .eq('id', editingLista.id) as any;

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Lista atualizada com sucesso!"
        });
      } else {
        const { error } = await supabase
          .from('listas' as any)
          .insert([listaData]) as any;

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Lista cadastrada com sucesso!"
        });
      }

      await refetch();
      setShowForm(false);
      setEditingLista(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar lista",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (lista: Lista) => {
    setEditingLista(lista);
    setFormData({
      nome: lista.nome,
      produtos: [...lista.produtos]
    });
    setShowForm(true);
  };

  const handleDuplicate = async (lista: Lista) => {
    try {
      const novaLista = {
        nome: `${lista.nome} (Cópia)`,
        produtos: lista.produtos
      };
      
      const { error } = await supabase
        .from('listas' as any)
        .insert([novaLista]) as any;

      if (error) throw error;

      await refetch();
      toast({
        title: "Lista duplicada",
        description: "Uma cópia da lista foi criada."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao duplicar lista",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (deleteLista) {
      try {
        const { error } = await supabase
          .from('listas' as any)
          .delete()
          .eq('id', deleteLista.id) as any;

        if (error) throw error;

        await refetch();
        setDeleteLista(null);
        toast({
          title: "Lista excluída",
          description: "A lista foi removida do sistema."
        });
      } catch (error: any) {
        toast({
          title: "Erro",
          description: error.message || "Erro ao excluir lista",
          variant: "destructive"
        });
      }
    }
  };

  const toggleProduto = (produtoId: string) => {
    setFormData(prev => ({
      ...prev,
      produtos: prev.produtos.includes(produtoId)
        ? prev.produtos.filter(id => id !== produtoId)
        : [...prev.produtos, produtoId]
    }));
  };

  const toggleAllProdutos = () => {
    const allIds = produtos.map(p => p.id);
    setFormData(prev => ({
      ...prev,
      produtos: prev.produtos.length === allIds.length ? [] : allIds
    }));
  };

  const toggleGrupoProdutos = (grupoId: string) => {
    const grupoProdutos = produtos.filter(p => p.grupoId === grupoId).map(p => p.id);
    const allSelected = grupoProdutos.every(id => formData.produtos.includes(id));
    
    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        produtos: prev.produtos.filter(id => !grupoProdutos.includes(id))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        produtos: [...new Set([...prev.produtos, ...grupoProdutos])]
      }));
    }
  };

  const toggleSubgrupoProdutos = (subgrupoId: string) => {
    const subgrupoProdutos = produtos.filter(p => p.subgrupoId === subgrupoId).map(p => p.id);
    const allSelected = subgrupoProdutos.every(id => formData.produtos.includes(id));
    
    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        produtos: prev.produtos.filter(id => !subgrupoProdutos.includes(id))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        produtos: [...new Set([...prev.produtos, ...subgrupoProdutos])]
      }));
    }
  };

  const filteredListas = listas
    .filter(l => l.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const getProdutoNome = (id: string) => {
    return produtos.find(p => p.id === id)?.nome || 'N/A';
  };

  // Helper functions for checking if all items in a group/subgroup are selected
  const isGrupoFullySelected = (grupoId: string) => {
    const grupoProdutos = produtos.filter(p => p.grupoId === grupoId).map(p => p.id);
    return grupoProdutos.length > 0 && grupoProdutos.every(id => formData.produtos.includes(id));
  };

  const isGrupoPartiallySelected = (grupoId: string) => {
    const grupoProdutos = produtos.filter(p => p.grupoId === grupoId).map(p => p.id);
    return grupoProdutos.some(id => formData.produtos.includes(id)) && !isGrupoFullySelected(grupoId);
  };

  const isSubgrupoFullySelected = (subgrupoId: string) => {
    const subgrupoProdutos = produtos.filter(p => p.subgrupoId === subgrupoId).map(p => p.id);
    return subgrupoProdutos.length > 0 && subgrupoProdutos.every(id => formData.produtos.includes(id));
  };

  const isSubgrupoPartiallySelected = (subgrupoId: string) => {
    const subgrupoProdutos = produtos.filter(p => p.subgrupoId === subgrupoId).map(p => p.id);
    return subgrupoProdutos.some(id => formData.produtos.includes(id)) && !isSubgrupoFullySelected(subgrupoId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Listas</h2>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Lista
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLista ? 'Editar' : 'Nova'} Lista
              </DialogTitle>
              <DialogDescription>
                Configure os produtos que farão parte desta lista
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Lista *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome da lista"
                  required
                />
              </div>

              {/* Product Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Produtos da Lista</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={toggleAllProdutos}
                  >
                    {formData.produtos.length === produtos.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </Button>
                </div>

                {/* Search Products */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Hierarchical product selection */}
                <div className="border rounded-md max-h-96 overflow-y-auto">
                  <Accordion type="multiple" className="w-full">
                    {grupos.map((grupo) => {
                      const grupoSubgrupos = subgrupos.filter(s => s.grupoId === grupo.id);
                      const grupoProdutosCount = produtos.filter(p => p.grupoId === grupo.id).length;
                      
                      if (grupoProdutosCount === 0) return null;

                      return (
                        <AccordionItem key={grupo.id} value={grupo.id}>
                          <AccordionTrigger className="px-4 hover:no-underline">
                            <div className="flex items-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={isGrupoFullySelected(grupo.id)}
                                onCheckedChange={() => toggleGrupoProdutos(grupo.id)}
                                className={isGrupoPartiallySelected(grupo.id) ? "data-[state=checked]:bg-primary/50" : ""}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <Layers className="w-4 h-4 text-primary" />
                                <span className="font-medium">{grupo.nome}</span>
                                <span className="text-sm text-muted-foreground">
                                  ({grupoProdutosCount} produtos)
                                </span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-2">
                            <Accordion type="multiple" className="w-full pl-6">
                              {grupoSubgrupos.map((subgrupo) => {
                                const subgrupoProdutos = produtos.filter(p => p.subgrupoId === subgrupo.id);
                                
                                if (subgrupoProdutos.length === 0) return null;

                                return (
                                  <AccordionItem key={subgrupo.id} value={subgrupo.id}>
                                    <AccordionTrigger className="py-2 hover:no-underline">
                                      <div className="flex items-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          checked={isSubgrupoFullySelected(subgrupo.id)}
                                          onCheckedChange={() => toggleSubgrupoProdutos(subgrupo.id)}
                                          className={isSubgrupoPartiallySelected(subgrupo.id) ? "data-[state=checked]:bg-primary/50" : ""}
                                        />
                                        <div className="flex items-center gap-2 flex-1">
                                          <FolderOpen className="w-4 h-4 text-primary" />
                                          <span className="font-medium">{subgrupo.nome}</span>
                                          <span className="text-sm text-muted-foreground">
                                            ({subgrupoProdutos.length} produtos)
                                          </span>
                                        </div>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-6 pb-2">
                                      <div className="space-y-2">
                                        {subgrupoProdutos.map((produto) => (
                                          <div key={produto.id} className="flex items-center gap-2 py-1">
                                            <Checkbox
                                              id={`produto-${produto.id}`}
                                              checked={formData.produtos.includes(produto.id)}
                                              onCheckedChange={() => toggleProduto(produto.id)}
                                            />
                                            <label 
                                              htmlFor={`produto-${produto.id}`} 
                                              className="text-sm cursor-pointer flex-1 flex items-center gap-2"
                                            >
                                              <Package className="w-3 h-3 text-muted-foreground" />
                                              <span>{produto.nome}</span>
                                              <span className="text-muted-foreground">
                                                ({produto.codigo} - {produto.unidadeMedida})
                                              </span>
                                            </label>
                                          </div>
                                        ))}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>

                <div className="text-sm text-muted-foreground">
                  {formData.produtos.length} produto(s) selecionado(s)
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingLista(null);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingLista ? 'Atualizar' : 'Cadastrar'}
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
          placeholder="Buscar listas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredListas.map((lista) => (
          <Card key={lista.id} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <List className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">{lista.nome}</h3>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-3">
                    <strong>Produtos:</strong> {lista.produtos.length} itens
                  </div>

                  {lista.produtos.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Produtos inclusos:</h4>
                      <div className="text-sm text-muted-foreground max-h-20 overflow-y-auto">
                        {lista.produtos.slice(0, 5).map(produtoId => (
                          <div key={produtoId}>• {getProdutoNome(produtoId)}</div>
                        ))}
                        {lista.produtos.length > 5 && (
                          <div className="text-xs italic">
                            ... e mais {lista.produtos.length - 5} produto(s)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(lista)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(lista)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteLista(lista)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteLista} onOpenChange={() => setDeleteLista(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a lista "{deleteLista?.nome}"? 
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