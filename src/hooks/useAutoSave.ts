import { useEffect, useRef, useState, useCallback } from 'react';

interface UseAutoSaveProps {
  data: any;
  onSave: (data: any) => Promise<void>;
  delay?: number;
}

// Esperas crescentes entre novas tentativas em caso de falha de gravação.
const RETRY_DELAYS = [1000, 3000, 8000, 15000];

export const useAutoSave = ({ data, onSave, delay = 2000 }: UseAutoSaveProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout>();
  const retryRef = useRef<NodeJS.Timeout>();
  const savedSnapshotRef = useRef<string>(JSON.stringify(data));
  const latestDataRef = useRef<any>(data);
  const onSaveRef = useRef(onSave);
  const inFlightRef = useRef(false);
  const retryCountRef = useRef(0);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const performSave = useCallback(async () => {
    // Evitar gravações concorrentes
    if (inFlightRef.current) return;

    const snapshot = latestDataRef.current;
    const serialized = JSON.stringify(snapshot);

    // Nada mudou desde a última gravação confirmada
    if (serialized === savedSnapshotRef.current) {
      setHasUnsaved(false);
      return;
    }

    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = undefined;
    }

    inFlightRef.current = true;
    setIsSaving(true);

    try {
      await onSaveRef.current(snapshot);
      savedSnapshotRef.current = serialized;
      retryCountRef.current = 0;
      inFlightRef.current = false;
      setSaveError(false);
      setLastSaved(new Date());
      setIsSaving(false);

      // Se os dados mudaram durante a gravação, agendar novamente
      if (JSON.stringify(latestDataRef.current) !== savedSnapshotRef.current) {
        setHasUnsaved(true);
        debounceRef.current = setTimeout(() => performSave(), delay);
      } else {
        setHasUnsaved(false);
      }
    } catch (error) {
      console.error('Erro ao salvar automaticamente:', error);
      inFlightRef.current = false;
      setIsSaving(false);
      setSaveError(true);
      setHasUnsaved(true);

      // Nova tentativa com espera crescente
      const idx = Math.min(retryCountRef.current, RETRY_DELAYS.length - 1);
      retryCountRef.current += 1;
      retryRef.current = setTimeout(() => performSave(), RETRY_DELAYS[idx]);
    }
  }, [delay]);

  // Observar mudanças nos dados e agendar gravação
  useEffect(() => {
    latestDataRef.current = data;
    const serialized = JSON.stringify(data);

    if (serialized === savedSnapshotRef.current) {
      return;
    }

    setHasUnsaved(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSave(), delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [data, delay, performSave]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, []);

  // Gravar imediatamente (usado ao finalizar ou sair da tela)
  const flush = useCallback(async () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (retryRef.current) clearTimeout(retryRef.current);
    await performSave();
  }, [performSave]);

  return { isSaving, lastSaved, saveError, hasUnsaved, flush };
};
