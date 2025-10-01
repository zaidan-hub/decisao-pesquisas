import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Coleta, Supermercado, ObservacaoFinal } from '@/types';
import { Calendar, Store, Package, MessageSquare, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useColetas } from '@/hooks/useColetas';
import { useSupermercados } from '@/hooks/useSupermercados';
import { usePesquisadores } from '@/hooks/usePesquisadores';

export const HistoricoTab = () => {
  const { user } = useAuth();
  const { coletas, updateColeta } = useColetas();
  const { supermercados } = useSupermercados();
  const { pesquisadores } = usePesquisadores();
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [selectedColeta, setSelectedColeta] = useState<Coleta | null>(null);
  const [novaObservacao, setNovaObservacao] = useState('');

  // Filtrar coletas finalizadas do pesquisador logado
  const coletasFinalizadas = coletas.filter(c => {
    // Extrair login do email (ex: henriette@sistema.local -> henriette)
    const loginFromEmail = user?.email?.split('@')[0];
    // Buscar o ID do pesquisador pelo login
    const pesquisador = pesquisadores.find(p => p.login === loginFromEmail);
    return pesquisador && c.pesquisadorId === pesquisador.id && c.status === 'finalizada';
  });

  const getSupermercadoNome = (id: string) => {
    return supermercados.find(s => s.id === id)?.nome || 'N/A';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    });
  };

  const handleAddObservation = async () => {
    if (!selectedColeta || !novaObservacao.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma observação válida.",
        variant: "destructive"
      });
      return;
    }

    const novaObservacaoObj: ObservacaoFinal = {
      id: Date.now().toString(),
      texto: novaObservacao.trim(),
      dataHora: new Date().toISOString().replace('Z', '-03:00') // GMT-3
    };

    const novasObservacoes = [...(selectedColeta.observacoesFinais || []), novaObservacaoObj];
    
    const { error } = await updateColeta(selectedColeta.id, {
      observacoesFinais: novasObservacoes,
      adminVisualizouObservacoes: false
    });

    if (error) {
      toast({
        title: "Erro",
        description: error,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Sucesso",
      description: "Observação adicionada com sucesso!"
    });

    setNovaObservacao('');
    setShowObservationDialog(false);
    setSelectedColeta(null);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Histórico de Coletas</h2>
        <p className="text-muted-foreground text-sm">
          Coletas finalizadas - você pode adicionar observações
        </p>
      </div>

      {coletasFinalizadas.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma coleta finalizada</h3>
            <p className="text-muted-foreground">
              As coletas finalizadas aparecerão aqui
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coletasFinalizadas.map((coleta) => (
            <Card key={coleta.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{formatDate(coleta.data)}</span>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
                    Finalizada
                  </span>
                </div>
                
                {(coleta.numero || coleta.grupo || coleta.ano) && (
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    {coleta.numero && (
                      <span>Nº: <strong>{coleta.numero}</strong></span>
                    )}
                    {coleta.grupo && (
                      <span>Grupo: <strong>{coleta.grupo}</strong></span>
                    )}
                    {coleta.ano && (
                      <span>Ano: <strong>{coleta.ano}</strong></span>
                    )}
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Supermercado:</strong> {getSupermercadoNome(coleta.supermercadoId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Produtos:</strong> {coleta.produtos.length} itens
                    </span>
                  </div>
                </div>

                {/* Observações existentes */}
                {coleta.observacoesFinais && coleta.observacoesFinais.length > 0 && (
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Observações ({coleta.observacoesFinais.length})
                    </h4>
                    <div className="space-y-2">
                      {coleta.observacoesFinais.map((obs) => (
                        <div key={obs.id} className="bg-muted p-3 rounded-lg">
                          <p className="text-sm">{obs.texto}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDateTime(obs.dataHora)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Dialog open={showObservationDialog && selectedColeta?.id === coleta.id} onOpenChange={setShowObservationDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedColeta(coleta)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Observação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="mx-4">
                    <DialogHeader>
                      <DialogTitle>Nova Observação</DialogTitle>
                      <DialogDescription>
                        Adicione observações sobre esta coleta finalizada
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Textarea
                          placeholder="Digite sua observação..."
                          value={novaObservacao}
                          onChange={(e) => setNovaObservacao(e.target.value)}
                          rows={4}
                        />
                      </div>
                      
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowObservationDialog(false);
                            setSelectedColeta(null);
                            setNovaObservacao('');
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={handleAddObservation}>
                          Salvar Observação
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};