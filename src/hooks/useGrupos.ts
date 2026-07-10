import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Grupo } from '@/types';

export const useGrupos = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGrupos();
  }, []);

  const fetchGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('grupos')
        .select('*')
        .order('nome');

      if (error) throw error;
      
      const mappedData = (data || []).map(item => ({
        id: item.id,
        codigo: item.codigo,
        nome: item.nome,
        departamentoId: item.departamento_id,
        ordem: (item as any).ordem ?? undefined
      }));
      
      setGrupos(mappedData);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
    } finally {
      setLoading(false);
    }
  };

  return { grupos, loading, refetch: fetchGrupos };
};
