import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pesquisador } from '@/types';

export const usePesquisadores = () => {
  const [pesquisadores, setPesquisadores] = useState<Pesquisador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPesquisadores();
  }, []);

  const fetchPesquisadores = async () => {
    try {
      const { data, error } = await supabase
        .from('pesquisadores' as any)
        .select('*')
        .order('nome') as any;

      if (error) throw error;
      setPesquisadores(data || []);
    } catch (error) {
      console.error('Erro ao buscar pesquisadores:', error);
    } finally {
      setLoading(false);
    }
  };

  return { pesquisadores, loading, refetch: fetchPesquisadores };
};
