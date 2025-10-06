import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Coleta, Supermercado, Pesquisador } from '@/types';
import { Plus, Search, Calendar, Store, User, FileText, Package, Bell, Edit2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AdminColetaView } from '@/components/admin/AdminColetaView';
import { useSupermercados } from '@/hooks/useSupermercados';
import { usePesquisadores } from '@/hooks/usePesquisadores';
import { useColetas } from '@/hooks/useColetas';
import { useColetasAdmin } from '@/hooks/useColetasAdmin';
import { useListas } from '@/hooks/useListas';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

export const PesquisasPage = () => {
  const { supermercados, loading: loadingSupermercados } = useSupermercados();
  const { pesquisadores, loading: loadingPesquisadores } = usePesquisadores();
  const { coletas: coletasAdmin, loading: loadingColetas, refetch: refetchColetas } = useColetasAdmin();
  const { createColeta, updateColeta, deleteColeta } = useColetas();
  const { listas } = useListas();

  const [showForm, setShowForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedColeta, setSelectedColeta] = useState<Coleta | null>(null);
  const [coletaToEdit, setColetaToEdit] = useState<Coleta | null>(null);
  const [coletaToDelete, setColetaToDelete] = useState<Coleta | null>(null);
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    supermercadoId: '',
    pesquisadorId: '',
    listaId: '',
    ano: new Date().getFullYear().toString()
  });
  const [editFormData, setEditFormData] = useState({
    data: '',
    supermercadoId: '',
    pesquisadorId: '',
    ano: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔵 SUBMIT INICIADO');
    console.log('📋 FORM DATA:', formData);
    
    if (!formData.supermercadoId || !formData.pesquisadorId || !formData.listaId) {
      console.log('❌ VALIDAÇÃO FALHOU - campos obrigatórios vazios');
      toast({
        title: "Campos obrigatórios",
        description: "Supermercado, pesquisador e lista são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ VALIDAÇÃO OK - preparando coleta');

    // Buscar produtos da lista selecionada
    const lista = listas.find(l => l.id === formData.listaId);
    const produtosColeta = lista?.produtos || [];
    console.log('📦 PRODUTOS DA LISTA:', produtosColeta.length);

    // Gerar número automaticamente baseado no total de coletas + 1
    const proximoNumero = String(coletasAdmin.length + 1).padStart(3, '0');
    console.log('🔢 NÚMERO GERADO:', proximoNumero);

    const novaColeta: Omit<Coleta, 'id'> = {
      data: formData.data,
      supermercadoId: formData.supermercadoId,
      pesquisadorId: formData.pesquisadorId,
      numero: proximoNumero,
      ano: formData.ano,
      status: 'não iniciada',
      produtos: produtosColeta,
      precos: {},
      observacoesProdutos: {},
      observacoesFinais: [],
      fotos: {}
    };

    console.log('📝 NOVA COLETA:', novaColeta);
    console.log('🚀 CHAMANDO createColeta...');

    const { error } = await createColeta(novaColeta);
    
    console.log('📡 RESPOSTA:', { error });
    
    if (error) {
      console.log('❌ ERRO AO CRIAR:', error);
      toast({
        title: "Erro",
        description: error,
        variant: "destructive"
      });
    } else {
      console.log('✅ COLETA CRIADA COM SUCESSO');
      toast({
        title: "Sucesso",
        description: "Coleta cadastrada com sucesso!"
      });
      setShowForm(false);
      resetForm();
      refetchColetas(); // Atualizar lista otimizada
    }
  };

  const resetForm = () => {
    setFormData({
      data: new Date().toISOString().split('T')[0],
      supermercadoId: '',
      pesquisadorId: '',
      listaId: '',
      ano: new Date().getFullYear().toString()
    });
  };

  const handleUpdateColeta = async (coletaId: string, updatedData: Partial<Coleta>) => {
    await updateColeta(coletaId, updatedData);
  };

  const handleViewColeta = async (coletaId: string) => {
    // Buscar dados completos apenas quando necessário
    const { data, error } = await supabase
      .from('coletas')
      .select('*')
      .eq('id', coletaId)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes da coleta.",
        variant: "destructive"
      });
      return;
    }

    // Formatar coleta completa
    const coletaCompleta: Coleta = {
      id: data.id,
      data: data.data,
      supermercadoId: data.supermercado_id,
      pesquisadorId: data.pesquisador_id,
      numero: data.numero,
      ano: data.ano,
      status: data.status as Coleta['status'],
      produtos: data.produtos || [],
      precos: (data.precos as any) || {},
      precosEditadosAdmin: (data.precos_editados_admin as any) || {},
      observacoesProdutos: (data.observacoes_produtos as any) || {},
      observacoesFinais: (data.observacoes_finais as any) || [],
      adminVisualizouObservacoes: data.admin_visualizou_observacoes || false,
      fotos: (data.fotos as any) || {}
    };

    setSelectedColeta(coletaCompleta);
  };

  const handleEditColeta = async (coletaAdmin: any) => {
    if (coletaAdmin.status !== 'não iniciada') {
      toast({
        title: "Ação não permitida",
        description: "Apenas coletas não iniciadas podem ser editadas.",
        variant: "destructive"
      });
      return;
    }

    // Buscar dados completos para edição
    const { data, error } = await supabase
      .from('coletas')
      .select('*')
      .eq('id', coletaAdmin.id)
      .single();

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os detalhes da coleta.",
        variant: "destructive"
      });
      return;
    }

    const coletaCompleta: Coleta = {
      id: data.id,
      data: data.data,
      supermercadoId: data.supermercado_id,
      pesquisadorId: data.pesquisador_id,
      numero: data.numero,
      ano: data.ano,
      status: data.status as Coleta['status'],
      produtos: data.produtos || [],
      precos: (data.precos as any) || {},
      precosEditadosAdmin: (data.precos_editados_admin as any) || {},
      observacoesProdutos: (data.observacoes_produtos as any) || {},
      observacoesFinais: (data.observacoes_finais as any) || [],
      adminVisualizouObservacoes: data.admin_visualizou_observacoes || false,
      fotos: (data.fotos as any) || {}
    };
    
    setColetaToEdit(coletaCompleta);
    setEditFormData({
      data: coletaCompleta.data.split('T')[0],
      supermercadoId: coletaCompleta.supermercadoId,
      pesquisadorId: coletaCompleta.pesquisadorId,
      ano: coletaCompleta.ano || ''
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!coletaToEdit) return;
    
    await updateColeta(coletaToEdit.id, {
      data: editFormData.data,
      supermercadoId: editFormData.supermercadoId,
      pesquisadorId: editFormData.pesquisadorId,
      ano: editFormData.ano
    });
    
    toast({
      title: "Sucesso",
      description: "Coleta atualizada com sucesso!"
    });
    
    setShowEditDialog(false);
    setColetaToEdit(null);
    refetchColetas(); // Atualizar lista otimizada
  };

  const handleDeleteColeta = (coletaAdmin: any) => {
    if (coletaAdmin.status !== 'não iniciada') {
      toast({
        title: "Ação não permitida",
        description: "Apenas coletas não iniciadas podem ser deletadas.",
        variant: "destructive"
      });
      return;
    }
    
    setColetaToDelete(coletaAdmin);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!coletaToDelete) return;
    
    await deleteColeta(coletaToDelete.id);
    
    toast({
      title: "Sucesso",
      description: "Coleta deletada com sucesso!"
    });
    
    setShowDeleteDialog(false);
    setColetaToDelete(null);
    refetchColetas(); // Atualizar lista otimizada
  };

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  };

  const getSupermercadoNome = (id: string) => {
    return supermercados.find(s => s.id === id)?.nome || 'N/A';
  };

  const getPesquisadorNome = (id: string) => {
    return pesquisadores.find(p => p.id === id)?.nome || 'N/A';
  };

  // Coletas já vêm ordenadas do hook useColetasAdmin
  const coletasOrdenadas = coletasAdmin;

  // Se uma coleta está selecionada, mostrar a visualização admin
  if (selectedColeta) {
    return (
      <AdminColetaView
        coleta={selectedColeta}
        onBack={() => setSelectedColeta(null)}
        onUpdateColeta={handleUpdateColeta}
        supermercados={supermercados}
      />
    );
  }

  const getStatusColor = (status: Coleta['status']) => {
    switch (status) {
      case 'não iniciada':
        return 'bg-destructive text-destructive-foreground';
      case 'iniciada':
        return 'bg-yellow-500 text-white';
      case 'finalizada':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Coletas</h2>
        </div>
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Coleta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Coleta</DialogTitle>
              <DialogDescription>
                Cadastre uma nova coleta de preços
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="data">Data *</Label>
                <Input
                  id="data"
                  name="data"
                  type="date"
                  autoComplete="off"
                  value={formData.data}
                  onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Formato: DD/MM/AAAA, GMT -03:00 (Horário de Brasília)
                </p>
              </div>

              <div className="space-y-2">
                <Label id="label-supermercado">Supermercado Pesquisado *</Label>
                <Select 
                  value={formData.supermercadoId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supermercadoId: value }))}
                  required
                >
                  <SelectTrigger aria-labelledby="label-supermercado">
                    <SelectValue placeholder="Selecione o supermercado" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingSupermercados ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : supermercados.length === 0 ? (
                      <SelectItem value="empty" disabled>Nenhum supermercado cadastrado</SelectItem>
                    ) : (
                      supermercados.map((supermercado) => (
                        <SelectItem key={supermercado.id} value={supermercado.id}>
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4" />
                            {supermercado.nome}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <input type="hidden" name="supermercadoId" value={formData.supermercadoId} autoComplete="off" />
              </div>

              <div className="space-y-2">
                <Label id="label-pesquisador">Pesquisador *</Label>
                <Select 
                  value={formData.pesquisadorId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, pesquisadorId: value }))}
                  required
                >
                  <SelectTrigger aria-labelledby="label-pesquisador">
                    <SelectValue placeholder="Selecione o pesquisador" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingPesquisadores ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : pesquisadores.filter(p => p.ativo).length === 0 ? (
                      <SelectItem value="empty" disabled>Nenhum pesquisador ativo</SelectItem>
                    ) : (
                      pesquisadores.filter(p => p.ativo).map((pesquisador) => (
                        <SelectItem key={pesquisador.id} value={pesquisador.id}>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {pesquisador.nome}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <input type="hidden" name="pesquisadorId" value={formData.pesquisadorId} autoComplete="off" />
              </div>

              <div className="space-y-2">
                <Label id="label-lista">Lista de Produtos *</Label>
                <Select 
                  value={formData.listaId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, listaId: value }))}
                  required
                >
                  <SelectTrigger aria-labelledby="label-lista">
                    <SelectValue placeholder="Selecione uma lista" />
                  </SelectTrigger>
                  <SelectContent>
                    {listas.length === 0 ? (
                      <SelectItem value="empty" disabled>Nenhuma lista cadastrada</SelectItem>
                    ) : (
                      listas.map((lista) => (
                        <SelectItem key={lista.id} value={lista.id}>
                          {lista.nome} ({lista.produtos.length} produtos)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <input type="hidden" name="listaId" value={formData.listaId} autoComplete="off" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ano">Ano</Label>
                <Input
                  id="ano"
                  name="ano"
                  autoComplete="off"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  value={formData.ano}
                  onChange={(e) => setFormData(prev => ({ ...prev, ano: e.target.value }))}
                  placeholder="2024"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  Cadastrar Coleta
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Coletas */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Coletas Realizadas
            </CardTitle>
            <CardDescription>
              Ordenadas cronologicamente (mais recentes primeiro)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingColetas ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg">
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : coletasOrdenadas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma coleta cadastrada ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {coletasOrdenadas.map((coleta) => (
                <div 
                  key={coleta.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{formatDate(coleta.data)}</span>
                      </div>
                      
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(coleta.status)}`}>
                        {coleta.status.charAt(0).toUpperCase() + coleta.status.slice(1)}
                      </span>
                      
                      {coleta.numero && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Nº:</span>
                          <span className="text-sm font-medium">{coleta.numero}</span>
                        </div>
                      )}
                      
                      {coleta.ano && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Ano:</span>
                          <span className="text-sm font-medium">{coleta.ano}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        <span><strong>Supermercado:</strong> {getSupermercadoNome(coleta.supermercadoId)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span><strong>Pesquisador:</strong> {getPesquisadorNome(coleta.pesquisadorId)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span><strong>Produtos:</strong> {coleta.produtosCount} itens</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3 sm:mt-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewColeta(coleta.id)}
                    >
                      <Search className="w-4 h-4 mr-1" />
                      Visualizar
                    </Button>
                    
                    {coleta.status === 'não iniciada' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditColeta(coleta)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteColeta(coleta)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Coleta</DialogTitle>
            <DialogDescription>
              Altere as informações da coleta não iniciada
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-data">Data *</Label>
              <Input
                id="edit-data"
                type="date"
                value={editFormData.data}
                onChange={(e) => setEditFormData(prev => ({ ...prev, data: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Supermercado Pesquisado *</Label>
              <Select 
                value={editFormData.supermercadoId} 
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, supermercadoId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o supermercado" />
                </SelectTrigger>
                <SelectContent>
                  {supermercados.map((supermercado) => (
                    <SelectItem key={supermercado.id} value={supermercado.id}>
                      {supermercado.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pesquisador *</Label>
              <Select 
                value={editFormData.pesquisadorId} 
                onValueChange={(value) => setEditFormData(prev => ({ ...prev, pesquisadorId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o pesquisador" />
                </SelectTrigger>
                <SelectContent>
                  {pesquisadores.filter(p => p.ativo).map((pesquisador) => (
                    <SelectItem key={pesquisador.id} value={pesquisador.id}>
                      {pesquisador.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-ano">Ano</Label>
              <Input
                id="edit-ano"
                value={editFormData.ano}
                onChange={(e) => setEditFormData(prev => ({ ...prev, ano: e.target.value }))}
                placeholder="2024"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditDialog(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta coleta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};