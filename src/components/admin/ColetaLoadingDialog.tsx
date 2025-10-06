import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface ColetaLoadingDialogProps {
  isOpen: boolean;
  progress: number;
  message: string;
}

export const ColetaLoadingDialog = ({ isOpen, progress, message }: ColetaLoadingDialogProps) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Carregando Coleta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Progress value={progress} className="h-3" />
          <div className="text-center">
            <p className="text-lg font-semibold">{progress}%</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
