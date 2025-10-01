import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lista } from '@/types';

export const useListas = () => {
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListas();
  }, []);

  const fetchListas = async () => {
    try {
      const { data, error } = await supabase
        .from('listas' as any)
        .select('*')
        .order('nome') as any;

      if (error) throw error;
      setListas(data || []);
    } catch (error) {
      console.error('Erro ao buscar listas:', error);
    } finally {
      setLoading(false);
    }
  };

  return { listas, loading, refetch: fetchListas };
};
