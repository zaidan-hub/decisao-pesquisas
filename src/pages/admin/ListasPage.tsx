import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Lista } from '@/types';
import { Plus, Search, Edit, Trash2, Copy, List } from 'lucide-react';
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

  const getProdutoNome = (id: string) => {
    return produtos.find(p => p.id === id)?.nome || 'N/A';
  };

  // Build hierarchical structure for display
  const buildHierarchy = () => {
    const rows: Array<{
      type: 'grupo' | 'subgrupo' | 'produto';
      id: string;
      grupoNome?: string;
      subgrupoNome?: string;
      produtoNome?: string;
      produtoCodigo?: string;
      produtoUnidade?: string;
    }> = [];

    grupos.forEach(grupo => {
      const grupoSubgrupos = subgrupos.filter(s => s.grupoId === grupo.id);
      
      grupoSubgrupos.forEach(subgrupo => {
        const subgrupoProdutos = produtos.filter(p => p.subgrupoId === subgrupo.id);
        
        subgrupoProdutos.forEach((produto, idx) => {
          rows.push({
            type: 'produto',
            id: produto.id,
            grupoNome: idx === 0 && subgrupoProdutos.length > 0 ? grupo.nome : undefined,
            subgrupoNome: idx === 0 ? subgrupo.nome : undefined,
            produtoNome: produto.nome,
            produtoCodigo: produto.codigo,
            produtoUnidade: produto.unidadeMedida
          });
        });
      });
    });

    return rows;
  };

  const hierarchyRows = buildHierarchy();

  // Filter by search term
  const filteredRows = productSearchTerm
    ? hierarchyRows.filter(row => 
        row.produtoNome?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        row.grupoNome?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        row.subgrupoNome?.toLowerCase().includes(productSearchTerm.toLowerCase())
      )
    : hierarchyRows;

  // Helper functions for selection
  const isGrupoFullySelected = (grupoId: string) => {
    const grupoProdutos = produtos.filter(p => p.grupoId === grupoId).map(p => p.id);
    return grupoProdutos.length > 0 && grupoProdutos.every(id => formData.produtos.includes(id));
  };

  const isSubgrupoFullySelected = (subgrupoId: string) => {
    const subgrupoProdutos = produtos.filter(p => p.subgrupoId === subgrupoId).map(p => p.id);
    return subgrupoProdutos.length > 0 && subgrupoProdutos.every(id => formData.produtos.includes(id));
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
                    placeholder="Buscar produtos, grupos ou subgrupos..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Table with 3 columns: Grupo, Subgrupo, Produto */}
                <div className="border rounded-md max-h-96 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[30%]">Grupo</TableHead>
                        <TableHead className="w-[30%]">Subgrupo</TableHead>
                        <TableHead className="w-[40%]">Produto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRows.map((row, idx) => {
                        const grupo = grupos.find(g => g.nome === row.grupoNome);
                        const subgrupo = subgrupos.find(s => s.nome === row.subgrupoNome);
                        
                        return (
                          <TableRow key={`${row.id}-${idx}`}>
                            {/* Grupo Column */}
                            <TableCell className="align-top">
                              {row.grupoNome && grupo && (
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isGrupoFullySelected(grupo.id)}
                                    onCheckedChange={() => toggleGrupoProdutos(grupo.id)}
                                  />
                                  <span className="font-medium">{row.grupoNome}</span>
                                </div>
                              )}
                            </TableCell>

                            {/* Subgrupo Column */}
                            <TableCell className="align-top">
                              {row.subgrupoNome && subgrupo && (
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isSubgrupoFullySelected(subgrupo.id)}
                                    onCheckedChange={() => toggleSubgrupoProdutos(subgrupo.id)}
                                  />
                                  <span className="font-medium">{row.subgrupoNome}</span>
                                </div>
                              )}
                            </TableCell>

                            {/* Produto Column */}
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`produto-${row.id}`}
                                  checked={formData.produtos.includes(row.id)}
                                  onCheckedChange={() => toggleProduto(row.id)}
                                />
                                <label 
                                  htmlFor={`produto-${row.id}`} 
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  <span>{row.produtoNome}</span>
                                  <span className="text-muted-foreground ml-2">
                                    ({row.produtoCodigo} - {row.produtoUnidade})
                                  </span>
                                </label>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
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