import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Supermercado } from '@/types';

export const useSupermercados = () => {
  const [supermercados, setSupermercados] = useState<Supermercado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSupermercados();
  }, []);

  const fetchSupermercados = async () => {
    try {
      const { data, error } = await supabase
        .from('supermercados' as any)
        .select('*')
        .order('nome') as any;

      if (error) throw error;
      setSupermercados(data || []);
    } catch (error) {
      console.error('Erro ao buscar supermercados:', error);
    } finally {
      setLoading(false);
    }
  };

  return { supermercados, loading, refetch: fetchSupermercados };
};
