import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Lista } from '@/types';
import { Plus, Search, Edit, Trash2, Copy, List, ChevronRight, ChevronDown } from 'lucide-react';
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
  const [expandedSubgrupos, setExpandedSubgrupos] = useState<Set<string>>(new Set());

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

  // Build hierarchical structure grouped by grupo and subgrupo
  const buildGroupedHierarchy = () => {
    const grouped: Array<{
      grupo: { id: string; nome: string };
      subgrupos: Array<{
        id: string;
        nome: string;
        produtos: Array<{
          id: string;
          nome: string;
          codigo: string;
          unidade: string;
        }>;
      }>;
    }> = [];

    grupos.forEach(grupo => {
      const grupoSubgrupos = subgrupos.filter(s => s.grupoId === grupo.id);
      const subgruposWithProducts = grupoSubgrupos
        .map(subgrupo => ({
          id: subgrupo.id,
          nome: subgrupo.nome,
          produtos: produtos
            .filter(p => p.subgrupoId === subgrupo.id)
            .map(p => ({
              id: p.id,
              nome: p.nome,
              codigo: p.codigo,
              unidade: p.unidadeMedida
            }))
        }))
        .filter(sg => sg.produtos.length > 0);

      if (subgruposWithProducts.length > 0) {
        grouped.push({
          grupo: { id: grupo.id, nome: grupo.nome },
          subgrupos: subgruposWithProducts
        });
      }
    });

    return grouped;
  };

  const groupedHierarchy = buildGroupedHierarchy();

  // Helper functions for selection
  const isGrupoFullySelected = (grupoId: string) => {
    const grupoProdutos = produtos.filter(p => p.grupoId === grupoId).map(p => p.id);
    return grupoProdutos.length > 0 && grupoProdutos.every(id => formData.produtos.includes(id));
  };

  const isSubgrupoFullySelected = (subgrupoId: string) => {
    const subgrupoProdutos = produtos.filter(p => p.subgrupoId === subgrupoId).map(p => p.id);
    return subgrupoProdutos.length > 0 && subgrupoProdutos.every(id => formData.produtos.includes(id));
  };

  const toggleSubgrupoExpansion = (subgrupoId: string) => {
    setExpandedSubgrupos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subgrupoId)) {
        newSet.delete(subgrupoId);
      } else {
        newSet.add(subgrupoId);
      }
      return newSet;
    });
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
                <div className="border rounded-md max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10 border-b">
                      <TableRow>
                        <TableHead className="w-[30%]">Grupo</TableHead>
                        <TableHead className="w-[30%]">Subgrupo</TableHead>
                        <TableHead className="w-[40%]">Produto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedHierarchy.map((grupoData) => {
                        let grupoRendered = false;
                        
                        return grupoData.subgrupos.map((subgrupoData, subIdx) => {
                          const showGrupo = !grupoRendered;
                          if (showGrupo) grupoRendered = true;
                          
                          const isExpanded = expandedSubgrupos.has(subgrupoData.id);
                          
                          return (
                            <Collapsible 
                              key={subgrupoData.id} 
                              open={isExpanded}
                              onOpenChange={() => toggleSubgrupoExpansion(subgrupoData.id)}
                              asChild
                            >
                              <>
                                {/* Subgrupo Row (collapsed) */}
                                <TableRow className="border-b">
                                  {/* Grupo Column */}
                                  <TableCell className="align-top" rowSpan={isExpanded ? subgrupoData.produtos.length + 1 : 1}>
                                    {showGrupo && (
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={isGrupoFullySelected(grupoData.grupo.id)}
                                          onCheckedChange={() => toggleGrupoProdutos(grupoData.grupo.id)}
                                        />
                                        <span className="font-medium">{grupoData.grupo.nome}</span>
                                      </div>
                                    )}
                                  </TableCell>

                                  {/* Subgrupo Column */}
                                  <TableCell colSpan={2}>
                                    <CollapsibleTrigger asChild>
                                      <div className="flex items-center gap-2 cursor-pointer w-full hover:bg-muted/50 -m-2 p-2 rounded">
                                        {isExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        )}
                                        <Checkbox
                                          checked={isSubgrupoFullySelected(subgrupoData.id)}
                                          onCheckedChange={() => toggleSubgrupoProdutos(subgrupoData.id)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className="font-medium">{subgrupoData.nome}</span>
                                        <span className="text-sm text-muted-foreground">
                                          ({subgrupoData.produtos.length} produtos)
                                        </span>
                                      </div>
                                    </CollapsibleTrigger>
                                  </TableCell>
                                </TableRow>

                                {/* Products Rows (expanded) */}
                                <CollapsibleContent asChild>
                                  <>
                                    {subgrupoData.produtos.map((produto) => (
                                      <TableRow key={produto.id} className="bg-muted/20">
                                        <TableCell></TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-2 pl-8">
                                            <Checkbox
                                              id={`produto-${produto.id}`}
                                              checked={formData.produtos.includes(produto.id)}
                                              onCheckedChange={() => toggleProduto(produto.id)}
                                            />
                                            <label 
                                              htmlFor={`produto-${produto.id}`} 
                                              className="text-sm cursor-pointer flex-1"
                                            >
                                              <span>{produto.nome}</span>
                                              <span className="text-muted-foreground ml-2">
                                                ({produto.codigo} - {produto.unidade})
                                              </span>
                                            </label>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </>
                                </CollapsibleContent>
                              </>
                            </Collapsible>
                          );
                        });
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
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : filteredListas.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <List className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma lista encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Tente uma busca diferente' : 'Crie sua primeira lista de produtos'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredListas.map((lista) => (
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
          ))
        )}
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