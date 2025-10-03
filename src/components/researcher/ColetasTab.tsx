import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { ColetaDetail } from './ColetaDetail';
import { Coleta, Supermercado } from '@/types';
import { Calendar, Store, User, Package, ArrowRight, FileText } from 'lucide-react';
import { useColetas } from '@/hooks/useColetas';
import { useSupermercados } from '@/hooks/useSupermercados';
import { usePesquisadores } from '@/hooks/usePesquisadores';

export const ColetasTab = () => {
  const { user } = useAuth();
  const { coletas, loading: loadingColetas, updateColeta } = useColetas();
  const { supermercados, loading: loadingSupermercados } = useSupermercados();
  const { pesquisadores, loading: loadingPesquisadores } = usePesquisadores();
  const [selectedColeta, setSelectedColeta] = useState<Coleta | null>(null);

  // Filtrar coletas do pesquisador logado (não finalizadas) - otimizado com useMemo
  const coletasPesquisador = useMemo(() => {
    return coletas.filter(c => {
      // Buscar o pesquisador pelo email do usuário logado
      const pesquisador = pesquisadores.find(p => p.email.toLowerCase() === user?.email?.toLowerCase());
      
      console.log('🔍 DEBUG FILTRO:', {
        userEmail: user?.email,
        pesquisadorEncontrado: pesquisador,
        coletaPesquisadorId: c.pesquisadorId,
        coletaStatus: c.status,
        match: pesquisador && c.pesquisadorId === pesquisador.id
      });
      
      return pesquisador && c.pesquisadorId === pesquisador.id && c.status !== 'finalizada';
    });
  }, [coletas, pesquisadores, user?.email]);

  const isLoading = loadingColetas || loadingSupermercados || loadingPesquisadores;

  const getSupermercadoNome = (id: string) => {
    return supermercados.find(s => s.id === id)?.nome || 'N/A';
  };

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

  const updateColetaStatus = async (coletaId: string, newStatus: Coleta['status'], updatedData?: Partial<Coleta>) => {
    await updateColeta(coletaId, { status: newStatus, ...updatedData });
  };

  if (selectedColeta) {
    return (
      <ColetaDetail
        coleta={selectedColeta}
        onBack={() => setSelectedColeta(null)}
        onUpdateColeta={updateColetaStatus}
        supermercados={supermercados}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Minhas Coletas</h2>
        <p className="text-muted-foreground text-sm">
          Coletas atribuídas para você
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : coletasPesquisador.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma coleta encontrada</h3>
            <p className="text-muted-foreground">
              Não há coletas atribuídas para você no momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {coletasPesquisador.map((coleta) => (
            <Card 
              key={coleta.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedColeta(coleta)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{formatDate(coleta.data)}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(coleta.status)}`}>
                    {coleta.status.charAt(0).toUpperCase() + coleta.status.slice(1).replace(' ', ' ')}
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
              
              <CardContent className="pt-0">
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
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-muted-foreground">
                      Toque para abrir
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};