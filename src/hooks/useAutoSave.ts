import { useEffect, useRef, useState } from 'react';

interface UseAutoSaveProps {
  data: any;
  onSave: (data: any) => Promise<void>;
  delay?: number;
}

export const useAutoSave = ({ data, onSave, delay = 2000 }: UseAutoSaveProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<any>(data);

  useEffect(() => {
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Verificar se houve mudança nos dados
    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);
    
    if (!hasChanged) {
      return;
    }

    setIsSaving(true);

    // Agendar salvamento
    timeoutRef.current = setTimeout(async () => {
      try {
        await onSave(data);
        previousDataRef.current = data;
        setLastSaved(new Date());
      } catch (error) {
        console.error('Erro ao salvar automaticamente:', error);
      } finally {
        setIsSaving(false);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, onSave, delay]);

  return { isSaving, lastSaved };
};
