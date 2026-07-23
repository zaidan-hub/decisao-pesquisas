import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Comprador {
  id: string;
  cliente_id: string;
  nome: string;
  produtos: string[];
  hierarquia_customizada: any;
  created_at: string;
}

export const useCompradores = (clienteId: string | null | undefined) => {
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clienteId) {
      fetchCompradores();
    } else {
      setCompradores([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  const fetchCompradores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('compradores' as any)
        .select('*')
        .eq('cliente_id', clienteId as string)
        .order('nome') as any;

      if (error) throw error;
      setCompradores(data || []);
    } catch (error) {
      console.error('Erro ao buscar compradores:', error);
    } finally {
      setLoading(false);
    }
  };

  return { compradores, loading, refetch: fetchCompradores };
};
