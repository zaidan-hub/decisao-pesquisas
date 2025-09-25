import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Lista, Produto, Grupo, Subgrupo } from '@/types';
import { Plus, Search, Edit, Trash2, Copy, List, Package, Layers, FolderOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const ListasPage = () => {
  // Mock data
  const mockProdutos: Produto[] = [
    { id: '1', codigo: 'PRD001', nome: 'Carne Bovina (Alcatra)', grupoId: '1', subgrupoId: '1', unidadeMedida: 'kg' },
    { id: '2', codigo: 'PRD002', nome: 'Leite Integral 1L', grupoId: '1', subgrupoId: '2', unidadeMedida: 'unidade' },
    { id: '3', codigo: 'PRD003', nome: 'Arroz Branco 5kg', grupoId: '1', subgrupoId: '3', unidadeMedida: 'unidade' },
    { id: '4', codigo: 'PRD004', nome: 'Feijão Preto 1kg', grupoId: '1', subgrupoId: '3', unidadeMedida: 'unidade' },
    { id: '5', codigo: 'PRD005', nome: 'Detergente Líquido', grupoId: '2', subgrupoId: '4', unidadeMedida: 'unidade' }
  ];

  const mockGrupos: Grupo[] = [
    { id: '1', codigo: 'GRP001', nome: 'Alimentação' },
    { id: '2', codigo: 'GRP002', nome: 'Limpeza' }
  ];

  const mockSubgrupos: Subgrupo[] = [
    { id: '1', codigo: 'SUB001', nome: 'Carnes', grupoId: '1' },
    { id: '2', codigo: 'SUB002', nome: 'Laticínios', grupoId: '1' },
    { id: '3', codigo: 'SUB003', nome: 'Grãos', grupoId: '1' },
    { id: '4', codigo: 'SUB004', nome: 'Detergentes', grupoId: '2' }
  ];

  const [listas, setListas] = useState<Lista[]>([
    {
      id: '1',
      nome: 'Lista Básica',
      produtos: ['1', '2', '3']
    },
    {
      id: '2',
      nome: 'Lista Completa',
      produtos: ['1', '2', '3', '4', '5']
    }
  ]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome) {
      toast({
        title: "Campo obrigatório",
        description: "Nome da lista é obrigatório.",
        variant: "destructive"
      });
      return;
    }

    const lista: Lista = {
      id: editingLista?.id || Date.now().toString(),
      nome: formData.nome,
      produtos: formData.produtos
    };

    if (editingLista) {
      setListas(prev => prev.map(l => l.id === editingLista.id ? lista : l));
      toast({
        title: "Sucesso",
        description: "Lista atualizada com sucesso!"
      });
    } else {
      setListas(prev => [...prev, lista]);
      toast({
        title: "Sucesso",
        description: "Lista cadastrada com sucesso!"
      });
    }

    setShowForm(false);
    setEditingLista(null);
    resetForm();
  };

  const handleEdit = (lista: Lista) => {
    setEditingLista(lista);
    setFormData({
      nome: lista.nome,
      produtos: [...lista.produtos]
    });
    setShowForm(true);
  };

  const handleDuplicate = (lista: Lista) => {
    const novaLista: Lista = {
      id: Date.now().toString(),
      nome: `${lista.nome} (Cópia)`,
      produtos: [...lista.produtos]
    };
    setListas(prev => [...prev, novaLista]);
    toast({
      title: "Lista duplicada",
      description: "Uma cópia da lista foi criada."
    });
  };

  const handleDelete = () => {
    if (deleteLista) {
      setListas(prev => prev.filter(l => l.id !== deleteLista.id));
      setDeleteLista(null);
      toast({
        title: "Lista excluída",
        description: "A lista foi removida do sistema."
      });
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
    const allIds = mockProdutos.map(p => p.id);
    setFormData(prev => ({
      ...prev,
      produtos: prev.produtos.length === allIds.length ? [] : allIds
    }));
  };

  const toggleGrupoProdutos = (grupoId: string) => {
    const grupoProdutos = mockProdutos.filter(p => p.grupoId === grupoId).map(p => p.id);
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
    const subgrupoProdutos = mockProdutos.filter(p => p.subgrupoId === subgrupoId).map(p => p.id);
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

  const filteredProdutos = mockProdutos.filter(p => 
    p.nome.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const getProdutoNome = (id: string) => {
    return mockProdutos.find(p => p.id === id)?.nome || 'N/A';
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
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={toggleAllProdutos}
                    >
                      {formData.produtos.length === mockProdutos.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                    </Button>
                  </div>
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

                {/* Quick selections by group/subgroup */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Seleção Rápida:</h4>
                  <div className="flex flex-wrap gap-2">
                    {mockGrupos.map(grupo => (
                      <Button
                        key={grupo.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleGrupoProdutos(grupo.id)}
                      >
                        <Layers className="w-3 h-3 mr-1" />
                        {grupo.nome}
                      </Button>
                    ))}
                    {mockSubgrupos.map(subgrupo => (
                      <Button
                        key={subgrupo.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleSubgrupoProdutos(subgrupo.id)}
                      >
                        <FolderOpen className="w-3 h-3 mr-1" />
                        {subgrupo.nome}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Products list */}
                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
                  {filteredProdutos.map((produto) => (
                    <div key={produto.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`produto-${produto.id}`}
                        checked={formData.produtos.includes(produto.id)}
                        onCheckedChange={() => toggleProduto(produto.id)}
                      />
                      <label 
                        htmlFor={`produto-${produto.id}`} 
                        className="text-sm cursor-pointer flex-1"
                      >
                        <span className="font-medium">{produto.nome}</span>
                        <span className="text-muted-foreground ml-2">
                          ({produto.codigo} - {produto.unidadeMedida})
                        </span>
                      </label>
                    </div>
                  ))}
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