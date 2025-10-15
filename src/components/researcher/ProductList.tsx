import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Search, MessageSquare, CheckCircle, Camera } from 'lucide-react';
import { Coleta, Produto, Grupo, Subgrupo } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useProdutos } from '@/hooks/useProdutos';

interface ProductListProps {
  coleta: Coleta;
  onBack: () => void;
  onUpdatePrecos: (
    precos: { [produtoId: string]: number }, 
    observacoes: { [produtoId: string]: string }, 
    fotos?: { [produtoId: string]: string[] },
    textosMaisBarato?: { [produtoId: string]: string }
  ) => void;
  onFinalizarColeta: () => void;
}

export const ProductList = React.memo(({ coleta, onBack, onUpdatePrecos, onFinalizarColeta }: ProductListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [precos, setPrecos] = useState<{ [produtoId: string]: number }>(coleta.precos || {});
  const [observacoes, setObservacoes] = useState<{ [produtoId: string]: string }>(coleta.observacoesProdutos || {});
  const [fotos, setFotos] = useState<{ [produtoId: string]: string[] }>(coleta.fotos || {});
  const [textosMaisBarato, setTextosMaisBarato] = useState<{ [produtoId: string]: string }>(coleta.textosMaisBarato || {});
  const [showObservationDialog, setShowObservationDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [tempObservacao, setTempObservacao] = useState('');

  // Buscar dados reais do banco
  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();
  const { produtos, loading: loadingProdutos, refetch } = useProdutos();

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Produtos da coleta ordenados por grupo > subgrupo > produto
  const produtosDaColeta = useMemo(() => {
    console.log('🔍 INICIO - Todos os produtos:', produtos.length);
    console.log('🔍 INICIO - Produtos com maisBarato:', produtos.filter(p => p.maisBarato).map(p => ({ id: p.id, nome: p.nome, maisBarato: p.maisBarato })));
    
    const produtosFiltrados = produtos.filter(p => coleta.produtos.includes(p.id));
    console.log('🔍 APÓS FILTRO ID - Produtos filtrados:', produtosFiltrados.length);
    console.log('🔍 APÓS FILTRO ID - Com maisBarato:', produtosFiltrados.filter(p => p.maisBarato).map(p => ({ id: p.id, nome: p.nome, maisBarato: p.maisBarato })));
    
    // Filtrar por busca
    const produtosComBusca = produtosFiltrados.filter(p =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );
    console.log('🔍 APÓS BUSCA - Produtos com busca:', produtosComBusca.length);
    console.log('🔍 APÓS BUSCA - Com maisBarato:', produtosComBusca.filter(p => p.maisBarato).map(p => ({ id: p.id, nome: p.nome, maisBarato: p.maisBarato })));

    // Ordenar por grupo > subgrupo > produto
    const sorted = produtosComBusca.sort((a, b) => {
      const grupoA = grupos.find(g => g.id === a.grupoId);
      const grupoB = grupos.find(g => g.id === b.grupoId);
      const subgrupoA = subgrupos.find(s => s.id === a.subgrupoId);
      const subgrupoB = subgrupos.find(s => s.id === b.subgrupoId);
      
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
    
    console.log('🔍 APÓS SORT - Produtos ordenados:', sorted.length);
    console.log('🔍 APÓS SORT - Com maisBarato:', sorted.filter(p => p.maisBarato).map(p => ({ id: p.id, nome: p.nome, maisBarato: p.maisBarato })));
    console.log('🔍 FINAL - Primeiro produto completo:', sorted[0]);
    
    return sorted;
  }, [coleta.produtos, searchTerm, produtos, grupos, subgrupos]);

  // Debug: verificar quais produtos da coleta têm maisBarato = true
  useEffect(() => {
    const marked = produtosDaColeta.filter(p => p.maisBarato);
    console.log('🔎 Produtos com maisBarato=true:', marked.map(p => ({ id: p.id, nome: p.nome })));
  }, [produtosDaColeta]);
  const handlePrecoChange = (produtoId: string, valor: string) => {
    const precoNumerico = parseFloat(valor) || 0;
    const novosPrecos = { ...precos, [produtoId]: precoNumerico };
    setPrecos(novosPrecos);
    onUpdatePrecos(novosPrecos, observacoes, fotos, textosMaisBarato);
  };

  const handleTextoMaisBaratoChange = (produtoId: string, texto: string) => {
    const novosTextos = { ...textosMaisBarato, [produtoId]: texto };
    setTextosMaisBarato(novosTextos);
    onUpdatePrecos(precos, observacoes, fotos, novosTextos);
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
    onUpdatePrecos(precos, novasObservacoes, fotos, textosMaisBarato);
    
    setShowObservationDialog(false);
    setSelectedProductId('');
    setTempObservacao('');
    
    toast({
      title: "Observação salva",
      description: "A observação do produto foi atualizada."
    });
  };

  const handleFotoCapture = (produtoId: string) => {
    // Criar input file temporário
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Para usar câmera traseira em dispositivos móveis
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageDataUrl = event.target?.result as string;
          const novasFotos = {
            ...fotos,
            [produtoId]: [...(fotos[produtoId] || []), imageDataUrl]
          };
          setFotos(novasFotos);
          onUpdatePrecos(precos, observacoes, novasFotos, textosMaisBarato);
          
          toast({
            title: "Foto adicionada",
            description: "A foto foi anexada ao produto."
          });
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  const handleRemoverFoto = (produtoId: string, fotoIndex: number) => {
    const novasFotos = { ...fotos };
    novasFotos[produtoId] = novasFotos[produtoId].filter((_, index) => index !== fotoIndex);
    
    if (novasFotos[produtoId].length === 0) {
      delete novasFotos[produtoId];
    }
    
    setFotos(novasFotos);
    onUpdatePrecos(precos, observacoes, novasFotos, textosMaisBarato);
    
    toast({
      title: "Foto removida",
      description: "A foto foi removida do produto."
    });
  };

  const openObservationDialog = (produtoId: string) => {
    setSelectedProductId(produtoId);
    setTempObservacao(observacoes[produtoId] || '');
    setShowObservationDialog(true);
  };

  const getProdutoInfo = (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    const grupo = grupos.find(g => g.id === produto?.grupoId);
    const subgrupo = subgrupos.find(s => s.id === produto?.subgrupoId);
    return { produto, grupo, subgrupo };
  };

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

  const totalPreenchidos = Object.keys(precos).filter(id => precos[id] > 0).length;
  const totalProdutos = coleta.produtos.length;

  // Se ainda estiver carregando produtos, mostrar loading
  if (loadingProdutos) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-lg font-bold">Lista de Produtos</h2>
              <p className="text-sm text-muted-foreground">Carregando produtos...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          onClick={() => setShowConfirmDialog(true)}
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
                            {produto.maisBarato && (
                              <span className="text-xs text-blue-600 font-semibold">+ Barato</span>
                            )}
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
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFotoCapture(produto.id)}
                              className={fotos[produto.id] && fotos[produto.id].length > 0 ? 'bg-blue-50 border-blue-200' : ''}
                            >
                              <Camera className="w-4 h-4" />
                            </Button>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openObservationDialog(produto.id)}
                              className={observacoes[produto.id] ? 'bg-yellow-50 border-yellow-200' : ''}
                            >
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Campo de texto adicional para produtos "mais barato" */}
                        {produto.maisBarato && (
                          <div className="mt-3">
                            <Label htmlFor={`texto-${produto.id}`} className="text-xs">
                              Marca:
                            </Label>
                            <Input
                              id={`texto-${produto.id}`}
                              type="text"
                              placeholder="Ex: Carrijo"
                              value={textosMaisBarato[produto.id] || ''}
                              onChange={(e) => handleTextoMaisBaratoChange(produto.id, e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        )}
                        
                        {/* Exibir fotos anexadas */}
                        {fotos[produto.id] && fotos[produto.id].length > 0 && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-xs font-medium mb-2">Fotos anexadas:</p>
                            <div className="flex flex-wrap gap-2">
                              {fotos[produto.id].map((foto, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={foto}
                                    alt={`Foto ${index + 1} do produto`}
                                    className="w-16 h-16 object-cover rounded border cursor-pointer"
                                    onClick={() => {
                                      // Abrir foto em nova aba para visualização completa
                                      const newWindow = window.open();
                                      if (newWindow) {
                                        newWindow.document.body.innerHTML = `<img src="${foto}" style="max-width:100%; max-height:100vh;" />`;
                                      }
                                    }}
                                  />
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="absolute -top-1 -right-1 w-5 h-5 p-0 rounded-full text-xs"
                                    onClick={() => handleRemoverFoto(produto.id, index)}
                                  >
                                    ×
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
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

      {/* Confirm Finalize Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
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
            <Button onClick={() => {
              setShowConfirmDialog(false);
              onFinalizarColeta();
            }}>
              Sim, Finalizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});