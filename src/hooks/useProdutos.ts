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
      
      console.log('🔥 DADOS BRUTOS DO BANCO:', data?.slice(0, 2));
      
      // Mapear os campos do banco para o tipo TypeScript
      const mappedData = (data || []).map(item => {
        console.log('🔥 MAPEANDO ITEM:', { id: item.id, nome: item.nome, mais_barato: item.mais_barato });
        return {
          id: item.id,
          codigo: item.codigo,
          nome: item.nome,
          grupoId: item.grupo_id,
          subgrupoId: item.subgrupo_id,
          unidadeMedida: item.unidade_medida,
          quantidade: item.quantidade,
          maisBarato: item.mais_barato || false
        };
      });
      
      // Log para debug de produtos "mais barato"
      const produtosMaisBarato = mappedData.filter(p => p.maisBarato);
      console.log('📦 TOTAL DE PRODUTOS CARREGADOS:', mappedData.length);
      console.log('📦 PRODUTOS MAIS BARATO:', produtosMaisBarato.length);
      if (produtosMaisBarato.length > 0) {
        console.log('📦 LISTA MAIS BARATO:', produtosMaisBarato.map(p => ({ id: p.id, nome: p.nome, maisBarato: p.maisBarato })));
      }
      
      setProdutos(mappedData);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  return { produtos, loading, refetch: fetchProdutos };
};
