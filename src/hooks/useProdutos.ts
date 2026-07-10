import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Produto } from '@/types';

export const useProdutos = (subgrupoId?: string, produtoIds?: string[]) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProdutos();
  }, [subgrupoId, produtoIds]);

  const fetchProdutos = async () => {
    try {
      let query = supabase
        .from('produtos')
        .select('id, codigo, nome, grupo_id, subgrupo_id, unidade_medida, quantidade, mais_barato, ordem')
        .order('nome');

      if (subgrupoId) {
        query = query.eq('subgrupo_id', subgrupoId);
      }
      
      // Se produtoIds fornecidos, buscar apenas esses produtos específicos
      if (produtoIds && produtoIds.length > 0) {
        query = query.in('id', produtoIds);
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
        unidadeMedida: item.unidade_medida,
        quantidade: item.quantidade,
        maisBarato: Boolean(item.mais_barato),
        ordem: (item as any).ordem ?? undefined
      }));
      
      setProdutos(mappedData);
      console.log('🧪 Produtos com maisBarato=true:', mappedData.filter(p => p.maisBarato).map(p => ({ id: p.id, nome: p.nome })));
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  return { produtos, loading, refetch: fetchProdutos };
};
