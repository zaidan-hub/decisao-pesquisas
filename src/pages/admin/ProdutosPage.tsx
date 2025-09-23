import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Grupo, Subgrupo, Produto } from '@/types';
import { Plus, Search, Edit, Trash2, Package, Layers, FolderOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const ProdutosPage = () => {
  // Mock data
  const [grupos, setGrupos] = useState<Grupo[]>([
    { id: '1', codigo: 'GRP001', nome: 'Alimentação' },
    { id: '2', codigo: 'GRP002', nome: 'Limpeza' },
    { id: '3', codigo: 'GRP003', nome: 'Higiene' }
  ]);

  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([
    { id: '1', codigo: 'SUB001', nome: 'Carnes', grupoId: '1' },
    { id: '2', codigo: 'SUB002', nome: 'Laticínios', grupoId: '1' },
    { id: '3', codigo: 'SUB003', nome: 'Detergentes', grupoId: '2' }
  ]);

  const [produtos, setProdutos] = useState<Produto[]>([
    { id: '1', codigo: 'PRD001', nome: 'Carne Bovina (Alcatra)', grupoId: '1', subgrupoId: '1', unidadeMedida: 'kg' },
    { id: '2', codigo: 'PRD002', nome: 'Leite Integral 1L', grupoId: '1', subgrupoId: '2', unidadeMedida: 'unidade' }
  ]);

  const [selectedGrupo, setSelectedGrupo] = useState<string | null>(null);
  const [selectedSubgrupo, setSelectedSubgrupo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'grupos' | 'subgrupos' | 'produtos'>('grupos');
  
  // Form states
  const [showProdutoForm, setShowProdutoForm] = useState(false);
  const [showGrupoForm, setShowGrupoForm] = useState(false);
  const [showSubgrupoForm, setShowSubgrupoForm] = useState(false);
  
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
  const [editingSubgrupo, setEditingSubgrupo] = useState<Subgrupo | null>(null);
  
  // Confirmation dialogs
  const [showConfirmEditGrupo, setShowConfirmEditGrupo] = useState<Grupo | null>(null);
  const [showConfirmEditSubgrupo, setShowConfirmEditSubgrupo] = useState<Subgrupo | null>(null);
  const [showConfirmEditProduto, setShowConfirmEditProduto] = useState<Produto | null>(null);
  
  // Form data
  const [produtoForm, setProdutoForm] = useState({
    codigo: '',
    nome: '',
    grupoId: '',
    subgrupoId: '',
    unidadeMedida: ''
  });

  const [grupoForm, setGrupoForm] = useState({
    codigo: '',
    nome: ''
  });

  const [subgrupoForm, setSubgrupoForm] = useState({
    codigo: '',
    nome: '',
    grupoId: ''
  });

  const [searchTerms, setSearchTerms] = useState({
    grupos: '',
    subgrupos: '',
    produtos: ''
  });

  const generateCode = (type: 'grupo' | 'subgrupo' | 'produto') => {
    switch (type) {
      case 'grupo':
        return `GRP${(grupos.length + 1).toString().padStart(3, '0')}`;
      case 'subgrupo':
        return `SUB${(subgrupos.length + 1).toString().padStart(3, '0')}`;
      case 'produto':
        return `PRD${(produtos.length + 1).toString().padStart(3, '0')}`;
    }
  };

  // Filtered data
  const filteredGrupos = grupos.filter(g => 
    g.nome.toLowerCase().includes(searchTerms.grupos.toLowerCase())
  );

  const filteredSubgrupos = subgrupos.filter(sg => 
    sg.nome.toLowerCase().includes(searchTerms.subgrupos.toLowerCase()) &&
    (!selectedGrupo || sg.grupoId === selectedGrupo)
  );

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerms.produtos.toLowerCase()) &&
    (!selectedSubgrupo || p.subgrupoId === selectedSubgrupo)
  );

  const handleGrupoClick = (grupoId: string) => {
    setSelectedGrupo(grupoId === selectedGrupo ? null : grupoId);
    setSelectedSubgrupo(null);
    setActiveTab('subgrupos');
  };

  const handleSubgrupoClick = (subgrupoId: string) => {
    setSelectedSubgrupo(subgrupoId === selectedSubgrupo ? null : subgrupoId);
    setActiveTab('produtos');
  };

  const handleSubmitProduto = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!produtoForm.nome || !produtoForm.grupoId || !produtoForm.subgrupoId) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome, grupo e subgrupo são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const produto: Produto = {
      id: editingProduto?.id || Date.now().toString(),
      codigo: produtoForm.codigo || generateCode('produto'),
      nome: produtoForm.nome,
      grupoId: produtoForm.grupoId,
      subgrupoId: produtoForm.subgrupoId,
      unidadeMedida: produtoForm.unidadeMedida
    };

    if (editingProduto) {
      setProdutos(prev => prev.map(p => p.id === editingProduto.id ? produto : p));
    } else {
      setProdutos(prev => [...prev, produto]);
    }

    setShowProdutoForm(false);
    setEditingProduto(null);
    setProdutoForm({ codigo: '', nome: '', grupoId: '', subgrupoId: '', unidadeMedida: '' });
    
    toast({
      title: "Sucesso",
      description: editingProduto ? "Produto atualizado!" : "Produto cadastrado!"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Produtos</h2>
          <p className="text-muted-foreground">Gerencie grupos, subgrupos e produtos</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showGrupoForm} onOpenChange={setShowGrupoForm}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setGrupoForm({ codigo: generateCode('grupo'), nome: '' })}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingGrupo ? 'Editar' : 'Novo'} Grupo</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!grupoForm.nome) return;
                
                const grupo = {
                  id: editingGrupo?.id || Date.now().toString(),
                  codigo: grupoForm.codigo || generateCode('grupo'),
                  nome: grupoForm.nome
                };
                
                if (editingGrupo) {
                  setGrupos(prev => prev.map(g => g.id === editingGrupo.id ? grupo : g));
                } else {
                  setGrupos(prev => [...prev, grupo]);
                }
                
                setShowGrupoForm(false);
                setEditingGrupo(null);
                setGrupoForm({ codigo: '', nome: '' });
                toast({ 
                  title: editingGrupo ? "Grupo atualizado!" : "Grupo cadastrado!" 
                });
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input 
                    value={grupoForm.codigo}
                    onChange={(e) => setGrupoForm(prev => ({ ...prev, codigo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input 
                    value={grupoForm.nome}
                    onChange={(e) => setGrupoForm(prev => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowGrupoForm(false);
                    setEditingGrupo(null);
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingGrupo ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showSubgrupoForm} onOpenChange={setShowSubgrupoForm}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={() => setSubgrupoForm({ codigo: generateCode('subgrupo'), nome: '', grupoId: '' })}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Subgrupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSubgrupo ? 'Editar' : 'Novo'} Subgrupo</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!subgrupoForm.nome || !subgrupoForm.grupoId) return;
                
                const subgrupo = {
                  id: editingSubgrupo?.id || Date.now().toString(),
                  codigo: subgrupoForm.codigo || generateCode('subgrupo'),
                  nome: subgrupoForm.nome,
                  grupoId: subgrupoForm.grupoId
                };
                
                if (editingSubgrupo) {
                  setSubgrupos(prev => prev.map(sg => sg.id === editingSubgrupo.id ? subgrupo : sg));
                } else {
                  setSubgrupos(prev => [...prev, subgrupo]);
                }
                
                setShowSubgrupoForm(false);
                setEditingSubgrupo(null);
                setSubgrupoForm({ codigo: '', nome: '', grupoId: '' });
                toast({ 
                  title: editingSubgrupo ? "Subgrupo atualizado!" : "Subgrupo cadastrado!" 
                });
              }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input 
                    value={subgrupoForm.codigo}
                    onChange={(e) => setSubgrupoForm(prev => ({ ...prev, codigo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input 
                    value={subgrupoForm.nome}
                    onChange={(e) => setSubgrupoForm(prev => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grupo *</Label>
                  <Select value={subgrupoForm.grupoId} onValueChange={(value) => setSubgrupoForm(prev => ({ ...prev, grupoId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map(grupo => (
                        <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowSubgrupoForm(false);
                    setEditingSubgrupo(null);
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingSubgrupo ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={showProdutoForm} onOpenChange={setShowProdutoForm}>
            <DialogTrigger asChild>
              <Button onClick={() => setProdutoForm({ codigo: generateCode('produto'), nome: '', grupoId: '', subgrupoId: '', unidadeMedida: '' })}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProduto ? 'Editar' : 'Novo'} Produto</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitProduto} className="space-y-4">
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input 
                    value={produtoForm.codigo}
                    onChange={(e) => setProdutoForm(prev => ({ ...prev, codigo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Produto *</Label>
                  <Input 
                    value={produtoForm.nome}
                    onChange={(e) => setProdutoForm(prev => ({ ...prev, nome: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grupo *</Label>
                  <Select value={produtoForm.grupoId} onValueChange={(value) => {
                    setProdutoForm(prev => ({ ...prev, grupoId: value, subgrupoId: '' }));
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map(grupo => (
                        <SelectItem key={grupo.id} value={grupo.id}>{grupo.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subgrupo *</Label>
                  <Select value={produtoForm.subgrupoId} onValueChange={(value) => setProdutoForm(prev => ({ ...prev, subgrupoId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o subgrupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {subgrupos.filter(sg => sg.grupoId === produtoForm.grupoId).map(subgrupo => (
                        <SelectItem key={subgrupo.id} value={subgrupo.id}>{subgrupo.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unidade de Medida</Label>
                  <Input 
                    value={produtoForm.unidadeMedida}
                    onChange={(e) => setProdutoForm(prev => ({ ...prev, unidadeMedida: e.target.value }))}
                    placeholder="kg, unidade, litro, etc."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setShowProdutoForm(false);
                    setEditingProduto(null);
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingProduto ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={activeTab === 'grupos' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('grupos')}
        >
          <Layers className="w-4 h-4 mr-2" />
          Grupos
        </Button>
        <Button
          variant={activeTab === 'subgrupos' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('subgrupos')}
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Subgrupos
        </Button>
        <Button
          variant={activeTab === 'produtos' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('produtos')}
        >
          <Package className="w-4 h-4 mr-2" />
          Produtos
        </Button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grupos */}
        <Card className={activeTab === 'grupos' ? 'ring-2 ring-primary' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Grupos
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar grupos..."
                value={searchTerms.grupos}
                onChange={(e) => setSearchTerms(prev => ({ ...prev, grupos: e.target.value }))}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {filteredGrupos.map((grupo) => (
              <div
                key={grupo.id}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  selectedGrupo === grupo.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleGrupoClick(grupo.id)}
                onDoubleClick={() => {
                  setShowConfirmEditGrupo(grupo);
                }}
              >
                <div className="font-medium">{grupo.nome}</div>
                <div className="text-sm opacity-75">{grupo.codigo}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Subgrupos */}
        <Card className={activeTab === 'subgrupos' ? 'ring-2 ring-primary' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Subgrupos
              {selectedGrupo && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({grupos.find(g => g.id === selectedGrupo)?.nome})
                </span>
              )}
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar subgrupos..."
                value={searchTerms.subgrupos}
                onChange={(e) => setSearchTerms(prev => ({ ...prev, subgrupos: e.target.value }))}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {filteredSubgrupos.map((subgrupo) => (
              <div
                key={subgrupo.id}
                className={`p-3 rounded-md cursor-pointer transition-colors ${
                  selectedSubgrupo === subgrupo.id 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleSubgrupoClick(subgrupo.id)}
                onDoubleClick={() => {
                  setShowConfirmEditSubgrupo(subgrupo);
                }}
              >
                <div className="font-medium">{subgrupo.nome}</div>
                <div className="text-sm opacity-75">{subgrupo.codigo}</div>
              </div>
            ))}
            {selectedGrupo && filteredSubgrupos.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                Nenhum subgrupo encontrado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Produtos */}
        <Card className={activeTab === 'produtos' ? 'ring-2 ring-primary' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Produtos
              {selectedSubgrupo && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({subgrupos.find(sg => sg.id === selectedSubgrupo)?.nome})
                </span>
              )}
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerms.produtos}
                onChange={(e) => setSearchTerms(prev => ({ ...prev, produtos: e.target.value }))}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {filteredProdutos.map((produto) => (
              <div
                key={produto.id}
                className="p-3 rounded-md hover:bg-muted transition-colors cursor-pointer"
                onDoubleClick={() => {
                  setShowConfirmEditProduto(produto);
                }}
              >
                <div className="font-medium">{produto.nome}</div>
                <div className="text-sm text-muted-foreground">
                  {produto.codigo} • {produto.unidadeMedida}
                </div>
              </div>
            ))}
            {selectedSubgrupo && filteredProdutos.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                Nenhum produto encontrado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!showConfirmEditGrupo} onOpenChange={() => setShowConfirmEditGrupo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja editar o grupo "{showConfirmEditGrupo?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (showConfirmEditGrupo) {
                setEditingGrupo(showConfirmEditGrupo);
                setGrupoForm({
                  codigo: showConfirmEditGrupo.codigo,
                  nome: showConfirmEditGrupo.nome
                });
                setShowGrupoForm(true);
                setShowConfirmEditGrupo(null);
              }
            }}>
              Editar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!showConfirmEditSubgrupo} onOpenChange={() => setShowConfirmEditSubgrupo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Subgrupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja editar o subgrupo "{showConfirmEditSubgrupo?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (showConfirmEditSubgrupo) {
                setEditingSubgrupo(showConfirmEditSubgrupo);
                setSubgrupoForm({
                  codigo: showConfirmEditSubgrupo.codigo,
                  nome: showConfirmEditSubgrupo.nome,
                  grupoId: showConfirmEditSubgrupo.grupoId
                });
                setShowSubgrupoForm(true);
                setShowConfirmEditSubgrupo(null);
              }
            }}>
              Editar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!showConfirmEditProduto} onOpenChange={() => setShowConfirmEditProduto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Editar Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja editar o produto "{showConfirmEditProduto?.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (showConfirmEditProduto) {
                setEditingProduto(showConfirmEditProduto);
                setProdutoForm({
                  codigo: showConfirmEditProduto.codigo,
                  nome: showConfirmEditProduto.nome,
                  grupoId: showConfirmEditProduto.grupoId,
                  subgrupoId: showConfirmEditProduto.subgrupoId,
                  unidadeMedida: showConfirmEditProduto.unidadeMedida
                });
                setShowProdutoForm(true);
                setShowConfirmEditProduto(null);
              }
            }}>
              Editar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};