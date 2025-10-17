import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertaVariacao } from '@/types';
import { Produto } from '@/types';

// Função helper para formatar datas sem problemas de timezone
const formatDate = (dateString: string) => {
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

interface AlertaVariacaoPrecosProps {
  alertas: AlertaVariacao[];
  produtos: Produto[];
  onProdutoClick: (produtoId: string) => void;
  onDismiss: () => void;
}

export const AlertaVariacaoPrecos = ({ 
  alertas, 
  produtos, 
  onProdutoClick,
  onDismiss 
}: AlertaVariacaoPrecosProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!alertas || alertas.length === 0) {
    return null;
  }

  // Filtrar apenas alertas não visualizados
  const alertasAtivos = alertas.filter(a => !a.visualizado);
  
  if (alertasAtivos.length === 0) {
    return null;
  }

  const getProdutoNome = (produtoId: string) => {
    return produtos.find(p => p.id === produtoId)?.nome || 'Produto não encontrado';
  };

  const getVariacaoClass = (variacao: number) => {
    if (variacao > 0) return 'text-red-600';
    return 'text-green-600';
  };

  return (
    <Card className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950/20">
      <CardContent className="p-4">
        <Alert className="border-none bg-transparent p-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                  Variações Significativas de Preço Detectadas
                </h3>
                <AlertDescription className="text-sm text-orange-800 dark:text-orange-200">
                  {alertasAtivos.length} produto(s) com variação de preço ≥ 70% em relação à última coleta
                </AlertDescription>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(!expanded)}
                className="text-orange-700 hover:text-orange-900 hover:bg-orange-100"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Ver Detalhes
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="text-orange-700 hover:text-orange-900 hover:bg-orange-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {expanded && (
            <div className="mt-4 space-y-2">
              <div className="bg-white dark:bg-gray-800 rounded-md p-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 pb-2 border-b">
                  <div className="col-span-4">Produto</div>
                  <div className="col-span-2 text-right">Preço Anterior</div>
                  <div className="col-span-2 text-right">Preço Atual</div>
                  <div className="col-span-2 text-right">Variação</div>
                  <div className="col-span-2 text-center">Ação</div>
                </div>

                {alertasAtivos.map((alerta) => (
                  <div 
                    key={alerta.produto_id} 
                    className="grid grid-cols-12 gap-2 items-center py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded transition-colors"
                  >
                    <div className="col-span-4 text-sm font-medium">
                      {getProdutoNome(alerta.produto_id)}
                    </div>
                    <div className="col-span-2 text-right text-sm">
                      R$ {alerta.preco_anterior.toFixed(2)}
                    </div>
                    <div className="col-span-2 text-right text-sm font-semibold">
                      R$ {alerta.preco_atual.toFixed(2)}
                    </div>
                    <div className={`col-span-2 text-right text-sm font-bold ${getVariacaoClass(alerta.variacao_percentual)}`}>
                      {alerta.variacao_percentual > 0 ? '+' : ''}{alerta.variacao_percentual.toFixed(1)}%
                    </div>
                    <div className="col-span-2 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onProdutoClick(alerta.produto_id)}
                        className="text-xs"
                      >
                        Ver Produto
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                Data da última coleta: {formatDate(alertasAtivos[0].data_anterior)}
              </p>
            </div>
          )}
        </Alert>
      </CardContent>
    </Card>
  );
};
