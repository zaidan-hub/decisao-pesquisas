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
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { useListas } from '@/hooks/useListas';
import { supabase } from '@/integrations/supabase/client';

export const ListasPage = () => {
  // Buscar dados reais do banco
  const { departamentos } = useDepartamentos();
  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();
  const { produtos } = useProdutos();
  const { listas, loading, refetch } = useListas();

  const [showForm, setShowForm] = useState(false);
  const [editingLista, setEditingLista] = useState<Lista | null>(null);
  const [deleteLista, setDeleteLista] = useState<Lista | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [expandedDepartamentos, setExpandedDepartamentos] = useState<Set<string>>(new Set());
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set());
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

  const toggleDepartamentoProdutos = (departamentoId: string) => {
    const gruposDoDepartamento = grupos.filter(g => g.departamentoId === departamentoId);
    const produtosDoDepartamento = produtos.filter(p => {
      const grupo = grupos.find(g => g.id === p.grupoId);
      return grupo?.departamentoId === departamentoId;
    }).map(p => p.id);
    
    const allSelected = produtosDoDepartamento.every(id => formData.produtos.includes(id));
    
    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        produtos: prev.produtos.filter(id => !produtosDoDepartamento.includes(id))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        produtos: [...new Set([...prev.produtos, ...produtosDoDepartamento])]
      }));
    }
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

  // Build hierarchical structure grouped by departamento > grupo > subgrupo > produto
  const buildDepartamentoHierarchy = () => {
    const hierarchy: Array<{
      departamento: { id: string; nome: string };
      grupos: Array<{
        id: string;
        nome: string;
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
      }>;
    }> = [];

    departamentos.forEach(departamento => {
      const gruposNoDepartamento = grupos.filter(g => g.departamentoId === departamento.id);
      
      const gruposWithData = gruposNoDepartamento.map(grupo => {
        const subgruposNoGrupo = subgrupos.filter(s => s.grupoId === grupo.id);
        const subgruposWithProducts = subgruposNoGrupo
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

        return {
          id: grupo.id,
          nome: grupo.nome,
          subgrupos: subgruposWithProducts
        };
      }).filter(g => g.subgrupos.length > 0);

      if (gruposWithData.length > 0) {
        hierarchy.push({
          departamento: { id: departamento.id, nome: departamento.nome },
          grupos: gruposWithData
        });
      }
    });

    return hierarchy;
  };

  const departamentoHierarchy = buildDepartamentoHierarchy();

  // Helper functions for selection
  const isDepartamentoFullySelected = (departamentoId: string) => {
    const produtosDoDepartamento = produtos.filter(p => {
      const grupo = grupos.find(g => g.id === p.grupoId);
      return grupo?.departamentoId === departamentoId;
    }).map(p => p.id);
    return produtosDoDepartamento.length > 0 && produtosDoDepartamento.every(id => formData.produtos.includes(id));
  };

  const isGrupoFullySelected = (grupoId: string) => {
    const grupoProdutos = produtos.filter(p => p.grupoId === grupoId).map(p => p.id);
    return grupoProdutos.length > 0 && grupoProdutos.every(id => formData.produtos.includes(id));
  };

  const isSubgrupoFullySelected = (subgrupoId: string) => {
    const subgrupoProdutos = produtos.filter(p => p.subgrupoId === subgrupoId).map(p => p.id);
    return subgrupoProdutos.length > 0 && subgrupoProdutos.every(id => formData.produtos.includes(id));
  };

  const toggleDepartamentoExpansion = (departamentoId: string) => {
    setExpandedDepartamentos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(departamentoId)) {
        newSet.delete(departamentoId);
      } else {
        newSet.add(departamentoId);
      }
      return newSet;
    });
  };

  const toggleGrupoExpansion = (grupoId: string) => {
    setExpandedGrupos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(grupoId)) {
        newSet.delete(grupoId);
      } else {
        newSet.add(grupoId);
      }
      return newSet;
    });
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
                    placeholder="Buscar produtos, departamentos, grupos ou subgrupos..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Hierarchical list with indentation */}
                <div className="border rounded-md max-h-[500px] overflow-auto p-4 space-y-2">
                  {departamentoHierarchy.map((deptData) => {
                    const isDeptExpanded = expandedDepartamentos.has(deptData.departamento.id);
                    
                    return (
                      <div key={deptData.departamento.id} className="space-y-2">
                        {/* Departamento */}
                        <div className="flex items-center gap-2 py-1">
                          <button
                            type="button"
                            onClick={() => toggleDepartamentoExpansion(deptData.departamento.id)}
                            className="p-0 hover:bg-muted rounded"
                          >
                            {isDeptExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                          <Checkbox
                            checked={isDepartamentoFullySelected(deptData.departamento.id)}
                            onCheckedChange={() => toggleDepartamentoProdutos(deptData.departamento.id)}
                          />
                          <span className="font-semibold text-base">{deptData.departamento.nome}</span>
                        </div>

                        {/* Grupos */}
                        {isDeptExpanded && deptData.grupos.map((grupoData) => {
                          const isGrupoExpanded = expandedGrupos.has(grupoData.id);
                          
                          return (
                            <div key={grupoData.id} className="ml-6 space-y-2">
                              <div className="flex items-center gap-2 py-1">
                                <button
                                  type="button"
                                  onClick={() => toggleGrupoExpansion(grupoData.id)}
                                  className="p-0 hover:bg-muted rounded"
                                >
                                  {isGrupoExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </button>
                                <Checkbox
                                  checked={isGrupoFullySelected(grupoData.id)}
                                  onCheckedChange={() => toggleGrupoProdutos(grupoData.id)}
                                />
                                <span className="font-medium">{grupoData.nome}</span>
                              </div>

                              {/* Subgrupos */}
                              {isGrupoExpanded && grupoData.subgrupos.map((subgrupoData) => {
                                const isSubgrupoExpanded = expandedSubgrupos.has(subgrupoData.id);
                                
                                return (
                                  <div key={subgrupoData.id} className="ml-6 space-y-1">
                                    <div className="flex items-center gap-2 py-1">
                                      <button
                                        type="button"
                                        onClick={() => toggleSubgrupoExpansion(subgrupoData.id)}
                                        className="p-0 hover:bg-muted rounded"
                                      >
                                        {isSubgrupoExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        )}
                                      </button>
                                      <Checkbox
                                        checked={isSubgrupoFullySelected(subgrupoData.id)}
                                        onCheckedChange={() => toggleSubgrupoProdutos(subgrupoData.id)}
                                      />
                                      <span className="text-sm font-medium">{subgrupoData.nome}</span>
                                      <span className="text-xs text-muted-foreground">
                                        ({subgrupoData.produtos.length} produtos)
                                      </span>
                                    </div>

                                    {/* Produtos */}
                                    {isSubgrupoExpanded && (
                                      <div className="ml-6 space-y-1">
                                        {subgrupoData.produtos.map((produto) => (
                                          <div key={produto.id} className="flex items-center gap-2 py-1">
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
                                              <span className="text-muted-foreground ml-2 text-xs">
                                                ({produto.codigo} - {produto.unidade})
                                              </span>
                                            </label>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
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