import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lista } from '@/types';
import { Plus, Search, Edit, Trash2, Copy, List, ChevronRight, ChevronDown, ArrowUp, ArrowDown, X, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from '@/hooks/use-toast';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { useListas } from '@/hooks/useListas';
import { supabase } from '@/integrations/supabase/client';

type VisualizacaoItem = {
  tipo: 'departamento' | 'grupo' | 'subgrupo' | 'produto';
  id: string;
  nome: string;
  parentId?: string;
};

export const ListasPage = () => {
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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [visualizacaoItems, setVisualizacaoItems] = useState<VisualizacaoItem[]>([]);
  const [expandedVisualizacaoDepts, setExpandedVisualizacaoDepts] = useState<Set<string>>(new Set());
  const [expandedVisualizacaoGrupos, setExpandedVisualizacaoGrupos] = useState<Set<string>>(new Set());
  const [expandedVisualizacaoSubgrupos, setExpandedVisualizacaoSubgrupos] = useState<Set<string>>(new Set());
  const [deleteCategory, setDeleteCategory] = useState<{ tipo: 'departamento' | 'grupo' | 'subgrupo'; id: string; nome: string } | null>(null);
  const [vizSearchTerm, setVizSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    produtos: [] as string[],
    hierarquiaCustomizada: undefined as Lista['hierarquiaCustomizada']
  });

  const resetForm = () => {
    setFormData({
      nome: '',
      produtos: [],
      hierarquiaCustomizada: undefined
    });
    setSelectedItems(new Set());
    setVisualizacaoItems([]);
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
      // Usar produtos da visualização
      const produtosFinais = visualizacaoItems
        .filter(item => item.tipo === 'produto')
        .map(item => item.id);

      // Criar hierarquia customizada baseada na ordem de visualização
      const hierarquiaCustomizada = {
        ordem: visualizacaoItems.map(item => ({
          produtoId: item.id,
          parentId: item.parentId,
          tipo: item.tipo
        }))
      };

      const listaData: any = {
        nome: formData.nome,
        produtos: produtosFinais,
        hierarquia_customizada: hierarquiaCustomizada
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
      produtos: [...lista.produtos],
      hierarquiaCustomizada: lista.hierarquiaCustomizada
    });
    
    const items: VisualizacaoItem[] = lista.produtos.map(produtoId => {
      const produto = produtos.find(p => p.id === produtoId);
      if (produto) {
        return {
          tipo: 'produto' as const,
          id: produto.id,
          nome: produto.nome,
          parentId: produto.subgrupoId
        };
      }
      return null;
    }).filter(Boolean) as VisualizacaoItem[];
    
    setVisualizacaoItems(items);
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

  const handleSelectItem = (tipo: string, id: string) => {
    const itemKey = `${tipo}:${id}`;
    const newSelected = new Set(selectedItems);
    
    if (newSelected.has(itemKey)) {
      // Desmarcar - remover o item e todos seus subitens
      newSelected.delete(itemKey);
      
      if (tipo === 'departamento') {
        const gruposDoDept = grupos.filter(g => g.departamentoId === id);
        gruposDoDept.forEach(grupo => {
          newSelected.delete(`grupo:${grupo.id}`);
          const subgruposDoGrupo = subgrupos.filter(s => s.grupoId === grupo.id);
          subgruposDoGrupo.forEach(subgrupo => {
            newSelected.delete(`subgrupo:${subgrupo.id}`);
            const produtosDoSubgrupo = produtos.filter(p => p.subgrupoId === subgrupo.id);
            produtosDoSubgrupo.forEach(produto => {
              newSelected.delete(`produto:${produto.id}`);
            });
          });
        });
      } else if (tipo === 'grupo') {
        const subgruposDoGrupo = subgrupos.filter(s => s.grupoId === id);
        subgruposDoGrupo.forEach(subgrupo => {
          newSelected.delete(`subgrupo:${subgrupo.id}`);
          const produtosDoSubgrupo = produtos.filter(p => p.subgrupoId === subgrupo.id);
          produtosDoSubgrupo.forEach(produto => {
            newSelected.delete(`produto:${produto.id}`);
          });
        });
      } else if (tipo === 'subgrupo') {
        const produtosDoSubgrupo = produtos.filter(p => p.subgrupoId === id);
        produtosDoSubgrupo.forEach(produto => {
          newSelected.delete(`produto:${produto.id}`);
        });
      }
    } else {
      // Marcar - adicionar o item e todos seus subitens
      newSelected.add(itemKey);
      
      if (tipo === 'departamento') {
        const gruposDoDept = grupos.filter(g => g.departamentoId === id);
        gruposDoDept.forEach(grupo => {
          newSelected.add(`grupo:${grupo.id}`);
          const subgruposDoGrupo = subgrupos.filter(s => s.grupoId === grupo.id);
          subgruposDoGrupo.forEach(subgrupo => {
            newSelected.add(`subgrupo:${subgrupo.id}`);
            const produtosDoSubgrupo = produtos.filter(p => p.subgrupoId === subgrupo.id);
            produtosDoSubgrupo.forEach(produto => {
              newSelected.add(`produto:${produto.id}`);
            });
          });
        });
      } else if (tipo === 'grupo') {
        const subgruposDoGrupo = subgrupos.filter(s => s.grupoId === id);
        subgruposDoGrupo.forEach(subgrupo => {
          newSelected.add(`subgrupo:${subgrupo.id}`);
          const produtosDoSubgrupo = produtos.filter(p => p.subgrupoId === subgrupo.id);
          produtosDoSubgrupo.forEach(produto => {
            newSelected.add(`produto:${produto.id}`);
          });
        });
      } else if (tipo === 'subgrupo') {
        const produtosDoSubgrupo = produtos.filter(p => p.subgrupoId === id);
        produtosDoSubgrupo.forEach(produto => {
          newSelected.add(`produto:${produto.id}`);
        });
      }
    }
    
    setSelectedItems(newSelected);
  };

  const handleAdicionarItem = () => {
    if (selectedItems.size === 0) return;

    const novosItems: VisualizacaoItem[] = [];

    selectedItems.forEach(itemKey => {
      const [tipo, id] = itemKey.split(':');

      if (tipo === 'produto') {
        const produto = produtos.find(p => p.id === id);
        if (produto && !visualizacaoItems.some(i => i.id === id)) {
          novosItems.push({
            tipo: 'produto',
            id: produto.id,
            nome: produto.nome,
            parentId: produto.subgrupoId
          });
        }
      }
    });

    if (novosItems.length === 0) {
      setSelectedItems(new Set());
      return;
    }

    // Inserir cada novo produto logo após o último item do mesmo subgrupo (parentId).
    // Se nenhum item do mesmo subgrupo existir, vai para o final.
    setVisualizacaoItems(prev => {
      const result = [...prev];
      novosItems.forEach(novo => {
        let ultimoIdxMesmoSubgrupo = -1;
        for (let i = result.length - 1; i >= 0; i--) {
          if (result[i].parentId === novo.parentId) {
            ultimoIdxMesmoSubgrupo = i;
            break;
          }
        }
        if (ultimoIdxMesmoSubgrupo >= 0) {
          result.splice(ultimoIdxMesmoSubgrupo + 1, 0, novo);
        } else {
          result.push(novo);
        }
      });
      return result;
    });

    setSelectedItems(new Set());
  };

  const handleMoverItem = (index: number, direcao: 'up' | 'down', indicesSubgrupo?: number[]) => {
    const newItems = [...visualizacaoItems];

    if (indicesSubgrupo && indicesSubgrupo.length > 0) {
      const posicaoNoSubgrupo = indicesSubgrupo.indexOf(index);
      if (posicaoNoSubgrupo === -1) return;

      if (direcao === 'up' && posicaoNoSubgrupo > 0) {
        const targetIndex = indicesSubgrupo[posicaoNoSubgrupo - 1];
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        setVisualizacaoItems(newItems);
      } else if (direcao === 'down' && posicaoNoSubgrupo < indicesSubgrupo.length - 1) {
        const targetIndex = indicesSubgrupo[posicaoNoSubgrupo + 1];
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        setVisualizacaoItems(newItems);
      }

      return;
    }

    if (direcao === 'up' && index > 0) {
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
      setVisualizacaoItems(newItems);
    } else if (direcao === 'down' && index < newItems.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      setVisualizacaoItems(newItems);
    }
  };

  const handleMoverSubgrupo = (subgrupoId: string, direcao: 'up' | 'down') => {
    const newItems = [...visualizacaoItems];
    
    // Encontrar todos os produtos deste subgrupo
    const blocoAtual = newItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.parentId === subgrupoId);
    
    if (blocoAtual.length === 0) return;
    
    const primeiroIdx = blocoAtual[0].idx;
    const ultimoIdx = blocoAtual[blocoAtual.length - 1].idx;
    
    // Identificar bloco adjacente
    let blocoAdjacente;
    if (direcao === 'up' && primeiroIdx > 0) {
      const itemAnterior = newItems[primeiroIdx - 1];
      const subgrupoAnteriorId = itemAnterior.parentId;
      
      if (subgrupoAnteriorId === subgrupoId) return;
      
      blocoAdjacente = newItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.parentId === subgrupoAnteriorId);
    } else if (direcao === 'down' && ultimoIdx < newItems.length - 1) {
      const itemSeguinte = newItems[ultimoIdx + 1];
      const subgrupoSegId = itemSeguinte.parentId;
      
      if (subgrupoSegId === subgrupoId) return;
      
      blocoAdjacente = newItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => item.parentId === subgrupoSegId);
    }
    
    if (!blocoAdjacente || blocoAdjacente.length === 0) return;
    
    // Reconstruir array com blocos trocados
    const primeiroIdxAdjacente = blocoAdjacente[0].idx;
    const ultimoIdxAdjacente = blocoAdjacente[blocoAdjacente.length - 1].idx;
    
    const inicio = Math.min(primeiroIdx, primeiroIdxAdjacente);
    const fim = Math.max(ultimoIdx, ultimoIdxAdjacente);
    
    const antes = newItems.slice(0, inicio);
    const depois = newItems.slice(fim + 1);
    
    const itemsAtual = blocoAtual.map(({ item }) => item);
    const itemsAdjacente = blocoAdjacente.map(({ item }) => item);
    
    let novoArray;
    if (direcao === 'up') {
      novoArray = [...antes, ...itemsAtual, ...itemsAdjacente, ...depois];
    } else {
      novoArray = [...antes, ...itemsAdjacente, ...itemsAtual, ...depois];
    }
    
    setVisualizacaoItems(novoArray);
  };

  const handleMoverGrupo = (grupoId: string, direcao: 'up' | 'down') => {
    const newItems = [...visualizacaoItems];
    
    // Encontrar todos os subgrupos deste grupo
    const subgruposDoGrupo = subgrupos.filter(s => s.grupoId === grupoId).map(s => s.id);
    
    // Encontrar todos os produtos destes subgrupos (bloco atual)
    const blocoAtual = newItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => subgruposDoGrupo.includes(item.parentId || ''));
    
    if (blocoAtual.length === 0) return;
    
    const primeiroIdx = blocoAtual[0].idx;
    const ultimoIdx = blocoAtual[blocoAtual.length - 1].idx;
    
    // Identificar bloco adjacente
    let blocoAdjacente;
    if (direcao === 'up' && primeiroIdx > 0) {
      const itemAnterior = newItems[primeiroIdx - 1];
      const subgrupoAnteriorId = itemAnterior.parentId;
      const grupoAnterior = subgrupos.find(s => s.id === subgrupoAnteriorId);
      
      if (!grupoAnterior || grupoAnterior.grupoId === grupoId) return;
      
      // Encontrar todos os subgrupos do grupo anterior
      const subgruposGrupoAnterior = subgrupos.filter(s => s.grupoId === grupoAnterior.grupoId).map(s => s.id);
      
      // Encontrar todos os produtos do grupo anterior
      blocoAdjacente = newItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => subgruposGrupoAnterior.includes(item.parentId || ''));
    } else if (direcao === 'down' && ultimoIdx < newItems.length - 1) {
      const itemSeguinte = newItems[ultimoIdx + 1];
      const subgrupoSegId = itemSeguinte.parentId;
      const grupoSeguinte = subgrupos.find(s => s.id === subgrupoSegId);
      
      if (!grupoSeguinte || grupoSeguinte.grupoId === grupoId) return;
      
      // Encontrar todos os subgrupos do grupo seguinte
      const subgruposGrupoSeguinte = subgrupos.filter(s => s.grupoId === grupoSeguinte.grupoId).map(s => s.id);
      
      // Encontrar todos os produtos do grupo seguinte
      blocoAdjacente = newItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => subgruposGrupoSeguinte.includes(item.parentId || ''));
    }
    
    if (!blocoAdjacente || blocoAdjacente.length === 0) return;
    
    // Reconstruir array com blocos trocados
    const primeiroIdxAdjacente = blocoAdjacente[0].idx;
    const ultimoIdxAdjacente = blocoAdjacente[blocoAdjacente.length - 1].idx;
    
    const inicio = Math.min(primeiroIdx, primeiroIdxAdjacente);
    const fim = Math.max(ultimoIdx, ultimoIdxAdjacente);
    
    const antes = newItems.slice(0, inicio);
    const depois = newItems.slice(fim + 1);
    
    const itemsAtual = blocoAtual.map(({ item }) => item);
    const itemsAdjacente = blocoAdjacente.map(({ item }) => item);
    
    let novoArray;
    if (direcao === 'up') {
      novoArray = [...antes, ...itemsAtual, ...itemsAdjacente, ...depois];
    } else {
      novoArray = [...antes, ...itemsAdjacente, ...itemsAtual, ...depois];
    }
    
    setVisualizacaoItems(novoArray);
  };

  const handleMoverDepartamento = (departamentoId: string, direcao: 'up' | 'down') => {
    const newItems = [...visualizacaoItems];
    
    // Encontrar todos os grupos deste departamento
    const gruposDoDepartamento = grupos.filter(g => g.departamentoId === departamentoId).map(g => g.id);
    
    // Encontrar todos os subgrupos destes grupos
    const subgruposDoDepartamento = subgrupos
      .filter(s => gruposDoDepartamento.includes(s.grupoId))
      .map(s => s.id);
    
    // Encontrar todos os produtos destes subgrupos (bloco atual)
    const blocoAtual = newItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => subgruposDoDepartamento.includes(item.parentId || ''));
    
    if (blocoAtual.length === 0) return;
    
    const primeiroIdx = blocoAtual[0].idx;
    const ultimoIdx = blocoAtual[blocoAtual.length - 1].idx;
    
    // Identificar bloco adjacente
    let blocoAdjacente;
    if (direcao === 'up' && primeiroIdx > 0) {
      const itemAnterior = newItems[primeiroIdx - 1];
      const subgrupoAnteriorId = itemAnterior.parentId;
      const grupoAnterior = subgrupos.find(s => s.id === subgrupoAnteriorId);
      const deptAnterior = grupoAnterior ? grupos.find(g => g.id === grupoAnterior.grupoId) : null;
      
      if (!deptAnterior || deptAnterior.departamentoId === departamentoId) return;
      
      // Encontrar todos os grupos do departamento anterior
      const gruposDeptAnterior = grupos.filter(g => g.departamentoId === deptAnterior.departamentoId).map(g => g.id);
      
      // Encontrar todos os subgrupos do departamento anterior
      const subgruposDeptAnterior = subgrupos
        .filter(s => gruposDeptAnterior.includes(s.grupoId))
        .map(s => s.id);
      
      // Encontrar todos os produtos do departamento anterior
      blocoAdjacente = newItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => subgruposDeptAnterior.includes(item.parentId || ''));
    } else if (direcao === 'down' && ultimoIdx < newItems.length - 1) {
      const itemSeguinte = newItems[ultimoIdx + 1];
      const subgrupoSegId = itemSeguinte.parentId;
      const grupoSeguinte = subgrupos.find(s => s.id === subgrupoSegId);
      const deptSeguinte = grupoSeguinte ? grupos.find(g => g.id === grupoSeguinte.grupoId) : null;
      
      if (!deptSeguinte || deptSeguinte.departamentoId === departamentoId) return;
      
      // Encontrar todos os grupos do departamento seguinte
      const gruposDeptSeguinte = grupos.filter(g => g.departamentoId === deptSeguinte.departamentoId).map(g => g.id);
      
      // Encontrar todos os subgrupos do departamento seguinte
      const subgruposDeptSeguinte = subgrupos
        .filter(s => gruposDeptSeguinte.includes(s.grupoId))
        .map(s => s.id);
      
      // Encontrar todos os produtos do departamento seguinte
      blocoAdjacente = newItems
        .map((item, idx) => ({ item, idx }))
        .filter(({ item }) => subgruposDeptSeguinte.includes(item.parentId || ''));
    }
    
    if (!blocoAdjacente || blocoAdjacente.length === 0) return;
    
    // Reconstruir array com blocos trocados
    const primeiroIdxAdjacente = blocoAdjacente[0].idx;
    const ultimoIdxAdjacente = blocoAdjacente[blocoAdjacente.length - 1].idx;
    
    const inicio = Math.min(primeiroIdx, primeiroIdxAdjacente);
    const fim = Math.max(ultimoIdx, ultimoIdxAdjacente);
    
    const antes = newItems.slice(0, inicio);
    const depois = newItems.slice(fim + 1);
    
    const itemsAtual = blocoAtual.map(({ item }) => item);
    const itemsAdjacente = blocoAdjacente.map(({ item }) => item);
    
    let novoArray;
    if (direcao === 'up') {
      novoArray = [...antes, ...itemsAtual, ...itemsAdjacente, ...depois];
    } else {
      novoArray = [...antes, ...itemsAdjacente, ...itemsAtual, ...depois];
    }
    
    setVisualizacaoItems(novoArray);
  };

  const handleRemoverItem = (index: number) => {
    setVisualizacaoItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoverCategoria = () => {
    if (!deleteCategory) return;

    const { tipo, id } = deleteCategory;
    
    if (tipo === 'subgrupo') {
      setVisualizacaoItems(prev => prev.filter(item => item.parentId !== id));
    } else if (tipo === 'grupo') {
      const subgruposDoGrupo = subgrupos.filter(s => s.grupoId === id).map(s => s.id);
      setVisualizacaoItems(prev => prev.filter(item => !subgruposDoGrupo.includes(item.parentId || '')));
    } else if (tipo === 'departamento') {
      const gruposDoDept = grupos.filter(g => g.departamentoId === id).map(g => g.id);
      const subgruposDoDept = subgrupos.filter(s => gruposDoDept.includes(s.grupoId)).map(s => s.id);
      setVisualizacaoItems(prev => prev.filter(item => !subgruposDoDept.includes(item.parentId || '')));
    }
    
    setDeleteCategory(null);
    toast({
      title: "Removido",
      description: `${deleteCategory.tipo.charAt(0).toUpperCase() + deleteCategory.tipo.slice(1)} e seus produtos foram removidos da lista.`
    });
  };

  const filteredListas = listas
    .filter(l => l.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const getProdutoNome = (id: string) => {
    return produtos.find(p => p.id === id)?.nome || 'N/A';
  };

  const buildDepartamentoHierarchy = () => {
    const searchLower = productSearchTerm.toLowerCase().trim();
    const produtosAdicionados = new Set(visualizacaoItems.map(i => i.id));
    
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
      const deptMatches = !searchLower || departamento.nome.toLowerCase().includes(searchLower);
      const gruposNoDepartamento = grupos.filter(g => g.departamentoId === departamento.id);
      
      const gruposWithData = gruposNoDepartamento.map(grupo => {
        const grupoMatches = !searchLower || grupo.nome.toLowerCase().includes(searchLower);
        const subgruposNoGrupo = subgrupos.filter(s => s.grupoId === grupo.id);
        const subgruposWithProducts = subgruposNoGrupo
          .map(subgrupo => {
            const subgrupoMatches = !searchLower || subgrupo.nome.toLowerCase().includes(searchLower);
            
            const produtosFiltrados = produtos
              .filter(p => {
                if (p.subgrupoId !== subgrupo.id) return false;
                if (produtosAdicionados.has(p.id)) return false;
                if (!searchLower) return true;
                
                if (deptMatches || grupoMatches || subgrupoMatches) return true;
                
                return (
                  p.nome.toLowerCase().includes(searchLower) ||
                  p.codigo.toLowerCase().includes(searchLower)
                );
              })
              .map(p => ({
                id: p.id,
                nome: p.nome,
                codigo: p.codigo,
                unidade: p.unidadeMedida
              }));
            
            return {
              id: subgrupo.id,
              nome: subgrupo.nome,
              produtos: produtosFiltrados
            };
          })
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

  const handleExportarPDF = (lista: Lista) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(lista.nome, pageWidth / 2, 20, { align: 'center' });
    
    // Data de geração
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });
    
    // Ordenar produtos conforme hierarquia customizada (Visualização do Pesquisador)
    let produtosOrdenados: Array<{ id: string; nome: string; codigo: string; unidade: string; quantidade: string }> = [];
    
    // Construir mapa de produtos para lookup eficiente
    const produtosMap = new Map(produtos.map(p => [p.id, p]));

    const pushProduto = (produtoId: string) => {
      const produto = produtosMap.get(produtoId);
      if (produto) {
        produtosOrdenados.push({
          id: produto.id,
          nome: produto.nome,
          codigo: produto.codigo,
          unidade: produto.unidadeMedida,
          quantidade: produto.quantidade || ''
        });
      }
    };

    const hierarquia = lista.hierarquiaCustomizada as any;
    const ordem = hierarquia?.ordem;
    const idsJaAdicionados = new Set<string>();

    if (Array.isArray(ordem) && ordem.length > 0) {
      // Usar ordem customizada da Visualização do Pesquisador
      ordem.forEach((item: { produtoId?: string; tipo?: string }) => {
        if (item?.tipo === 'produto' && item.produtoId && !idsJaAdicionados.has(item.produtoId)) {
          idsJaAdicionados.add(item.produtoId);
          pushProduto(item.produtoId);
        }
      });
      // Garantir que produtos da lista que não estejam na ordem (caso raro) sejam incluídos no final
      (lista.produtos || []).forEach(produtoId => {
        if (!idsJaAdicionados.has(produtoId)) {
          idsJaAdicionados.add(produtoId);
          pushProduto(produtoId);
        }
      });
    } else {
      // Fallback: usar ordem do array de produtos (preserva ordem de inserção)
      (lista.produtos || []).forEach(produtoId => {
        if (!idsJaAdicionados.has(produtoId)) {
          idsJaAdicionados.add(produtoId);
          pushProduto(produtoId);
        }
      });
    }

    console.log('[ExportarPDF]', lista.nome, '— total:', produtosOrdenados.length, '— primeiros 5:', produtosOrdenados.slice(0, 5).map(p => `${p.codigo} ${p.nome}`));
    
    // Criar tabela
    const tableData = produtosOrdenados.map((produto, index) => [
      (index + 1).toString(),
      produto.codigo,
      produto.nome,
      produto.quantidade,
      produto.unidade
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [['#', 'Código', 'Produto', 'Quantidade', 'Unidade']],
      body: tableData,
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
    
    // Rodapé com total
    const finalY = (doc as any).lastAutoTable.finalY || 35;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de produtos: ${produtosOrdenados.length}`, 14, finalY + 10);
    
    // Salvar PDF
    doc.save(`Lista_${lista.nome.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    
    toast({
      title: "PDF exportado",
      description: `Lista "${lista.nome}" foi exportada com sucesso.`
    });
  };

  return (
    <div className="space-y-6">
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
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-6">
                {/* Seleção de Produtos */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Selecionar Produtos</Label>
                    {selectedItems.size > 0 && (
                      <Button 
                        type="button" 
                        size="sm"
                        onClick={handleAdicionarItem}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar ({selectedItems.size})
                      </Button>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produtos, departamentos, grupos ou subgrupos..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <ScrollArea className="border rounded-md h-[500px] p-4">
                    <div className="space-y-2">
                      {departamentoHierarchy.map((deptData) => {
                        const isDeptExpanded = expandedDepartamentos.has(deptData.departamento.id);
                        const hasProducts = deptData.grupos.some(g => g.subgrupos.some(s => s.produtos.length > 0));
                        
                        if (!hasProducts) return null;
                        
                        return (
                          <div key={deptData.departamento.id} className="space-y-2">
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
                                checked={selectedItems.has(`departamento:${deptData.departamento.id}`)}
                                onCheckedChange={() => handleSelectItem('departamento', deptData.departamento.id)}
                                id={`dept-${deptData.departamento.id}`} 
                              />
                                              <Label htmlFor={`dept-${deptData.departamento.id}`} className="font-semibold text-base cursor-pointer" title={deptData.departamento.nome}>
                                                {deptData.departamento.nome}
                                              </Label>
                            </div>

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
                                      checked={selectedItems.has(`grupo:${grupoData.id}`)}
                                      onCheckedChange={() => handleSelectItem('grupo', grupoData.id)}
                                      id={`grupo-${grupoData.id}`} 
                                    />
                                                    <Label htmlFor={`grupo-${grupoData.id}`} className="font-medium cursor-pointer" title={grupoData.nome}>
                                                      {grupoData.nome}
                                                    </Label>
                                  </div>

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
                                            checked={selectedItems.has(`subgrupo:${subgrupoData.id}`)}
                                            onCheckedChange={() => handleSelectItem('subgrupo', subgrupoData.id)}
                                            id={`subgrupo-${subgrupoData.id}`} 
                                          />
                                                          <Label htmlFor={`subgrupo-${subgrupoData.id}`} className="text-sm font-medium cursor-pointer" title={subgrupoData.nome}>
                                                            {subgrupoData.nome}
                                                            <span className="text-xs text-muted-foreground ml-2">
                                                              ({subgrupoData.produtos.length} produtos)
                                                            </span>
                                                          </Label>
                                        </div>

                                        {isSubgrupoExpanded && (
                                          <div className="ml-6 space-y-1">
                                            {subgrupoData.produtos.map((produto) => (
                                              <div key={produto.id} className="flex items-center gap-2 py-1">
                                                <Checkbox 
                                                  checked={selectedItems.has(`produto:${produto.id}`)}
                                                  onCheckedChange={() => handleSelectItem('produto', produto.id)}
                                                  id={`produto-${produto.id}`} 
                                                />
                                                <Label 
                                                  htmlFor={`produto-${produto.id}`} 
                                                  className="text-sm cursor-pointer flex-1"
                                                  title={`${produto.nome} (${produto.codigo} - ${produto.unidade})`}
                                                >
                                                  <span>{produto.nome}</span>
                                                  <span className="text-muted-foreground ml-2 text-xs">
                                                    ({produto.codigo} - {produto.unidade})
                                                  </span>
                                                </Label>
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
                  </ScrollArea>
                </div>

                {/* Visualização do Pesquisador */}
                <div className="space-y-4">
                  <Label>Visualização do Pesquisador</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar na lista..."
                      value={vizSearchTerm}
                      onChange={(e) => setVizSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <ScrollArea className="border rounded-md h-[460px] p-4">
                    {visualizacaoItems.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        Nenhum produto adicionado
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const hierarquia = new Map<string, Map<string, Map<string, number[]>>>();
                          
                          visualizacaoItems.forEach((item, index) => {
                            const produto = produtos.find(p => p.id === item.id);
                            if (!produto) return;
                            
                            // Filtrar por termo de busca
                            if (vizSearchTerm) {
                              const term = vizSearchTerm.toLowerCase();
                              const matchNome = produto.nome.toLowerCase().includes(term);
                              const matchCodigo = produto.codigo.toLowerCase().includes(term);
                              if (!matchNome && !matchCodigo) return;
                            }
                            
                            const subgrupo = subgrupos.find(s => s.id === produto.subgrupoId);
                            const grupo = grupos.find(g => g.id === produto.grupoId);
                            const dept = departamentos.find(d => d.id === grupo?.departamentoId);
                            
                            if (!dept || !grupo || !subgrupo) return;
                            
                            if (!hierarquia.has(dept.id)) {
                              hierarquia.set(dept.id, new Map());
                            }
                            if (!hierarquia.get(dept.id)!.has(grupo.id)) {
                              hierarquia.get(dept.id)!.set(grupo.id, new Map());
                            }
                            if (!hierarquia.get(dept.id)!.get(grupo.id)!.has(subgrupo.id)) {
                              hierarquia.get(dept.id)!.get(grupo.id)!.set(subgrupo.id, []);
                            }
                            hierarquia.get(dept.id)!.get(grupo.id)!.get(subgrupo.id)!.push(index);
                          });
                          
                          return Array.from(hierarquia.entries()).map(([deptId, gruposMap]) => {
                            const dept = departamentos.find(d => d.id === deptId);
                            if (!dept) return null;
                            
                            const allDeptIds = Array.from(hierarquia.keys());
                            const deptIndex = allDeptIds.indexOf(deptId);
                            const canMoveUpDept = deptIndex > 0;
                            const canMoveDownDept = deptIndex < allDeptIds.length - 1;
                            
                            return (
                              <div key={deptId} className="border rounded-md">
                                <div className="flex items-center gap-2 p-2 bg-muted">
                                  <button
                                    type="button"
                                    className="p-0 hover:bg-muted/80 rounded cursor-pointer"
                                    onClick={() => {
                                      setExpandedVisualizacaoDepts(prev => {
                                        const newSet = new Set(prev);
                                        newSet.has(deptId) ? newSet.delete(deptId) : newSet.add(deptId);
                                        return newSet;
                                      });
                                    }}
                                  >
                                    {expandedVisualizacaoDepts.has(deptId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                  </button>
                                  <span className="font-semibold flex-1">{dept.nome}</span>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoverDepartamento(deptId, 'up');
                                      }}
                                      disabled={!canMoveUpDept}
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoverDepartamento(deptId, 'down');
                                      }}
                                      disabled={!canMoveDownDept}
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteCategory({ tipo: 'departamento', id: deptId, nome: dept.nome });
                                      }}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {expandedVisualizacaoDepts.has(deptId) && (
                                  <div className="p-2 space-y-2">
                                    {Array.from(gruposMap.entries()).map(([grupoId, subgruposMap]) => {
                                      const grupo = grupos.find(g => g.id === grupoId);
                                      if (!grupo) return null;
                                      
                                      const allGrupoIds = Array.from(gruposMap.keys());
                                      const grupoIndex = allGrupoIds.indexOf(grupoId);
                                      const canMoveUpGrupo = grupoIndex > 0;
                                      const canMoveDownGrupo = grupoIndex < allGrupoIds.length - 1;
                                      
                                      return (
                                        <div key={grupoId} className="border rounded-md">
                                          <div className="flex items-center gap-2 p-2 bg-muted/50">
                                            <button
                                              type="button"
                                              className="p-0 hover:bg-muted/70 rounded cursor-pointer"
                                              onClick={() => {
                                                setExpandedVisualizacaoGrupos(prev => {
                                                  const newSet = new Set(prev);
                                                  newSet.has(grupoId) ? newSet.delete(grupoId) : newSet.add(grupoId);
                                                  return newSet;
                                                });
                                              }}
                                            >
                                              {expandedVisualizacaoGrupos.has(grupoId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </button>
                                            <span className="font-medium flex-1">{grupo.nome}</span>
                                            <div className="flex gap-1">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMoverGrupo(grupoId, 'up');
                                                }}
                                                disabled={!canMoveUpGrupo}
                                              >
                                                <ArrowUp className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleMoverGrupo(grupoId, 'down');
                                                }}
                                                disabled={!canMoveDownGrupo}
                                              >
                                                <ArrowDown className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeleteCategory({ tipo: 'grupo', id: grupoId, nome: grupo.nome });
                                                }}
                                              >
                                                <X className="w-3 h-3" />
                                              </Button>
                                            </div>
                                          </div>
                                          
                                          {expandedVisualizacaoGrupos.has(grupoId) && (
                                            <div className="p-2 space-y-2">
                                              {Array.from(subgruposMap.entries()).map(([subgrupoId, indices]) => {
                                                const subgrupo = subgrupos.find(s => s.id === subgrupoId);
                                                if (!subgrupo) return null;
                                                
                                                const allSubgrupoIds = Array.from(subgruposMap.keys());
                                                const subgrupoIndex = allSubgrupoIds.indexOf(subgrupoId);
                                                const canMoveUpSubgrupo = subgrupoIndex > 0;
                                                const canMoveDownSubgrupo = subgrupoIndex < allSubgrupoIds.length - 1;
                                                
                                                return (
                                                  <div key={subgrupoId} className="border rounded-md">
                                                    <div className="flex items-center gap-2 p-2 bg-muted/30">
                                                      <button
                                                        type="button"
                                                        className="p-0 hover:bg-muted/50 rounded cursor-pointer"
                                                        onClick={() => {
                                                          setExpandedVisualizacaoSubgrupos(prev => {
                                                            const newSet = new Set(prev);
                                                            newSet.has(subgrupoId) ? newSet.delete(subgrupoId) : newSet.add(subgrupoId);
                                                            return newSet;
                                                          });
                                                        }}
                                                      >
                                                        {expandedVisualizacaoSubgrupos.has(subgrupoId) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                      </button>
                                                      <span className="text-sm font-medium flex-1">{subgrupo.nome}</span>
                                                      <span className="text-xs text-muted-foreground">({indices.length})</span>
                                                      <div className="flex gap-1">
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="sm"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMoverSubgrupo(subgrupoId, 'up');
                                                          }}
                                                          disabled={!canMoveUpSubgrupo}
                                                        >
                                                          <ArrowUp className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="sm"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMoverSubgrupo(subgrupoId, 'down');
                                                          }}
                                                          disabled={!canMoveDownSubgrupo}
                                                        >
                                                          <ArrowDown className="w-3 h-3" />
                                                        </Button>
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="sm"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDeleteCategory({ tipo: 'subgrupo', id: subgrupoId, nome: subgrupo.nome });
                                                          }}
                                                        >
                                                          <X className="w-3 h-3" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                    
                                                    {expandedVisualizacaoSubgrupos.has(subgrupoId) && (
                                                      <div className="p-2 space-y-1">
                                                        {indices.map(index => {
                                                          const item = visualizacaoItems[index];
                                                          const posicaoNoSubgrupo = indices.indexOf(index);
                                                          const canMoveUp = posicaoNoSubgrupo > 0;
                                                          const canMoveDown = posicaoNoSubgrupo < indices.length - 1;
                                                           
                                                          return (
                                                            <div key={`${item.id}-${index}`} className="flex items-center gap-2 p-2 border rounded bg-background">
                                                              <span className="flex-1 text-sm" title={item.nome}>{item.nome}</span>
                                                              <div className="flex gap-1">
                                                                <Button
                                                                  type="button"
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  onClick={() => handleMoverItem(index, 'up', indices)}
                                                                  disabled={!canMoveUp}
                                                                >
                                                                  <ArrowUp className="w-3 h-3" />
                                                                </Button>
                                                                <Button
                                                                  type="button"
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  onClick={() => handleMoverItem(index, 'down', indices)}
                                                                  disabled={!canMoveDown}
                                                                >
                                                                  <ArrowDown className="w-3 h-3" />
                                                                </Button>
                                                                <Button
                                                                  type="button"
                                                                  variant="ghost"
                                                                  size="sm"
                                                                  onClick={() => handleRemoverItem(index)}
                                                                >
                                                                  <X className="w-3 h-3" />
                                                                </Button>
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="text-sm text-muted-foreground">
                    {visualizacaoItems.length} produto(s) na lista
                  </div>
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar listas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

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
                      onClick={() => handleExportarPDF(lista)}
                      title="Exportar PDF"
                    >
                      <FileDown className="w-4 h-4" />
                    </Button>
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

      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deleteCategory?.tipo}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o {deleteCategory?.tipo} "{deleteCategory?.nome}" e todos os seus produtos da lista?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoverCategoria}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
