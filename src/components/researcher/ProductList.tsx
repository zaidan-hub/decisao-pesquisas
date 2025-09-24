import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Search, MessageSquare, CheckCircle } from 'lucide-react';
import { Coleta, Produto, Grupo, Subgrupo } from '@/types';
import { toast } from '@/hooks/use-toast';

interface ProductListProps {
  coleta: Coleta;
  onBack: () => void;
  onUpdatePrecos: (precos: { [produtoId: string]: number }, observacoes: { [produtoId: string]: string }) => void;
  onFinalizarColeta: () => void;
}

export const ProductList = ({ coleta, onBack, onUpdatePrecos, onFinalizarColeta }: ProductListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [precos, setPrecos] = useState<{ [produtoId: string]: number }>(coleta.precos || {});
  const [observacoes, setObservacoes] = useState<{ [produtoId: string]: string }>(coleta.observacoesProdutos || {});
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [tempObservacao, setTempObservacao] = useState('');

  // Mock data
  const mockProdutos: Produto[] = [
    { id: '1', codigo: 'PRD001', nome: 'Arroz Branco 5kg', grupoId: '1', subgrupoId: '1', unidadeMedida: 'kg' },
    { id: '2', codigo: 'PRD002', nome: 'Feijão Carioca 1kg', grupoId: '1', subgrupoId: '1', unidadeMedida: 'kg' },
    { id: '3', codigo: 'PRD003', nome: 'Açúcar Cristal 1kg', grupoId: '1', subgrupoId: '2', unidadeMedida: 'kg' },
    { id: '4', codigo: 'PRD004', nome: 'Leite Integral 1L', grupoId: '2', subgrupoId: '3', unidadeMedida: 'L' },
    { id: '5', codigo: 'PRD005', nome: 'Pão de Forma', grupoId: '2', subgrupoId: '4', unidadeMedida: 'un' },
  ];

  const mockGrupos: Grupo[] = [
    { id: '1', codigo: 'GRP001', nome: 'Alimentos Básicos' },
    { id: '2', codigo: 'GRP002', nome: 'Laticínios e Pães' },
  ];

  const mockSubgrupos: Subgrupo[] = [
    { id: '1', codigo: 'SUB001', nome: 'Grãos e Cereais', grupoId: '1' },
    { id: '2', codigo: 'SUB002', nome: 'Açúcares', grupoId: '1' },
    { id: '3', codigo: 'SUB003', nome: 'Leites', grupoId: '2' },
    { id: '4', codigo: 'SUB004', nome: 'Pães', grupoId: '2' },
  ];

  // Produtos da coleta ordenados por grupo > subgrupo > produto
  const produtosDaColeta = useMemo(() => {
    const produtos = mockProdutos.filter(p => coleta.produtos.includes(p.id));
    
    // Filtrar por busca
    const produtosFiltrados = produtos.filter(p =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Ordenar por grupo > subgrupo > produto
    return produtosFiltrados.sort((a, b) => {
      const grupoA = mockGrupos.find(g => g.id === a.grupoId);
      const grupoB = mockGrupos.find(g => g.id === b.grupoId);
      const subgrupoA = mockSubgrupos.find(s => s.id === a.subgrupoId);
      const subgrupoB = mockSubgrupos.find(s => s.id === b.subgrupoId);
      
      // Comparar por grupo
      if (grupoA?.nome !== grupoB?.nome) {
        return (grupoA?.nome || '').localeCompare(grupoB?.nome || '');
      }
      
      // Comparar por subgrupo
      if (subgrupoA?.nome !== subgrupoB?.nome) {
        return (subgrupoA?.nome || '').localeCompare(subgrupoB?.nome || '');
      }
      
      // Comparar por produto
      return a.nome.localeCompare(b.nome);
    });
  }, [coleta.produtos, searchTerm]);

  const handlePrecoChange = (produtoId: string, valor: string) => {
    const precoNumerico = parseFloat(valor) || 0;
    const novosPrecos = { ...precos, [produtoId]: precoNumerico };
    setPrecos(novosPrecos);
    onUpdatePrecos(novosPrecos, observacoes);
  };

  const handleSaveObservation = () => {
    const novasObservacoes = { 
      ...observacoes, 
      [selectedProductId]: tempObservacao.trim() 
    };
    
    if (!tempObservacao.trim()) {
      // Remove observação se estiver vazia
      delete novasObservacoes[selectedProductId];
    }
    
    setObservacoes(novasObservacoes);
    onUpdatePrecos(precos, novasObservacoes);
    
    setShowObservationDialog(false);
    setSelectedProductId('');
    setTempObservacao('');
    
    toast({
      title: "Observação salva",
      description: "A observação do produto foi atualizada."
    });
  };

  const openObservationDialog = (produtoId: string) => {
    setSelectedProductId(produtoId);
    setTempObservacao(observacoes[produtoId] || '');
    setShowObservationDialog(true);
  };

  const getProdutoInfo = (produtoId: string) => {
    const produto = mockProdutos.find(p => p.id === produtoId);
    const grupo = mockGrupos.find(g => g.id === produto?.grupoId);
    const subgrupo = mockSubgrupos.find(s => s.id === produto?.subgrupoId);
    return { produto, grupo, subgrupo };
  };

  // Agrupar produtos por grupo/subgrupo para exibição
  const produtosAgrupados = useMemo(() => {
    const grupos: { [key: string]: { [key: string]: Produto[] } } = {};
    
    produtosDaColeta.forEach(produto => {
      const grupo = mockGrupos.find(g => g.id === produto.grupoId);
      const subgrupo = mockSubgrupos.find(s => s.id === produto.subgrupoId);
      
      const grupoNome = grupo?.nome || 'Sem Grupo';
      const subgrupoNome = subgrupo?.nome || 'Sem Subgrupo';
      
      if (!grupos[grupoNome]) {
        grupos[grupoNome] = {};
      }
      if (!grupos[grupoNome][subgrupoNome]) {
        grupos[grupoNome][subgrupoNome] = [];
      }
      grupos[grupoNome][subgrupoNome].push(produto);
    });
    
    return grupos;
  }, [produtosDaColeta]);

  const totalPreenchidos = Object.keys(precos).filter(id => precos[id] > 0).length;
  const totalProdutos = coleta.produtos.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-bold">Lista de Produtos</h2>
            <p className="text-sm text-muted-foreground">
              {totalPreenchidos}/{totalProdutos} preenchidos
            </p>
          </div>
        </div>
        
        <Button 
          onClick={onFinalizarColeta}
          disabled={totalPreenchidos === 0}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Finalizar
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products by Group */}
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
                    {produtos.map((produto) => (
                      <div key={produto.id} className="border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{produto.nome}</h5>
                          </div>
                          
                          <div className="w-24">
                            <Input
                              id={`preco-${produto.id}`}
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={precos[produto.id] || ''}
                              onChange={(e) => handlePrecoChange(produto.id, e.target.value)}
                              className="text-center"
                            />
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openObservationDialog(produto.id)}
                            className={observacoes[produto.id] ? 'bg-yellow-50 border-yellow-200' : ''}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {observacoes[produto.id] && (
                          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            <strong>Observação:</strong> {observacoes[produto.id]}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Observation Dialog */}
      <Dialog open={showObservationDialog} onOpenChange={setShowObservationDialog}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Observação do Produto</DialogTitle>
            <DialogDescription>
              {selectedProductId && getProdutoInfo(selectedProductId).produto?.nome}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                placeholder="Digite sua observação sobre este produto..."
                value={tempObservacao}
                onChange={(e) => setTempObservacao(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowObservationDialog(false);
                  setSelectedProductId('');
                  setTempObservacao('');
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveObservation}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};