import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Grupo, Subgrupo, Produto } from '@/types';
import { Search, Package, Layers, FolderOpen } from 'lucide-react';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ProdutosPage = () => {
  // Buscar dados do banco
  const { grupos, loading: loadingGrupos } = useGrupos();
  const { subgrupos, loading: loadingSubgrupos } = useSubgrupos();
  const { produtos, loading: loadingProdutos } = useProdutos();

  const [selectedGrupo, setSelectedGrupo] = useState<string | null>(null);
  const [selectedSubgrupo, setSelectedSubgrupo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'grupos' | 'subgrupos' | 'produtos'>('grupos');
  
  const [searchTerms, setSearchTerms] = useState({
    grupos: '',
    subgrupos: '',
    produtos: ''
  });

  // Estados para edição
  const [editingGrupo, setEditingGrupo] = useState<Grupo | null>(null);
  const [editingSubgrupo, setEditingSubgrupo] = useState<Subgrupo | null>(null);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);

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

  // Handlers
  const handleGrupoClick = (grupoId: string) => {
    if (selectedGrupo === grupoId) {
      setSelectedGrupo(null);
      setActiveTab('grupos');
    } else {
      setSelectedGrupo(grupoId);
      setSelectedSubgrupo(null);
      setActiveTab('subgrupos');
    }
  };

  const handleSubgrupoClick = (subgrupoId: string) => {
    if (selectedSubgrupo === subgrupoId) {
      setSelectedSubgrupo(null);
      setActiveTab('subgrupos');
    } else {
      setSelectedSubgrupo(subgrupoId);
      setActiveTab('produtos');
    }
  };

  // Handlers de edição
  const handleUpdateGrupo = async () => {
    if (!editingGrupo) return;
    
    try {
      const { error } = await supabase
        .from('grupos')
        .update({ nome: editingGrupo.nome, codigo: editingGrupo.codigo })
        .eq('id', editingGrupo.id);

      if (error) throw error;
      
      toast.success('Grupo atualizado com sucesso');
      setEditingGrupo(null);
      window.location.reload();
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
        .update({ nome: editingSubgrupo.nome, codigo: editingSubgrupo.codigo })
        .eq('id', editingSubgrupo.id);

      if (error) throw error;
      
      toast.success('Subgrupo atualizado com sucesso');
      setEditingSubgrupo(null);
      window.location.reload();
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
          unidade_medida: editingProduto.unidadeMedida
        })
        .eq('id', editingProduto.id);

      if (error) throw error;
      
      toast.success('Produto atualizado com sucesso');
      setEditingProduto(null);
      window.location.reload();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error('Erro ao atualizar produto');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Produtos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Visualize os produtos cadastrados no sistema
          </p>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grupos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                <CardTitle>Grupos</CardTitle>
              </div>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar grupo..."
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
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{grupo.nome}</div>
                      <div className="text-xs opacity-70">{grupo.codigo}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {!loadingGrupos && filteredGrupos.length === 0 && (
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
                placeholder="Buscar subgrupo..."
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
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{subgrupo.nome}</div>
                      <div className="text-xs opacity-70">{subgrupo.codigo}</div>
                    </div>
                  </div>
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
                placeholder="Buscar produto..."
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
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{produto.nome}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {produto.codigo} • {produto.unidadeMedida}
                      </div>
                    </div>
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

      {/* Dialog de Edição de Grupo */}
      <Dialog open={!!editingGrupo} onOpenChange={() => setEditingGrupo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="grupo-codigo">Código</Label>
              <Input
                id="grupo-codigo"
                value={editingGrupo?.codigo || ''}
                onChange={(e) => setEditingGrupo(editingGrupo ? {...editingGrupo, codigo: e.target.value} : null)}
              />
            </div>
            <div>
              <Label htmlFor="grupo-nome">Nome</Label>
              <Input
                id="grupo-nome"
                value={editingGrupo?.nome || ''}
                onChange={(e) => setEditingGrupo(editingGrupo ? {...editingGrupo, nome: e.target.value} : null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingGrupo(null)}>Cancelar</Button>
              <Button onClick={handleUpdateGrupo}>Salvar</Button>
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
              <Label htmlFor="subgrupo-codigo">Código</Label>
              <Input
                id="subgrupo-codigo"
                value={editingSubgrupo?.codigo || ''}
                onChange={(e) => setEditingSubgrupo(editingSubgrupo ? {...editingSubgrupo, codigo: e.target.value} : null)}
              />
            </div>
            <div>
              <Label htmlFor="subgrupo-nome">Nome</Label>
              <Input
                id="subgrupo-nome"
                value={editingSubgrupo?.nome || ''}
                onChange={(e) => setEditingSubgrupo(editingSubgrupo ? {...editingSubgrupo, nome: e.target.value} : null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingSubgrupo(null)}>Cancelar</Button>
              <Button onClick={handleUpdateSubgrupo}>Salvar</Button>
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
              <Label htmlFor="produto-codigo">Código</Label>
              <Input
                id="produto-codigo"
                value={editingProduto?.codigo || ''}
                onChange={(e) => setEditingProduto(editingProduto ? {...editingProduto, codigo: e.target.value} : null)}
              />
            </div>
            <div>
              <Label htmlFor="produto-nome">Nome</Label>
              <Input
                id="produto-nome"
                value={editingProduto?.nome || ''}
                onChange={(e) => setEditingProduto(editingProduto ? {...editingProduto, nome: e.target.value} : null)}
              />
            </div>
            <div>
              <Label htmlFor="produto-unidade">Unidade de Medida</Label>
              <Input
                id="produto-unidade"
                value={editingProduto?.unidadeMedida || ''}
                onChange={(e) => setEditingProduto(editingProduto ? {...editingProduto, unidadeMedida: e.target.value} : null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingProduto(null)}>Cancelar</Button>
              <Button onClick={handleUpdateProduto}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
