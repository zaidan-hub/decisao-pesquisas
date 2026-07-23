import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Cliente, Contato, GuiaPrecos } from '@/types';
import { Plus, Search, Trash2, Tags, User, FileDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useClientes } from '@/hooks/useClientes';
import { supabase } from '@/integrations/supabase/client';
import { GuiaPrecosEditor } from '@/components/admin/GuiaPrecosEditor';
import { HierarquiaPersonalizada } from '@/hooks/useRelatoriosPersonalizados';
import { useCompradores, Comprador } from '@/hooks/useCompradores';
import { CompradorFormModal } from '@/components/admin/CompradorFormModal';
import { useProdutos } from '@/hooks/useProdutos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { generateCompradorListaPDF } from '@/lib/reportGenerator';

export const ClientesPage = () => {
  const { clientes, loading, refetch } = useClientes();

  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deleteCliente, setDeleteCliente] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGuia, setShowGuia] = useState(false);
  const [showCompradorModal, setShowCompradorModal] = useState(false);
  const [editingComprador, setEditingComprador] = useState<Comprador | null>(null);
  const [deleteComprador, setDeleteComprador] = useState<Comprador | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    situacao: '' as 'Ativo' | 'Inativo' | '',
    dataInicioContrato: '',
    contatos: [] as Contato[]
  });

  const clienteIdAtual = editingCliente?.id || null;
  const { compradores, loading: loadingCompradores, refetch: refetchCompradores } = useCompradores(clienteIdAtual);
  const { produtos } = useProdutos();
  const { grupos } = useGrupos();
  const { subgrupos } = useSubgrupos();
  const { departamentos } = useDepartamentos();

  const resetForm = () => {
    setFormData({ nome: '', situacao: '', dataInicioContrato: '', contatos: [] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.situacao) {
      toast({ title: "Campos obrigatórios", description: "Nome e situação são obrigatórios.", variant: "destructive" });
      return;
    }
    try {
      const clienteData = {
        nome: formData.nome,
        situacao: formData.situacao,
        data_inicio_contrato: formData.dataInicioContrato || null,
        contatos: formData.contatos
      };
      if (editingCliente) {
        const { error } = await supabase.from('clientes' as any).update(clienteData).eq('id', editingCliente.id) as any;
        if (error) throw error;
        toast({ title: "Sucesso", description: "Cliente atualizado com sucesso!" });
      } else {
        const { error } = await supabase.from('clientes' as any).insert([clienteData]) as any;
        if (error) throw error;
        toast({ title: "Sucesso", description: "Cliente cadastrado com sucesso!" });
      }
      await refetch();
      setShowForm(false);
      setEditingCliente(null);
      resetForm();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao salvar cliente", variant: "destructive" });
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      nome: cliente.nome,
      situacao: cliente.situacao,
      dataInicioContrato: cliente.dataInicioContrato || '',
      contatos: [...cliente.contatos]
    });
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteCliente) return;
    try {
      const { error } = await supabase.from('clientes' as any).delete().eq('id', deleteCliente.id) as any;
      if (error) throw error;
      await refetch();
      setDeleteCliente(null);
      toast({ title: "Cliente excluído", description: "O cliente foi removido do sistema." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao excluir cliente", variant: "destructive" });
    }
  };

  const handleSaveGuia = async (produtosSel: string[], hierarquia: HierarquiaPersonalizada) => {
    if (!editingCliente) return;
    const guiaPrecos: GuiaPrecos = { produtos: produtosSel, hierarquiaCustomizada: hierarquia };
    try {
      const { error } = await supabase.from('clientes' as any).update({ guia_precos: guiaPrecos as any }).eq('id', editingCliente.id) as any;
      if (error) throw error;
      await refetch();
      setEditingCliente(prev => prev ? { ...prev, guiaPrecos } : prev);
      toast({ title: 'Guia de preços salvo', description: `${produtosSel.length} produto(s) no guia.` });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao salvar guia de preços', variant: 'destructive' });
      throw error;
    }
  };

  const handleDeleteComprador = async () => {
    if (!deleteComprador) return;
    try {
      const { error } = await supabase.from('compradores' as any).delete().eq('id', deleteComprador.id) as any;
      if (error) throw error;
      await refetchCompradores();
      setDeleteComprador(null);
      toast({ title: "Comprador excluído", description: "O comprador foi removido." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao excluir comprador", variant: "destructive" });
    }
  };

  const handleExportCompradorPDF = useCallback((comprador: Comprador) => {
    if (!editingCliente) return;
    const produtosComprador = produtos.filter(p => comprador.produtos.includes(p.id));
    generateCompradorListaPDF(
      comprador.nome,
      editingCliente.nome,
      produtosComprador,
      grupos,
      subgrupos,
      departamentos,
      comprador.hierarquia_customizada
    );
    toast({ title: "Sucesso", description: `PDF da lista de ${comprador.nome} gerado!` });
  }, [produtos, grupos, subgrupos, departamentos, editingCliente]);

  const addContato = () => {
    const newContato: Contato = { id: Date.now().toString(), nome: '', telefone: '', email: '' };
    setFormData(prev => ({ ...prev, contatos: [...prev.contatos, newContato] }));
  };
  const updateContato = (index: number, field: keyof Contato, value: string) => {
    setFormData(prev => ({ ...prev, contatos: prev.contatos.map((c, i) => i === index ? { ...c, [field]: value } : c) }));
  };
  const removeContato = (index: number) => {
    setFormData(prev => ({ ...prev, contatos: prev.contatos.filter((_, i) => i !== index) }));
  };

  const filteredClientes = clientes
    .filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold">Clientes</h2>

        <Dialog open={showForm} onOpenChange={(v) => { setShowForm(v); if (!v) { setEditingCliente(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingCliente(null); resetForm(); }}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCliente ? 'Editar' : 'Novo'} Cliente</DialogTitle>
              <DialogDescription>Preencha as informações do cliente</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Cliente *</Label>
                <Input id="nome" value={formData.nome} onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome completo do cliente" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="situacao">Situação *</Label>
                  <Select value={formData.situacao} onValueChange={(v: 'Ativo' | 'Inativo') => setFormData(prev => ({ ...prev, situacao: v }))}>
                    <SelectTrigger id="situacao"><SelectValue placeholder="Selecione a situação" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataContrato">Data de Início do Contrato</Label>
                  <Input id="dataContrato" type="date" value={formData.dataInicioContrato} onChange={(e) => setFormData(prev => ({ ...prev, dataInicioContrato: e.target.value }))} />
                </div>
              </div>

              {/* Contatos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Contatos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addContato}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Contato
                  </Button>
                </div>
                {formData.contatos.map((contato, index) => (
                  <Card key={contato.id}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Contato {index + 1}</h4>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeContato(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Input placeholder="Nome" value={contato.nome} onChange={(e) => updateContato(index, 'nome', e.target.value)} />
                          <Input placeholder="Telefone" value={contato.telefone} onChange={(e) => updateContato(index, 'telefone', e.target.value)} />
                          <Input placeholder="Email" type="email" value={contato.email} onChange={(e) => updateContato(index, 'email', e.target.value)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Guia de Preços Personalizado */}
              {editingCliente && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Guia de Preços Personalizado</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowGuia(true)}>
                      <Tags className="w-4 h-4 mr-2" />
                      {editingCliente.guiaPrecos && editingCliente.guiaPrecos.produtos.length > 0 ? 'Editar Guia' : 'Criar Guia'}
                    </Button>
                  </div>
                  <Card>
                    <CardContent className="pt-4">
                      {editingCliente.guiaPrecos && editingCliente.guiaPrecos.produtos.length > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {editingCliente.guiaPrecos.produtos.length} produto(s) no guia personalizado.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhum guia personalizado cadastrado. Sem um guia, será usada a lista padrão de produtos.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Compradores */}
              {editingCliente && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Compradores</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => { setEditingComprador(null); setShowCompradorModal(true); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Comprador
                    </Button>
                  </div>
                  {loadingCompradores ? (
                    <p className="text-sm text-muted-foreground">Carregando...</p>
                  ) : compradores.length === 0 ? (
                    <Card><CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Nenhum comprador cadastrado para este cliente.</p>
                    </CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {compradores.map((comprador) => (
                        <Card key={comprador.id}>
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{comprador.nome}</p>
                                  <p className="text-xs text-muted-foreground">{comprador.produtos.length} produto(s)</p>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleExportCompradorPDF(comprador)} title="Exportar PDF">
                                  <FileDown className="w-4 h-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingComprador(comprador); setShowCompradorModal(true); }}>
                                  Editar
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteComprador(comprador)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingCliente(null); resetForm(); }}>
                  Cancelar
                </Button>
                <Button type="submit">{editingCliente ? 'Atualizar' : 'Cadastrar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar clientes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      {/* List */}
      <div className="grid gap-4">
        {filteredClientes.map((cliente) => (
          <Card key={cliente.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleEdit(cliente)}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-lg truncate">{cliente.nome}</h3>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteCliente(cliente); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteCliente} onOpenChange={() => setDeleteCliente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{deleteCliente?.nome}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Guia de Preços */}
      <GuiaPrecosEditor open={showGuia} onOpenChange={setShowGuia} cliente={editingCliente} onSaved={handleSaveGuia} />

      {/* Comprador Modal */}
      {showCompradorModal && editingCliente && (
        <CompradorFormModal
          open={showCompradorModal}
          onOpenChange={setShowCompradorModal}
          clienteId={editingCliente.id}
          editingComprador={editingComprador}
          onSaved={refetchCompradores}
        />
      )}

      <AlertDialog open={!!deleteComprador} onOpenChange={() => setDeleteComprador(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comprador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o comprador "{deleteComprador?.nome}"? Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComprador} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
