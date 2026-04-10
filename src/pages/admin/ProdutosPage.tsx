import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Departamento, Grupo, Subgrupo, Produto } from '@/types';
import { Search, Package, Layers, FolderOpen, Building2, Plus, Trash2 } from 'lucide-react';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ProdutosPage = () => {
  // Buscar dados do banco
  const { departamentos, loading: loadingDepartamentos, refetch: refetchDepartamentos } = useDepartamentos();
  const { grupos, loading: loadingGrupos, refetch: refetchGrupos } = useGrupos();
  const { subgrupos, loading: loadingSubgrupos, refetch: refetchSubgrupos } = useSubgrupos();
  const { produtos, loading: loadingProdutos, refetch: refetchProdutos } = useProdutos();

  const [selectedDepartamento, setSelectedDepartamento] = useState<string | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<string | null>(null);
  const [selectedSubgrupo, setSelectedSubgrupo] = useState<string | null>(null);
  
  const [searchTerms, setSearchTerms] = useState({
    departamentos: '',
    grupos: '',
    subgrupos: '',
    produtos: ''
  });

  // Estados para edição
  const [editingDepartamento, setEditingDepartamento] = useState<Departamento | null>(null);
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
  const [editingSubgrupo, setEditingSubgrupo] = useState<Subgrupo | null>(null);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);

  // Estados para adicionar novo item
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addCategory, setAddCategory] = useState<'departamento' | 'grupo' | 'subgrupo' | 'produto'>('departamento');
  const [newItem, setNewItem] = useState({
    codigo: '',
    nome: '',
    departamentoId: '',
    grupoId: '',
    subgrupoId: '',
    unidadeMedida: '',
    quantidade: '',
    maisBarato: false
  });

  // Estados para deletar itens
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'departamento' | 'grupo' | 'subgrupo' | 'produto';
    item: Departamento | Grupo | Subgrupo | Produto;
  } | null>(null);

  // Filtered data
  const filteredDepartamentos = departamentos.filter(d => 
    d.nome.toLowerCase().includes(searchTerms.departamentos.toLowerCase())
  );

  const filteredGrupos = grupos.filter(g => 
    g.nome.toLowerCase().includes(searchTerms.grupos.toLowerCase()) &&
    (!selectedDepartamento || g.departamentoId === selectedDepartamento)
  );

  const filteredSubgrupos = subgrupos.filter(sg => 
    sg.nome.toLowerCase().includes(searchTerms.subgrupos.toLowerCase()) &&
    (!selectedGrupo || sg.grupoId === selectedGrupo)
  );

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(searchTerms.produtos.toLowerCase()) &&
    (!selectedSubgrupo || p.subgrupoId === selectedSubgrupo)
  );

  // Handlers
  const handleDepartamentoClick = (departamentoId: string) => {
    if (selectedDepartamento === departamentoId) {
      setSelectedDepartamento(null);
    } else {
      setSelectedDepartamento(departamentoId);
      setSelectedGrupo(null);
      setSelectedSubgrupo(null);
    }
  };

  const handleGrupoClick = (grupoId: string) => {
    if (selectedGrupo === grupoId) {
      setSelectedGrupo(null);
    } else {
      setSelectedGrupo(grupoId);
      setSelectedSubgrupo(null);
    }
  };

  const handleSubgrupoClick = (subgrupoId: string) => {
    if (selectedSubgrupo === subgrupoId) {
      setSelectedSubgrupo(null);
    } else {
      setSelectedSubgrupo(subgrupoId);
    }
  };

  // Handlers de edição
  const handleUpdateDepartamento = async () => {
    if (!editingDepartamento) return;
    
    try {
      const { error } = await supabase
        .from('departamentos')
        .update({ nome: editingDepartamento.nome, codigo: editingDepartamento.codigo })
        .eq('id', editingDepartamento.id);

      if (error) throw error;
      
      toast.success('Departamento atualizado com sucesso');
      setEditingDepartamento(null);
      refetchDepartamentos();
    } catch (error) {
      console.error('Erro ao atualizar departamento:', error);
      toast.error('Erro ao atualizar departamento');
    }
  };

  const handleUpdateGrupo = async () => {
    if (!editingGrupo) return;
    
    try {
      const { error } = await supabase
        .from('grupos')
        .update({ 
          nome: editingGrupo.nome, 
          codigo: editingGrupo.codigo,
          departamento_id: editingGrupo.departamentoId
        })
        .eq('id', editingGrupo.id);

      if (error) throw error;
      
      toast.success('Grupo atualizado com sucesso');
      setEditingGrupo(null);
      refetchGrupos();
    } catch (error) {
      console.error('Erro ao atualizar grupo:', error);
      toast.error('Erro ao atualizar grupo');
    }
  };

  const handleUpdateSubgrupo = async () => {
    if (!editingSubgrupo) return;
    
    try {
      const { error } = await supabase
        .from('subgrupos')
        .update({ 
          nome: editingSubgrupo.nome, 
          codigo: editingSubgrupo.codigo,
          grupo_id: editingSubgrupo.grupoId
        })
        .eq('id', editingSubgrupo.id);

      if (error) throw error;
      
      toast.success('Subgrupo atualizado com sucesso');
      setEditingSubgrupo(null);
      refetchSubgrupos();
    } catch (error) {
      console.error('Erro ao atualizar subgrupo:', error);
      toast.error('Erro ao atualizar subgrupo');
    }
  };

  const handleUpdateProduto = async () => {
    if (!editingProduto) return;
    
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ 
          nome: editingProduto.nome, 
          codigo: editingProduto.codigo,
          subgrupo_id: editingProduto.subgrupoId,
          unidade_medida: editingProduto.unidadeMedida,
          quantidade: editingProduto.quantidade,
          mais_barato: editingProduto.maisBarato || false
        })
        .eq('id', editingProduto.id);

      if (error) throw error;
      
      toast.success('Produto atualizado com sucesso');
      setEditingProduto(null);
      refetchProdutos();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error('Erro ao atualizar produto');
    }
  };

  // Handler para adicionar novo item
  const handleAddItem = async () => {
    try {
      // Validações
      if (!newItem.codigo.trim()) {
        toast.error('O código é obrigatório');
        return;
      }
      
      if (!newItem.nome.trim()) {
        toast.error('O nome é obrigatório');
        return;
      }

      if (addCategory === 'departamento') {
        const { error } = await supabase
          .from('departamentos')
          .insert({ codigo: newItem.codigo, nome: newItem.nome });
        
        if (error) throw error;
        refetchDepartamentos();
        toast.success('Departamento criado com sucesso');
        
      } else if (addCategory === 'grupo') {
        if (!newItem.departamentoId) {
          toast.error('Selecione um departamento');
          return;
        }
        
        const { error } = await supabase
          .from('grupos')
          .insert({ 
            codigo: newItem.codigo, 
            nome: newItem.nome,
            departamento_id: newItem.departamentoId
          });
        
        if (error) throw error;
        refetchGrupos();
        toast.success('Grupo criado com sucesso');
        
      } else if (addCategory === 'subgrupo') {
        if (!newItem.grupoId) {
          toast.error('Selecione um grupo');
          return;
        }
        
        const { error } = await supabase
          .from('subgrupos')
          .insert({ 
            codigo: newItem.codigo, 
            nome: newItem.nome,
            grupo_id: newItem.grupoId
          });
        
        if (error) throw error;
        refetchSubgrupos();
        toast.success('Subgrupo criado com sucesso');
        
      } else if (addCategory === 'produto') {
        if (!newItem.subgrupoId) {
          toast.error('Selecione um subgrupo');
          return;
        }
        
        if (!newItem.unidadeMedida.trim()) {
          toast.error('A unidade de medida é obrigatória');
          return;
        }
        
        // Verificar se já existe produto com este código
        const { data: existente } = await supabase
          .from('produtos')
          .select('id')
          .eq('codigo', newItem.codigo.trim())
          .limit(1);
        
        if (existente && existente.length > 0) {
          toast.error(`Já existe um produto com o código '${newItem.codigo.trim()}'. Por favor, use um código diferente.`);
          return;
        }
        
        // Buscar o grupo_id do subgrupo selecionado
        const subgrupo = subgrupos.find(s => s.id === newItem.subgrupoId);
        if (!subgrupo) {
          toast.error('Subgrupo não encontrado');
          return;
        }
        
        const { error } = await supabase
          .from('produtos')
          .insert({ 
            codigo: newItem.codigo, 
            nome: newItem.nome,
            grupo_id: subgrupo.grupoId,
            subgrupo_id: newItem.subgrupoId,
            unidade_medida: newItem.unidadeMedida,
            quantidade: newItem.quantidade || null,
            mais_barato: newItem.maisBarato
          });
        
        if (error) throw error;
        refetchProdutos();
        toast.success('Produto criado com sucesso');
      }

      setShowAddDialog(false);
      setNewItem({
        codigo: '',
        nome: '',
        departamentoId: '',
        grupoId: '',
        subgrupoId: '',
        unidadeMedida: '',
        quantidade: '',
        maisBarato: false
      });
      
    } catch (error: any) {
      console.error('Erro ao criar item:', error);
      const msg = error?.message || '';
      if (msg.includes('produtos_codigo_key')) {
        toast.error(`Já existe um produto com o código '${newItem.codigo.trim()}'. Por favor, use um código diferente.`);
      } else if (msg.includes('duplicate key')) {
        toast.error(`Já existe um item com este código. Por favor, use um código diferente.`);
      } else {
        toast.error(`Erro ao criar item: ${msg || 'Erro desconhecido'}`);
      }
    }
  };

  // Handler genérico para deletar itens
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    try {
      // Verificar se há itens dependentes antes de deletar
      if (itemToDelete.type === 'departamento') {
        const { data: gruposDependentes } = await supabase
          .from('grupos')
          .select('id')
          .eq('departamento_id', itemToDelete.item.id)
          .limit(1);
        
        if (gruposDependentes && gruposDependentes.length > 0) {
          toast.error('Não é possível deletar este departamento pois existem grupos vinculados a ele.');
          return;
        }
      } else if (itemToDelete.type === 'grupo') {
        const { data: subgruposDependentes } = await supabase
          .from('subgrupos')
          .select('id')
          .eq('grupo_id', itemToDelete.item.id)
          .limit(1);
        
        if (subgruposDependentes && subgruposDependentes.length > 0) {
          toast.error('Não é possível deletar este grupo pois existem subgrupos vinculados a ele.');
          return;
        }
      } else if (itemToDelete.type === 'subgrupo') {
        const { data: produtosDependentes } = await supabase
          .from('produtos')
          .select('id')
          .eq('subgrupo_id', itemToDelete.item.id)
          .limit(1);
        
        if (produtosDependentes && produtosDependentes.length > 0) {
          toast.error('Não é possível deletar este subgrupo pois existem produtos vinculados a ele.');
          return;
        }
      }

      const config = {
        'departamento': { table: 'departamentos' as const, name: 'Departamento', refetch: refetchDepartamentos },
        'grupo': { table: 'grupos' as const, name: 'Grupo', refetch: refetchGrupos },
        'subgrupo': { table: 'subgrupos' as const, name: 'Subgrupo', refetch: refetchSubgrupos },
        'produto': { table: 'produtos' as const, name: 'Produto', refetch: refetchProdutos }
      };

      const { table, name, refetch } = config[itemToDelete.type];

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', itemToDelete.item.id);

      if (error) throw error;
      
      toast.success(`${name} deletado com sucesso`);
      setItemToDelete(null);
      
      // Fechar o dialog de edição
      setEditingDepartamento(null);
      setEditingGrupo(null);
      setEditingSubgrupo(null);
      setEditingProduto(null);
      
      // Refetch apropriado
      refetch();
    } catch (error: any) {
      console.error('Erro ao deletar item:', error);
      const errorMessage = error?.message || 'Erro desconhecido ao deletar item';
      toast.error(`Erro ao deletar item: ${errorMessage}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Produtos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize e gerencie os produtos cadastrados no sistema
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {/* Four Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Departamentos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <CardTitle>Departamentos</CardTitle>
              </div>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerms.departamentos}
                onChange={(e) => setSearchTerms({ ...searchTerms, departamentos: e.target.value })}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
            {loadingDepartamentos ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : (
              filteredDepartamentos.map(depto => (
                <div
                  key={depto.id}
                  onClick={() => handleDepartamentoClick(depto.id)}
                  onDoubleClick={() => setEditingDepartamento(depto)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedDepartamento === depto.id 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">{depto.nome}</div>
                  <div className="text-xs opacity-70">{depto.codigo}</div>
                </div>
              ))
            )}
            {!loadingDepartamentos && filteredDepartamentos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum departamento encontrado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Grupos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                <CardTitle>Grupos</CardTitle>
              </div>
            </div>
            {selectedDepartamento && (
              <div className="text-xs text-muted-foreground mt-1">
                {departamentos.find(d => d.id === selectedDepartamento)?.nome}
              </div>
            )}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerms.grupos}
                onChange={(e) => setSearchTerms({ ...searchTerms, grupos: e.target.value })}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
            {loadingGrupos ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : (
              filteredGrupos.map(grupo => (
                <div
                  key={grupo.id}
                  onClick={() => handleGrupoClick(grupo.id)}
                  onDoubleClick={() => setEditingGrupo(grupo)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedGrupo === grupo.id 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">{grupo.nome}</div>
                  <div className="text-xs opacity-70">{grupo.codigo}</div>
                </div>
              ))
            )}
            {!loadingGrupos && !selectedDepartamento && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Selecione um departamento
              </p>
            )}
            {!loadingGrupos && selectedDepartamento && filteredGrupos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum grupo encontrado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Subgrupos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                <CardTitle>Subgrupos</CardTitle>
              </div>
            </div>
            {selectedGrupo && (
              <div className="text-xs text-muted-foreground mt-1">
                {grupos.find(g => g.id === selectedGrupo)?.nome}
              </div>
            )}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerms.subgrupos}
                onChange={(e) => setSearchTerms({ ...searchTerms, subgrupos: e.target.value })}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
            {loadingSubgrupos ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))
            ) : (
              filteredSubgrupos.map(subgrupo => (
                <div
                  key={subgrupo.id}
                  onClick={() => handleSubgrupoClick(subgrupo.id)}
                  onDoubleClick={() => setEditingSubgrupo(subgrupo)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSubgrupo === subgrupo.id 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'hover:bg-accent'
                  }`}
                >
                  <div className="font-medium">{subgrupo.nome}</div>
                  <div className="text-xs opacity-70">{subgrupo.codigo}</div>
                </div>
              ))
            )}
            {!loadingSubgrupos && !selectedGrupo && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Selecione um grupo
              </p>
            )}
            {!loadingSubgrupos && selectedGrupo && filteredSubgrupos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum subgrupo encontrado
              </p>
            )}
          </CardContent>
        </Card>

        {/* Produtos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                <CardTitle>Produtos</CardTitle>
              </div>
            </div>
            {selectedSubgrupo && (
              <div className="text-xs text-muted-foreground mt-1">
                {subgrupos.find(s => s.id === selectedSubgrupo)?.nome}
              </div>
            )}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerms.produtos}
                onChange={(e) => setSearchTerms({ ...searchTerms, produtos: e.target.value })}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto space-y-2">
            {loadingProdutos ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : (
              filteredProdutos.map(produto => (
                <div
                  key={produto.id}
                  onDoubleClick={() => setEditingProduto(produto)}
                  className="p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                >
                  <div className="font-medium">{produto.nome}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {produto.codigo} • {produto.quantidade ? `${produto.quantidade} ` : ''}{produto.unidadeMedida}
                  </div>
                </div>
              ))
            )}
            {!loadingProdutos && !selectedSubgrupo && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Selecione um subgrupo
              </p>
            )}
            {!loadingProdutos && selectedSubgrupo && filteredProdutos.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum produto encontrado
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para Adicionar Item */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoria</Label>
              <Select value={addCategory} onValueChange={(val: any) => setAddCategory(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="departamento">Departamento</SelectItem>
                  <SelectItem value="grupo">Grupo</SelectItem>
                  <SelectItem value="subgrupo">Subgrupo</SelectItem>
                  <SelectItem value="produto">Produto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Código</Label>
              <Input
                value={newItem.codigo}
                onChange={(e) => setNewItem({ ...newItem, codigo: e.target.value })}
                placeholder="Ex: MERC"
              />
            </div>

            <div>
              <Label>Nome</Label>
              <Input
                value={newItem.nome}
                onChange={(e) => setNewItem({ ...newItem, nome: e.target.value })}
                placeholder="Nome do item"
              />
            </div>

            {addCategory === 'grupo' && (
              <div>
                <Label>Departamento</Label>
                <Select value={newItem.departamentoId} onValueChange={(val) => setNewItem({ ...newItem, departamentoId: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departamentos.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {addCategory === 'subgrupo' && (
              <div>
                <Label>Grupo</Label>
                <Select value={newItem.grupoId} onValueChange={(val) => setNewItem({ ...newItem, grupoId: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {grupos.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {addCategory === 'produto' && (
              <>
                <div>
                  <Label>Subgrupo</Label>
                  <Select value={newItem.subgrupoId} onValueChange={(val) => setNewItem({ ...newItem, subgrupoId: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subgrupos.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Quantidade</Label>
                    <Input
                      value={newItem.quantidade}
                      onChange={(e) => setNewItem({ ...newItem, quantidade: e.target.value })}
                      placeholder="Ex: 330"
                    />
                  </div>
                  <div>
                    <Label>Unidade</Label>
                    <Input
                      value={newItem.unidadeMedida}
                      onChange={(e) => setNewItem({ ...newItem, unidadeMedida: e.target.value })}
                      placeholder="Ex: ML"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="mais-barato"
                    checked={newItem.maisBarato}
                    onChange={(e) => setNewItem({ ...newItem, maisBarato: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="mais-barato" className="cursor-pointer">Mais barato</Label>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
              <Button onClick={handleAddItem}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Departamento */}
      <Dialog open={!!editingDepartamento} onOpenChange={() => setEditingDepartamento(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Departamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código</Label>
              <Input
                value={editingDepartamento?.codigo || ''}
                onChange={(e) => setEditingDepartamento(editingDepartamento ? {...editingDepartamento, codigo: e.target.value} : null)}
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={editingDepartamento?.nome || ''}
                onChange={(e) => setEditingDepartamento(editingDepartamento ? {...editingDepartamento, nome: e.target.value} : null)}
              />
            </div>
            <div className="flex justify-between gap-2">
              <Button 
                variant="destructive" 
                onClick={() => editingDepartamento && setItemToDelete({ type: 'departamento', item: editingDepartamento })}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingDepartamento(null)}>Cancelar</Button>
                <Button onClick={handleUpdateDepartamento}>Salvar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Grupo */}
      <Dialog open={!!editingGrupo} onOpenChange={() => setEditingGrupo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código</Label>
              <Input
                value={editingGrupo?.codigo || ''}
                onChange={(e) => setEditingGrupo(editingGrupo ? {...editingGrupo, codigo: e.target.value} : null)}
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={editingGrupo?.nome || ''}
                onChange={(e) => setEditingGrupo(editingGrupo ? {...editingGrupo, nome: e.target.value} : null)}
              />
            </div>
            <div>
              <Label>Departamento</Label>
              <Select 
                value={editingGrupo?.departamentoId || ''} 
                onValueChange={(val) => setEditingGrupo(editingGrupo ? {...editingGrupo, departamentoId: val} : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between gap-2">
              <Button 
                variant="destructive" 
                onClick={() => editingGrupo && setItemToDelete({ type: 'grupo', item: editingGrupo })}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingGrupo(null)}>Cancelar</Button>
                <Button onClick={handleUpdateGrupo}>Salvar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Subgrupo */}
      <Dialog open={!!editingSubgrupo} onOpenChange={() => setEditingSubgrupo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Subgrupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código</Label>
              <Input
                value={editingSubgrupo?.codigo || ''}
                onChange={(e) => setEditingSubgrupo(editingSubgrupo ? {...editingSubgrupo, codigo: e.target.value} : null)}
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={editingSubgrupo?.nome || ''}
                onChange={(e) => setEditingSubgrupo(editingSubgrupo ? {...editingSubgrupo, nome: e.target.value} : null)}
              />
            </div>
            <div>
              <Label>Grupo</Label>
              <Select 
                value={editingSubgrupo?.grupoId || ''} 
                onValueChange={(val) => setEditingSubgrupo(editingSubgrupo ? {...editingSubgrupo, grupoId: val} : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {grupos.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between gap-2">
              <Button 
                variant="destructive" 
                onClick={() => editingSubgrupo && setItemToDelete({ type: 'subgrupo', item: editingSubgrupo })}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingSubgrupo(null)}>Cancelar</Button>
                <Button onClick={handleUpdateSubgrupo}>Salvar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Produto */}
      <Dialog open={!!editingProduto} onOpenChange={() => setEditingProduto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Código</Label>
              <Input
                value={editingProduto?.codigo || ''}
                onChange={(e) => setEditingProduto(editingProduto ? {...editingProduto, codigo: e.target.value} : null)}
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={editingProduto?.nome || ''}
                onChange={(e) => setEditingProduto(editingProduto ? {...editingProduto, nome: e.target.value} : null)}
              />
            </div>
            <div>
              <Label>Subgrupo</Label>
              <Select 
                value={editingProduto?.subgrupoId || ''} 
                onValueChange={(val) => setEditingProduto(editingProduto ? {...editingProduto, subgrupoId: val} : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {subgrupos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Quantidade</Label>
                <Input
                  value={editingProduto?.quantidade || ''}
                  onChange={(e) => setEditingProduto(editingProduto ? {...editingProduto, quantidade: e.target.value} : null)}
                  placeholder="Ex: 330"
                />
              </div>
              <div>
                <Label>Unidade de Medida</Label>
                <Input
                  value={editingProduto?.unidadeMedida || ''}
                  onChange={(e) => setEditingProduto(editingProduto ? {...editingProduto, unidadeMedida: e.target.value} : null)}
                  placeholder="Ex: ML"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-mais-barato"
                checked={editingProduto?.maisBarato || false}
                onChange={(e) => setEditingProduto(editingProduto ? {...editingProduto, maisBarato: e.target.checked} : null)}
                className="w-4 h-4"
              />
              <Label htmlFor="edit-mais-barato" className="cursor-pointer">Mais barato</Label>
            </div>
            <div className="flex justify-between gap-2">
              <Button 
                variant="destructive" 
                onClick={() => editingProduto && setItemToDelete({ type: 'produto', item: editingProduto })}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingProduto(null)}>Cancelar</Button>
                <Button onClick={handleUpdateProduto}>Salvar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Delete */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar {itemToDelete?.type === 'departamento' ? 'o departamento' : 
                itemToDelete?.type === 'grupo' ? 'o grupo' : 
                itemToDelete?.type === 'subgrupo' ? 'o subgrupo' : 
                'o produto'} "{itemToDelete?.item.nome}"? 
              Esta ação não poderá ser desfeita e o item será removido permanentemente do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
