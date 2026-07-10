import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Subgrupo } from '@/types';

export const useSubgrupos = (grupoId?: string) => {
  const [subgrupos, setSubgrupos] = useState<Subgrupo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubgrupos();
  }, [grupoId]);

  const fetchSubgrupos = async () => {
    try {
      let query = supabase
        .from('subgrupos')
        .select('*')
        .order('nome');

      if (grupoId) {
        query = query.eq('grupo_id', grupoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Mapear os campos do banco para o tipo TypeScript
      const mappedData = (data || []).map(item => ({
        id: item.id,
        codigo: item.codigo,
        nome: item.nome,
        grupoId: item.grupo_id,
        ordem: (item as any).ordem ?? undefined
      }));
      
      setSubgrupos(mappedData);
    } catch (error) {
      console.error('Erro ao buscar subgrupos:', error);
    } finally {
      setLoading(false);
    }
  };

  return { subgrupos, loading, refetch: fetchSubgrupos };
};
