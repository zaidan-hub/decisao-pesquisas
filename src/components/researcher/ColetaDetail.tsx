import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Play, CheckCircle } from 'lucide-react';
import { Coleta, Supermercado } from '@/types';
import { ProductList } from './ProductList';
import { toast } from '@/hooks/use-toast';

interface ColetaDetailProps {
  coleta: Coleta;
  onBack: () => void;
  onUpdateColeta: (coletaId: string, newStatus: Coleta['status'], updatedData?: Partial<Coleta>) => void;
  supermercados: Supermercado[];
}

export const ColetaDetail = ({ coleta, onBack, onUpdateColeta, supermercados }: ColetaDetailProps) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showProductList, setShowProductList] = useState(false);

  const supermercado = supermercados.find(s => s.id === coleta.supermercadoId);

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

  const handleIniciarColeta = () => {
    onUpdateColeta(coleta.id, 'iniciada');
    setShowProductList(true);
    toast({
      title: "Coleta Iniciada",
      description: "Você pode agora inserir os preços dos produtos."
    });
  };

  const handleFinalizarColeta = () => {
    // Move para histórico
    onUpdateColeta(coleta.id, 'finalizada');
    setShowConfirmDialog(false);
    
    toast({
      title: "Coleta Finalizada",
      description: "A coleta foi movida para o histórico."
    });
    
    // Volta para a lista
    onBack();
  };

  const handleUpdatePrecos = (precos: { [produtoId: string]: number }, observacoes: { [produtoId: string]: string }, fotos?: { [produtoId: string]: string[] }) => {
    console.log('📸 Salvando fotos:', fotos);
    onUpdateColeta(coleta.id, coleta.status, { 
      precos, 
      observacoesProdutos: observacoes,
      fotos: fotos || {}
    });
  };

  if (showProductList) {
    return (
      <ProductList
        coleta={coleta}
        onBack={() => setShowProductList(false)}
        onUpdatePrecos={handleUpdatePrecos}
        onFinalizarColeta={() => setShowConfirmDialog(true)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">Detalhes da Coleta</h2>
          <p className="text-sm text-muted-foreground">
            {formatDate(coleta.data)}
          </p>
        </div>
      </div>

      {/* Coleta Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Informações da Coleta</CardTitle>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(coleta.status)}`}>
              {coleta.status.charAt(0).toUpperCase() + coleta.status.slice(1).replace(' ', ' ')}
            </span>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
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
            
            {coleta.grupo && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Grupo</label>
                <p className="text-sm">{coleta.grupo}</p>
              </div>
            )}
            
            {coleta.ano && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Ano</label>
                <p className="text-sm">{coleta.ano}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Produtos</label>
              <p className="text-sm">{coleta.produtos.length} itens</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            {coleta.status === 'não iniciada' && (
              <Button 
                className="w-full"
                onClick={handleIniciarColeta}
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar Coleta
              </Button>
            )}
            
            {coleta.status === 'iniciada' && (
              <div className="space-y-2">
                <Button 
                  className="w-full"
                  onClick={() => setShowProductList(true)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Continuar Coleta
                </Button>
                
                <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      className="w-full"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Finalizar Coleta
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="mx-4">
                    <DialogHeader>
                      <DialogTitle>Finalizar Coleta</DialogTitle>
                      <DialogDescription>
                        Tem certeza que deseja finalizar esta coleta? Você ainda poderá adicionar observações posteriormente.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowConfirmDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleFinalizarColeta}>
                        Sim, Finalizar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};