import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Produto } from '@/types';

export const useProdutos = (subgrupoId?: string) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProdutos();
  }, [subgrupoId]);

  const fetchProdutos = async () => {
    try {
      let query = supabase
        .from('produtos')
        .select('*')
        .order('nome');

      if (subgrupoId) {
        query = query.eq('subgrupo_id', subgrupoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Mapear os campos do banco para o tipo TypeScript
      const mappedData = (data || []).map(item => ({
        id: item.id,
        codigo: item.codigo,
        nome: item.nome,
        grupoId: item.grupo_id,
        subgrupoId: item.subgrupo_id,
        unidadeMedida: item.unidade_medida
      }));
      
      setProdutos(mappedData);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  return { produtos, loading, refetch: fetchProdutos };
};
