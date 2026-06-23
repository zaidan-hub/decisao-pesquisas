import { useState, useMemo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Edit2, Save, X, MessageSquare, Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Coleta, Produto, Grupo, Subgrupo, Supermercado } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';
import { AlertaVariacaoPrecos } from '@/components/admin/AlertaVariacaoPrecos';

interface AdminColetaViewProps {
  coleta: Coleta;
  onBack: () => void;
  onUpdateColeta: (coletaId: string, updatedData: Partial<Coleta>) => void;
  supermercados: Supermercado[];
}

export const AdminColetaView = ({ coleta, onBack, onUpdateColeta, supermercados }: AdminColetaViewProps) => {
  const [precosEditados, setPrecosEditados] = useState<{ [produtoId: string]: number}>(
    coleta.precosEditadosAdmin || {}
  );
  const [isEditing, setIsEditing] = useState(false);
  const [tempPrecos, setTempPrecos] = useState<{ [produtoId: string]: string }>({});
  const [fotosPorProduto, setFotosPorProduto] = useState<{ [produtoId: string]: string[] }>({});
  const [loadingFotos, setLoadingFotos] = useState<{ [produtoId: string]: boolean }>({});
  const [alertasAtivos, setAlertasAtivos] = useState(coleta.alertasVariacao || []);
  const [produtosComFotos, setProdutosComFotos] = useState<Set<string>>(new Set());
  
  // Refs para scroll até produtos
  const produtoRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Buscar dados reais do banco
  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();
  const { produtos } = useProdutos();

  const supermercado = supermercados.find(s => s.id === coleta.supermercadoId);

  // Carregar informação de existência de fotos
  useEffect(() => {
    const carregarInfoFotos = async () => {
      try {
        const { data, error } = await supabase
          .from('coletas')
          .select('fotos')
          .eq('id', coleta.id)
          .single();
        
        if (error) throw error;
        
        if (data?.fotos) {
          const idsComFotos = Object.keys(data.fotos).filter(
            id => data.fotos[id] && data.fotos[id].length > 0
          );
          setProdutosComFotos(new Set(idsComFotos));
        }
      } catch (error) {
        console.error('Erro ao verificar fotos:', error);
      }
    };
    
    carregarInfoFotos();
  }, [coleta.id]);

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const getStatusColor = (status: Coleta['status']) => {
    switch (status) {
      case 'não iniciada':
        return 'bg-destructive text-destructive-foreground';
      case 'iniciada':
        return 'bg-yellow-500 text-white';
      case 'finalizada':
        return 'bg-green-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Produtos da coleta ordenados por grupo > subgrupo > produto
  const produtosDaColeta = useMemo(() => {
    console.log('🔍 ADMIN DEBUG PRODUTOS:', {
      totalProdutos: produtos.length,
      produtosColeta: coleta.produtos.length,
      grupos: grupos.length,
      subgrupos: subgrupos.length
    });

    const produtosFiltrados = produtos.filter(p => coleta.produtos.includes(p.id));
    
    console.log('🔍 ADMIN PRODUTOS FILTRADOS:', produtosFiltrados.length);

    // Se houver hierarquia customizada, ordenar exatamente como chega para a pesquisadora
    const hierarquia = coleta.hierarquiaCustomizada as any;
    if (hierarquia?.ordem && Array.isArray(hierarquia.ordem) && hierarquia.ordem.length > 0) {
      const ordemMap: Record<string, number> = {};
      hierarquia.ordem.forEach((item: any, idx: number) => {
        if (item.produtoId) ordemMap[item.produtoId] = idx;
      });

      return produtosFiltrados.sort((a, b) => {
        const ordemA = ordemMap[a.id] ?? 99999;
        const ordemB = ordemMap[b.id] ?? 99999;
        return ordemA - ordemB;
      });
    }

    // Ordenação padrão por grupo > subgrupo > produto
    return produtosFiltrados.sort((a, b) => {
      const grupoA = grupos.find(g => g.id === a.grupoId);
      const grupoB = grupos.find(g => g.id === b.grupoId);
      const subgrupoA = subgrupos.find(s => s.id === a.subgrupoId);
      const subgrupoB = subgrupos.find(s => s.id === b.subgrupoId);
      
      if (grupoA?.nome !== grupoB?.nome) {
        return (grupoA?.nome || '').localeCompare(grupoB?.nome || '');
      }
      
      if (subgrupoA?.nome !== subgrupoB?.nome) {
        return (subgrupoA?.nome || '').localeCompare(subgrupoB?.nome || '');
      }
      
      return a.nome.localeCompare(b.nome);
    });
  }, [coleta.produtos, coleta.hierarquiaCustomizada, produtos, grupos, subgrupos]);


  // Agrupar produtos por grupo/subgrupo para exibição
  const produtosAgrupados = useMemo(() => {
    const gruposMap: { [key: string]: { [key: string]: Produto[] } } = {};
    
    produtosDaColeta.forEach(produto => {
      const grupo = grupos.find(g => g.id === produto.grupoId);
      const subgrupo = subgrupos.find(s => s.id === produto.subgrupoId);
      
      const grupoNome = grupo?.nome || 'Sem Grupo';
      const subgrupoNome = subgrupo?.nome || 'Sem Subgrupo';
      
      if (!gruposMap[grupoNome]) {
        gruposMap[grupoNome] = {};
      }
      if (!gruposMap[grupoNome][subgrupoNome]) {
        gruposMap[grupoNome][subgrupoNome] = [];
      }
      gruposMap[grupoNome][subgrupoNome].push(produto);
    });
    
    return gruposMap;
  }, [produtosDaColeta, grupos, subgrupos]);

  const handleStartEdit = () => {
    setIsEditing(true);
    // Inicializar valores temporários com preços atuais (editados ou originais)
    const initialValues: { [produtoId: string]: string } = {};
    coleta.produtos.forEach(produtoId => {
      const precoAtual = precosEditados[produtoId] ?? coleta.precos?.[produtoId] ?? 0;
      initialValues[produtoId] = precoAtual.toString();
    });
    setTempPrecos(initialValues);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setTempPrecos({});
  };

  const handleSaveEdit = () => {
    const novosPrecos: { [produtoId: string]: number } = {};
    
    Object.entries(tempPrecos).forEach(([produtoId, valor]) => {
      const precoNumerico = parseFloat(valor) || 0;
      if (precoNumerico > 0) {
        novosPrecos[produtoId] = precoNumerico;
      }
    });

    setPrecosEditados(novosPrecos);
    
    // Remover alertas dos produtos que foram editados
    const alertasAtualizados = alertasAtivos.filter(alerta => {
      // Se o produto foi editado, remover o alerta
      if (alerta.produto_id in novosPrecos) {
        return false;
      }
      return true;
    });
    
    setAlertasAtivos(alertasAtualizados);
    
    // Atualizar no banco
    onUpdateColeta(coleta.id, { 
      precosEditadosAdmin: novosPrecos,
      alertasVariacao: alertasAtualizados
    });
    
    setIsEditing(false);
    setTempPrecos({});
    
    toast({
      title: "Preços atualizados",
      description: "Os preços foram editados com sucesso pelo administrador."
    });
  };

  // Função para rolar até um produto específico
  const scrollToProduto = (produtoId: string) => {
    const elemento = produtoRefs.current[produtoId];
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Adicionar efeito visual temporário
      elemento.classList.add('ring-2', 'ring-orange-500', 'ring-offset-2');
      setTimeout(() => {
        elemento.classList.remove('ring-2', 'ring-orange-500', 'ring-offset-2');
      }, 2000);
    }
  };

  // Função para descartar todos os alertas
  const handleDismissAlertas = async () => {
    const alertasVisualizados = alertasAtivos.map(a => ({ ...a, visualizado: true }));
    setAlertasAtivos(alertasVisualizados);
    
    try {
      await supabase
        .from('coletas')
        .update({ alertas_variacao: alertasVisualizados })
        .eq('id', coleta.id);
    } catch (error) {
      console.error('Erro ao atualizar alertas:', error);
    }
  };

  const handlePrecoChange = (produtoId: string, valor: string) => {
    setTempPrecos(prev => ({ ...prev, [produtoId]: valor }));
  };

  // Obter preço atual (editado pelo admin ou original)
  const getPrecoAtual = (produtoId: string): number => {
    return precosEditados[produtoId] ?? coleta.precos?.[produtoId] ?? 0;
  };

  // Verificar se o preço foi editado pelo admin
  const foiEditadoPeloAdmin = (produtoId: string): boolean => {
    return produtoId in precosEditados;
  };

  // Buscar fotos sob demanda quando o Dialog for aberto
  const handleLoadFotos = async (produtoId: string) => {
    if (fotosPorProduto[produtoId] !== undefined || loadingFotos[produtoId]) {
      return; // Já carregou ou está carregando
    }

    setLoadingFotos(prev => ({ ...prev, [produtoId]: true }));
    
    try {
      const { data, error } = await supabase
        .from('coletas')
        .select('fotos')
        .eq('id', coleta.id)
        .single();
      
      if (error) throw error;
      
      if (data?.fotos?.[produtoId]) {
        setFotosPorProduto(prev => ({
          ...prev,
          [produtoId]: data.fotos[produtoId]
        }));
      } else {
        setFotosPorProduto(prev => ({
          ...prev,
          [produtoId]: []
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar fotos:', error);
      toast({
        title: "Erro ao carregar fotos",
        description: "Não foi possível carregar as fotos do produto.",
        variant: "destructive"
      });
    } finally {
      setLoadingFotos(prev => ({ ...prev, [produtoId]: false }));
    }
  };

  // Verificar se produto tem fotos (pelo contador no array produtos ou fotos já carregadas)
  const produtoTemFotos = (produtoId: string): boolean => {
    return fotosPorProduto[produtoId]?.length > 0;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold">Visualização da Coleta</h2>
            <p className="text-sm text-muted-foreground">
              {formatDate(coleta.data)} - {supermercado?.nome}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={handleStartEdit} variant="outline">
              <Edit2 className="w-4 h-4 mr-2" />
              Editar Preços
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
              <Button onClick={handleCancelEdit} variant="outline" size="sm">
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Alerta de Variação de Preços */}
      {coleta.status === 'finalizada' && (
        <AlertaVariacaoPrecos
          alertas={alertasAtivos}
          produtos={produtos}
          onProdutoClick={scrollToProduto}
          onDismiss={handleDismissAlertas}
        />
      )}

      {/* Coleta Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Informações da Coleta</CardTitle>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(coleta.status)}`}>
              {coleta.status.charAt(0).toUpperCase() + coleta.status.slice(1)}
            </span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data</label>
              <p className="text-sm">{formatDate(coleta.data)}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Supermercado</label>
              <p className="text-sm">{supermercado?.nome || 'N/A'}</p>
            </div>
            
            {coleta.numero && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Número</label>
                <p className="text-sm">{coleta.numero}</p>
              </div>
            )}
            
            {coleta.ano && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ano</label>
                <p className="text-sm">{coleta.ano}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <div className="space-y-4">
        {Object.entries(produtosAgrupados).map(([grupoNome, subgrupos]) => (
          <Card key={grupoNome}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{grupoNome}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(subgrupos).map(([subgrupoNome, produtos]) => (
                <div key={subgrupoNome}>
                  <h4 className="font-medium text-sm text-muted-foreground mb-3">
                    {subgrupoNome}
                  </h4>
                  <div className="space-y-3">
                    {produtos.map((produto) => {
                      const precoOriginal = coleta.precos?.[produto.id] ?? 0;
                      const precoAtual = getPrecoAtual(produto.id);
                      const editado = foiEditadoPeloAdmin(produto.id);
                      
                      return (
                        <div 
                          key={produto.id} 
                          ref={(el) => { produtoRefs.current[produto.id] = el; }}
                          className="border rounded-lg p-3 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-sm">{produto.nome}</h5>
                              <p className="text-xs text-muted-foreground">{produto.codigo}</p>
                            </div>
                            
                            <div className="w-32">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0,00"
                                  value={tempPrecos[produto.id] || ''}
                                  onChange={(e) => handlePrecoChange(produto.id, e.target.value)}
                                  className="text-center"
                                />
                              ) : (
                                <div className="text-center">
                                  <div className="font-medium">
                                    R$ {precoAtual.toFixed(2)}
                                    {editado && (
                                      <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">
                                        Admin
                                      </span>
                                    )}
                                  </div>
                                  {editado && precoOriginal !== precoAtual && (
                                    <div className="text-xs text-muted-foreground line-through">
                                      Original: R$ {precoOriginal.toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {!isEditing && (
                              <div className="flex gap-2">
                                {produtosComFotos.has(produto.id) && (
                                  <Dialog onOpenChange={(open) => {
                                    if (open) {
                                      handleLoadFotos(produto.id);
                                    }
                                  }}>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-blue-50 border-blue-200 hover:bg-blue-100 relative"
                                      >
                                        <Camera className="w-4 h-4" />
                                        <span 
                                          className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" 
                                          title="Tem fotos"
                                        />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl">
                                      <DialogHeader>
                                        <DialogTitle>Fotos - {produto.nome}</DialogTitle>
                                      </DialogHeader>
                                      {loadingFotos[produto.id] ? (
                                        <div className="flex justify-center items-center py-12">
                                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        </div>
                                      ) : fotosPorProduto[produto.id]?.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                                          {fotosPorProduto[produto.id].map((foto, index) => (
                                            <img
                                              key={index}
                                              src={foto}
                                              alt={`Foto ${index + 1} de ${produto.nome}`}
                                              className="w-full h-auto rounded-lg border"
                                            />
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                          Nenhuma foto disponível
                                        </div>
                                      )}
                                    </DialogContent>
                                  </Dialog>
                                )}
                                
                                {coleta.observacoesProdutos?.[produto.id] && (
                                  <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3 text-yellow-600" />
                                    <span className="text-xs text-yellow-700">Obs</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Observações */}
                          {!isEditing && coleta.observacoesProdutos?.[produto.id] && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                              <strong>Observação:</strong> {coleta.observacoesProdutos[produto.id]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Observações Finais */}
      {coleta.observacoesFinais && coleta.observacoesFinais.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações Finais</CardTitle>
            <CardDescription>
              Observações adicionadas após a finalização da coleta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {coleta.observacoesFinais.map((obs) => (
                <div key={obs.id} className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{obs.texto}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(obs.dataHora).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};