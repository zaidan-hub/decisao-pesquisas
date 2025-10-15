import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building2, FolderOpen, Layers, Package, Plus, X, Save } from 'lucide-react';
import { useProdutos } from '@/hooks/useProdutos';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CustomDepartamento {
  id: string;
  nome: string;
}

interface CustomGrupo {
  id: string;
  nome: string;
  departamentoId: string;
}

interface CustomSubgrupo {
  id: string;
  nome: string;
  grupoId: string;
}

interface ProdutoAlocado {
  id: string;
  produtoId: string;
  subgrupoId: string;
}

interface CriarListaAlteradaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CriarListaAlteradaDialog = ({ open, onOpenChange, onSuccess }: CriarListaAlteradaDialogProps) => {
  const { produtos: produtosReais } = useProdutos();
  
  const [nomeLista, setNomeLista] = useState('');
  const [customDepartamentos, setCustomDepartamentos] = useState<CustomDepartamento[]>([]);
  const [customGrupos, setCustomGrupos] = useState<CustomGrupo[]>([]);
  const [customSubgrupos, setCustomSubgrupo] = useState<CustomSubgrupo[]>([]);
  const [produtosAlocados, setProdutosAlocados] = useState<ProdutoAlocado[]>([]);
  
  const [selectedDepartamento, setSelectedDepartamento] = useState<string | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<string | null>(null);
  const [selectedSubgrupo, setSelectedSubgrupo] = useState<string | null>(null);
  
  const [novoDepartamentoNome, setNovoDepartamentoNome] = useState('');
  const [novoGrupoNome, setNovoGrupoNome] = useState('');
  const [novoGrupoDeptId, setNovoGrupoDeptId] = useState('');
  const [novoSubgrupoNome, setNovoSubgrupoNome] = useState('');
  const [novoSubgrupoGrupoId, setNovoSubgrupoGrupoId] = useState('');
  
  const [searchProdutos, setSearchProdutos] = useState('');

  const handleAddDepartamento = () => {
    if (!novoDepartamentoNome.trim()) {
      toast.error('Digite um nome para o departamento');
      return;
    }
    
    const newDept: CustomDepartamento = {
      id: `dept_${Date.now()}`,
      nome: novoDepartamentoNome.trim()
    };
    
    setCustomDepartamentos(prev => [...prev, newDept]);
    setNovoDepartamentoNome('');
    toast.success('Departamento adicionado');
  };

  const handleAddGrupo = () => {
    if (!novoGrupoNome.trim()) {
      toast.error('Digite um nome para o grupo');
      return;
    }
    
    if (!novoGrupoDeptId) {
      toast.error('Selecione um departamento para o grupo');
      return;
    }
    
    const newGrupo: CustomGrupo = {
      id: `grupo_${Date.now()}`,
      nome: novoGrupoNome.trim(),
      departamentoId: novoGrupoDeptId
    };
    
    setCustomGrupos(prev => [...prev, newGrupo]);
    setNovoGrupoNome('');
    setNovoGrupoDeptId('');
    toast.success('Grupo adicionado');
  };

  const handleAddSubgrupo = () => {
    if (!novoSubgrupoNome.trim()) {
      toast.error('Digite um nome para o subgrupo');
      return;
    }
    
    if (!novoSubgrupoGrupoId) {
      toast.error('Selecione um grupo para o subgrupo');
      return;
    }
    
    const newSubgrupo: CustomSubgrupo = {
      id: `subgrupo_${Date.now()}`,
      nome: novoSubgrupoNome.trim(),
      grupoId: novoSubgrupoGrupoId
    };
    
    setCustomSubgrupo(prev => [...prev, newSubgrupo]);
    setNovoSubgrupoNome('');
    setNovoSubgrupoGrupoId('');
    toast.success('Subgrupo adicionado');
  };

  const handleAddProduto = (produtoId: string) => {
    if (!selectedSubgrupo) {
      toast.error('Selecione um subgrupo primeiro');
      return;
    }
    
    const jaAlocado = produtosAlocados.find(p => p.produtoId === produtoId);
    if (jaAlocado) {
      toast.error('Produto já foi alocado');
      return;
    }
    
    const novoProdutoAlocado: ProdutoAlocado = {
      id: `prod_${Date.now()}`,
      produtoId,
      subgrupoId: selectedSubgrupo
    };
    
    setProdutosAlocados(prev => [...prev, novoProdutoAlocado]);
    toast.success('Produto adicionado');
  };

  const handleRemoveDepartamento = (id: string) => {
    // Remover departamento e tudo que depende dele
    const gruposParaRemover = customGrupos.filter(g => g.departamentoId === id);
    const idsGruposParaRemover = gruposParaRemover.map(g => g.id);
    const subgruposParaRemover = customSubgrupos.filter(s => idsGruposParaRemover.includes(s.grupoId));
    const idsSubgruposParaRemover = subgruposParaRemover.map(s => s.id);
    
    setCustomDepartamentos(prev => prev.filter(d => d.id !== id));
    setCustomGrupos(prev => prev.filter(g => !idsGruposParaRemover.includes(g.id)));
    setCustomSubgrupo(prev => prev.filter(s => !idsSubgruposParaRemover.includes(s.id)));
    setProdutosAlocados(prev => prev.filter(p => !idsSubgruposParaRemover.includes(p.subgrupoId)));
    
    if (selectedDepartamento === id) setSelectedDepartamento(null);
  };

  const handleRemoveGrupo = (id: string) => {
    const subgruposParaRemover = customSubgrupos.filter(s => s.grupoId === id);
    const idsSubgruposParaRemover = subgruposParaRemover.map(s => s.id);
    
    setCustomGrupos(prev => prev.filter(g => g.id !== id));
    setCustomSubgrupo(prev => prev.filter(s => !idsSubgruposParaRemover.includes(s.id)));
    setProdutosAlocados(prev => prev.filter(p => !idsSubgruposParaRemover.includes(p.subgrupoId)));
    
    if (selectedGrupo === id) setSelectedGrupo(null);
  };

  const handleRemoveSubgrupo = (id: string) => {
    setCustomSubgrupo(prev => prev.filter(s => s.id !== id));
    setProdutosAlocados(prev => prev.filter(p => p.subgrupoId !== id));
    
    if (selectedSubgrupo === id) setSelectedSubgrupo(null);
  };

  const handleRemoveProduto = (id: string) => {
    setProdutosAlocados(prev => prev.filter(p => p.id !== id));
  };

  const handleSave = async () => {
    if (!nomeLista.trim()) {
      toast.error('Digite um nome para a lista');
      return;
    }

    if (customDepartamentos.length === 0) {
      toast.error('Crie pelo menos um departamento');
      return;
    }

    if (customGrupos.length === 0) {
      toast.error('Crie pelo menos um grupo');
      return;
    }

    if (customSubgrupos.length === 0) {
      toast.error('Crie pelo menos um subgrupo');
      return;
    }

    if (produtosAlocados.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }

    try {
      // Montar a estrutura de hierarquia customizada
      const hierarquiaCustomizada = {
        departamentos: {} as { [id: string]: string },
        grupos: {} as { [id: string]: string },
        subgrupos: {} as { [id: string]: string }
      };

      // Como é lista alterada, vamos criar IDs fictícios mas consistentes
      customDepartamentos.forEach(dept => {
        hierarquiaCustomizada.departamentos[dept.id] = dept.nome;
      });

      customGrupos.forEach(grupo => {
        hierarquiaCustomizada.grupos[grupo.id] = grupo.nome;
      });

      customSubgrupos.forEach(subgrupo => {
        hierarquiaCustomizada.subgrupos[subgrupo.id] = subgrupo.nome;
      });

      // Produtos são os IDs reais dos produtos alocados
      const produtosIds = produtosAlocados.map(p => p.produtoId);

      const listaData = {
        nome: nomeLista.trim(),
        produtos: produtosIds,
        hierarquia_customizada: hierarquiaCustomizada
      };

      const { error } = await supabase
        .from('listas')
        .insert([listaData]);

      if (error) throw error;

      toast.success('Lista alterada criada com sucesso!');
      onSuccess();
      handleReset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar lista:', error);
      toast.error('Erro ao salvar lista');
    }
  };

  const handleReset = () => {
    setNomeLista('');
    setCustomDepartamentos([]);
    setCustomGrupos([]);
    setCustomSubgrupo([]);
    setProdutosAlocados([]);
    setSelectedDepartamento(null);
    setSelectedGrupo(null);
    setSelectedSubgrupo(null);
    setNovoDepartamentoNome('');
    setNovoGrupoNome('');
    setNovoGrupoDeptId('');
    setNovoSubgrupoNome('');
    setNovoSubgrupoGrupoId('');
    setSearchProdutos('');
  };

  const gruposFiltrados = selectedDepartamento
    ? customGrupos.filter(g => g.departamentoId === selectedDepartamento)
    : customGrupos;

  const subgruposFiltrados = selectedGrupo
    ? customSubgrupos.filter(s => s.grupoId === selectedGrupo)
    : customSubgrupos;

  const produtosNoSubgrupo = selectedSubgrupo
    ? produtosAlocados.filter(p => p.subgrupoId === selectedSubgrupo)
    : [];

  const produtosDisponiveis = produtosReais.filter(p => 
    p.nome.toLowerCase().includes(searchProdutos.toLowerCase()) &&
    !produtosAlocados.find(pa => pa.produtoId === p.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Criar Lista Alterada</DialogTitle>
          <DialogDescription>
            Crie sua própria hierarquia de departamentos, grupos e subgrupos e aloque produtos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <Label htmlFor="nomeLista">Nome da Lista *</Label>
            <Input
              id="nomeLista"
              value={nomeLista}
              onChange={(e) => setNomeLista(e.target.value)}
              placeholder="Digite o nome da lista"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 overflow-hidden">
            {/* Departamentos */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  <CardTitle className="text-base">Departamentos</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
                <div className="space-y-2">
                  <Input
                    placeholder="Nome do departamento"
                    value={novoDepartamentoNome}
                    onChange={(e) => setNovoDepartamentoNome(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDepartamento())}
                  />
                  <Button type="button" size="sm" onClick={handleAddDepartamento} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {customDepartamentos.map(dept => (
                      <div
                        key={dept.id}
                        onClick={() => setSelectedDepartamento(dept.id)}
                        className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                          selectedDepartamento === dept.id 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'hover:bg-accent'
                        }`}
                      >
                        <span className="text-sm font-medium">{dept.nome}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveDepartamento(dept.id);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Grupos */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5" />
                  <CardTitle className="text-base">Grupos</CardTitle>
                </div>
                {selectedDepartamento && (
                  <div className="text-xs text-muted-foreground">
                    {customDepartamentos.find(d => d.id === selectedDepartamento)?.nome}
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
                <div className="space-y-2">
                  <Input
                    placeholder="Nome do grupo"
                    value={novoGrupoNome}
                    onChange={(e) => setNovoGrupoNome(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddGrupo())}
                  />
                  <Select value={novoGrupoDeptId} onValueChange={setNovoGrupoDeptId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {customDepartamentos.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleAddGrupo} 
                    className="w-full"
                    disabled={customDepartamentos.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {gruposFiltrados.map(grupo => (
                      <div
                        key={grupo.id}
                        onClick={() => setSelectedGrupo(grupo.id)}
                        className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                          selectedGrupo === grupo.id 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'hover:bg-accent'
                        }`}
                      >
                        <span className="text-sm font-medium">{grupo.nome}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveGrupo(grupo.id);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Subgrupos */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  <CardTitle className="text-base">Subgrupos</CardTitle>
                </div>
                {selectedGrupo && (
                  <div className="text-xs text-muted-foreground">
                    {customGrupos.find(g => g.id === selectedGrupo)?.nome}
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
                <div className="space-y-2">
                  <Input
                    placeholder="Nome do subgrupo"
                    value={novoSubgrupoNome}
                    onChange={(e) => setNovoSubgrupoNome(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubgrupo())}
                  />
                  <Select value={novoSubgrupoGrupoId} onValueChange={setNovoSubgrupoGrupoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {customGrupos.map(grupo => (
                        <SelectItem key={grupo.id} value={grupo.id}>
                          {grupo.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    type="button" 
                    size="sm" 
                    onClick={handleAddSubgrupo} 
                    className="w-full"
                    disabled={customGrupos.length === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-2">
                    {subgruposFiltrados.map(subgrupo => (
                      <div
                        key={subgrupo.id}
                        onClick={() => setSelectedSubgrupo(subgrupo.id)}
                        className={`p-2 rounded border cursor-pointer flex items-center justify-between transition-colors ${
                          selectedSubgrupo === subgrupo.id 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'hover:bg-accent'
                        }`}
                      >
                        <span className="text-sm font-medium">{subgrupo.nome}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSubgrupo(subgrupo.id);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Produtos */}
            <Card className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  <CardTitle className="text-base">Produtos</CardTitle>
                </div>
                {selectedSubgrupo && (
                  <div className="text-xs text-muted-foreground">
                    {customSubgrupos.find(s => s.id === selectedSubgrupo)?.nome}
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtos..."
                    value={searchProdutos}
                    onChange={(e) => setSearchProdutos(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {selectedSubgrupo && (
                  <>
                    <div className="text-xs font-medium text-muted-foreground">
                      Produtos alocados ({produtosNoSubgrupo.length})
                    </div>
                    <ScrollArea className="max-h-32">
                      <div className="space-y-1">
                        {produtosNoSubgrupo.map(pa => {
                          const produto = produtosReais.find(p => p.id === pa.produtoId);
                          if (!produto) return null;
                          return (
                            <div
                              key={pa.id}
                              className="p-2 rounded border bg-accent flex items-center justify-between text-xs"
                            >
                              <span>{produto.nome}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveProduto(pa.id)}
                                className="h-5 w-5 p-0"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </>
                )}
                
                <div className="text-xs font-medium text-muted-foreground">
                  Adicionar produtos
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-1">
                    {produtosDisponiveis.map(produto => (
                      <div
                        key={produto.id}
                        onClick={() => handleAddProduto(produto.id)}
                        className="p-2 rounded border cursor-pointer hover:bg-accent transition-colors text-xs"
                      >
                        <div className="font-medium">{produto.nome}</div>
                        <div className="text-muted-foreground">{produto.codigo}</div>
                      </div>
                    ))}
                    {produtosDisponiveis.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        {searchProdutos ? 'Nenhum produto encontrado' : 'Todos os produtos foram alocados'}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Lista
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
