import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Edit2, Save, X, MessageSquare, Camera } from 'lucide-react';
import { Coleta, Produto, Grupo, Subgrupo, Supermercado } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';

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

  // Buscar dados reais do banco
  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();
  const { produtos } = useProdutos();

  const supermercado = supermercados.find(s => s.id === coleta.supermercadoId);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
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
  }, [coleta.produtos, produtos, grupos, subgrupos]);

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
    onUpdateColeta(coleta.id, { precosEditadosAdmin: novosPrecos });
    setIsEditing(false);
    setTempPrecos({});
    
    toast({
      title: "Preços atualizados",
      description: "Os preços foram editados com sucesso pelo administrador."
    });
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
                        <div key={produto.id} className="border rounded-lg p-3">
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
                                {coleta.fotos?.[produto.id] && coleta.fotos[produto.id].length > 0 && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-blue-50 border-blue-200 hover:bg-blue-100"
                                      >
                                        <Camera className="w-4 h-4" />
                                        <span className="ml-1 text-xs">
                                          {coleta.fotos[produto.id].length}
                                        </span>
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-3xl">
                                      <DialogHeader>
                                        <DialogTitle>Fotos - {produto.nome}</DialogTitle>
                                      </DialogHeader>
                                      <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                                        {coleta.fotos[produto.id].map((foto, index) => (
                                          <img
                                            key={index}
                                            src={foto}
                                            alt={`Foto ${index + 1} de ${produto.nome}`}
                                            className="w-full h-auto rounded-lg border"
                                          />
                                        ))}
                                      </div>
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