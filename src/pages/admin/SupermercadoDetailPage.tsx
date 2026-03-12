import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Supermercado } from '@/types';
import { ArrowLeft, Trash2, Plus, ShoppingCart, User, FileDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCompradores, Comprador } from '@/hooks/useCompradores';
import { useProdutos } from '@/hooks/useProdutos';
import { useGrupos } from '@/hooks/useGrupos';
import { useSubgrupos } from '@/hooks/useSubgrupos';
import { useDepartamentos } from '@/hooks/useDepartamentos';
import { CompradorFormModal } from '@/components/admin/CompradorFormModal';
import { generateCompradorListaPDF } from '@/lib/reportGenerator';

interface SupermercadoDetailPageProps {
  supermercado: Supermercado;
  onBack: () => void;
}

export const SupermercadoDetailPage = ({ supermercado, onBack }: SupermercadoDetailPageProps) => {
  const [formData, setFormData] = useState({
    nome: supermercado.nome,
    endereco: supermercado.endereco,
    abreviacao: supermercado.abreviacao || ''
  });
  const [originalData, setOriginalData] = useState({ ...formData });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteConfirm2, setShowDeleteConfirm2] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showCompradorModal, setShowCompradorModal] = useState(false);
  const [editingComprador, setEditingComprador] = useState<Comprador | null>(null);
  const [deleteComprador, setDeleteComprador] = useState<Comprador | null>(null);

  const { compradores, loading: loadingCompradores, refetch: refetchCompradores } = useCompradores(supermercado.id);

  const hasChanges = formData.nome !== originalData.nome ||
    formData.endereco !== originalData.endereco ||
    formData.abreviacao !== originalData.abreviacao;

  const handleBack = useCallback(() => {
    if (hasChanges) {
      setShowUnsavedDialog(true);
    } else {
      onBack();
    }
  }, [hasChanges, onBack]);

  const handleUpdate = async () => {
    if (!formData.nome || !formData.endereco) {
      toast({ title: "Campos obrigatórios", description: "Nome e endereço são obrigatórios.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase
        .from('supermercados' as any)
        .update({ nome: formData.nome, endereco: formData.endereco, abreviacao: formData.abreviacao || null })
        .eq('id', supermercado.id) as any;
      if (error) throw error;
      setOriginalData({ ...formData });
      toast({ title: "Sucesso", description: "Supermercado atualizado com sucesso!" });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar supermercado", variant: "destructive" });
    }
  };

  const handleFirstDelete = () => {
    setShowDeleteConfirm(false);
    setShowDeleteConfirm2(true);
  };

  const handleFinalDelete = async () => {
    try {
      const { error } = await supabase
        .from('supermercados' as any)
        .delete()
        .eq('id', supermercado.id) as any;
      if (error) throw error;
      toast({ title: "Supermercado excluído", description: "O supermercado foi removido do sistema." });
      onBack();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao excluir supermercado", variant: "destructive" });
    }
  };

  const handleDeleteComprador = async () => {
    if (!deleteComprador) return;
    try {
      const { error } = await supabase
        .from('compradores' as any)
        .delete()
        .eq('id', deleteComprador.id) as any;
      if (error) throw error;
      await refetchCompradores();
      setDeleteComprador(null);
      toast({ title: "Comprador excluído", description: "O comprador foi removido." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao excluir comprador", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-2xl font-bold">{supermercado.nome}</h2>
      </div>

      {/* Dados do Supermercado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Supermercado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="detail-nome">Nome do Supermercado *</Label>
            <Input
              id="detail-nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome do supermercado"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-abreviacao">Abreviação</Label>
            <Input
              id="detail-abreviacao"
              value={formData.abreviacao}
              onChange={(e) => setFormData(prev => ({ ...prev, abreviacao: e.target.value }))}
              placeholder="Abreviação para usar nas colunas"
              maxLength={20}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-endereco">Endereço *</Label>
            <Input
              id="detail-endereco"
              value={formData.endereco}
              onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
              placeholder="Endereço completo"
            />
          </div>
          <div className="flex justify-between pt-4">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Supermercado
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!hasChanges}
            >
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compradores */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Compradores</CardTitle>
          <Button size="sm" onClick={() => { setEditingComprador(null); setShowCompradorModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Comprador
          </Button>
        </CardHeader>
        <CardContent>
          {loadingCompradores ? (
            <p className="text-muted-foreground text-center py-4">Carregando...</p>
          ) : compradores.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum comprador cadastrado</p>
              <p className="text-sm text-muted-foreground">Clique em "Novo Comprador" para adicionar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {compradores.map((comprador) => (
                <Card key={comprador.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{comprador.nome}</p>
                          <p className="text-sm text-muted-foreground">{comprador.produtos.length} produto(s)</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEditingComprador(comprador); setShowCompradorModal(true); }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteComprador(comprador)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comprador Modal */}
      {showCompradorModal && (
        <CompradorFormModal
          open={showCompradorModal}
          onOpenChange={setShowCompradorModal}
          supermercadoId={supermercado.id}
          editingComprador={editingComprador}
          onSaved={refetchCompradores}
        />
      )}

      {/* Delete Confirmation 1 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o supermercado "{supermercado.nome}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFirstDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation 2 (extra) */}
      <AlertDialog open={showDeleteConfirm2} onOpenChange={setShowDeleteConfirm2}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmação final</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>Essa ação não pode ser desfeita.</strong> Todos os dados relacionados a este supermercado serão perdidos permanentemente. Deseja realmente continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved changes dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Se sair agora, as informações não serão atualizadas. Deseja atualizar antes de sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowUnsavedDialog(false); onBack(); }}>
              Sair sem salvar
            </AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await handleUpdate(); setShowUnsavedDialog(false); onBack(); }}>
              Atualizar e sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete comprador */}
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
