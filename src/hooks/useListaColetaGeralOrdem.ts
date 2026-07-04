import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OrdemItem {
  produtoId?: string;
  parentId?: string;
  tipo?: string;
}

/**
 * Busca a ordem de produtos definida na "LISTA COLETA GERAL".
 * Retorna um array de produtoIds na ordem cadastrada.
 */
export const useListaColetaGeralOrdem = () => {
  const [ordemProdutos, setOrdemProdutos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrdem = async () => {
      try {
        const { data, error } = await supabase
          .from('listas')
          .select('nome, hierarquia_customizada')
          .ilike('nome', '%COLETA GERAL%')
          .limit(1);

        if (error) throw error;

        const lista = (data || [])[0] as any;
        const ordem: OrdemItem[] = lista?.hierarquia_customizada?.ordem || [];
        const produtoIds = ordem
          .filter((item) => item.tipo === 'produto' && item.produtoId)
          .map((item) => item.produtoId as string);

        setOrdemProdutos(produtoIds);
      } catch (error) {
        console.error('Erro ao buscar ordem da LISTA COLETA GERAL:', error);
        setOrdemProdutos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrdem();
  }, []);

  return { ordemProdutos, loading };
};
