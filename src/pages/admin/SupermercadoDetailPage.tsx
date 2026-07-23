import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Supermercado } from '@/types';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

  const hasChanges = formData.nome !== originalData.nome ||
    formData.endereco !== originalData.endereco ||
    formData.abreviacao !== originalData.abreviacao;

  const handleBack = useCallback(() => {
    if (hasChanges) setShowUnsavedDialog(true);
    else onBack();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h2 className="text-2xl font-bold">{supermercado.nome}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações do Supermercado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="detail-nome">Nome do Supermercado *</Label>
            <Input id="detail-nome" value={formData.nome} onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))} placeholder="Nome do supermercado" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-abreviacao">Abreviação</Label>
            <Input id="detail-abreviacao" value={formData.abreviacao} onChange={(e) => setFormData(prev => ({ ...prev, abreviacao: e.target.value }))} placeholder="Abreviação para usar nas colunas" maxLength={20} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="detail-endereco">Endereço *</Label>
            <Input id="detail-endereco" value={formData.endereco} onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))} placeholder="Endereço completo" />
          </div>
          <div className="flex justify-between pt-4">
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Supermercado
            </Button>
            <Button onClick={handleUpdate} disabled={!hasChanges}>Atualizar</Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o supermercado "{supermercado.nome}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleFirstDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Sim, excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogAction onClick={handleFinalDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir permanentemente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>Você tem alterações não salvas. Se sair agora, as informações não serão atualizadas. Deseja atualizar antes de sair?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowUnsavedDialog(false); onBack(); }}>Sair sem salvar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await handleUpdate(); setShowUnsavedDialog(false); onBack(); }}>Atualizar e sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
