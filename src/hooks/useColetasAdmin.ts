import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ColetaListItem {
  id: string;
  data: string;
  supermercadoId: string;
  pesquisadorId: string;
  numero: string | null;
  ano: string | null;
  status: 'não iniciada' | 'iniciada' | 'finalizada';
  produtosCount: number;
}

export const useColetasAdmin = () => {
  const [coletas, setColetas] = useState<ColetaListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.time('⚡ Admin Coletas Load Time');
    fetchColetas();
  }, []);

  const fetchColetas = async () => {
    try {
      setLoading(true);
      
      // Buscar apenas campos essenciais - sem fotos, observações ou preços
      const { data: rows, error } = await supabase
        .from('coletas')
        .select('id, data, supermercado_id, pesquisador_id, numero, ano, status, produtos')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const coletasFormatadas = (rows || []).map((coleta: any) => ({
        id: coleta.id,
        data: coleta.data,
        supermercadoId: coleta.supermercado_id,
        pesquisadorId: coleta.pesquisador_id,
        numero: coleta.numero,
        ano: coleta.ano,
        status: coleta.status,
        produtosCount: (coleta.produtos || []).length
      }));

      console.log(`✅ ${coletasFormatadas.length} coletas carregadas (modo admin otimizado)`);
      console.timeEnd('⚡ Admin Coletas Load Time');
      
      setColetas(coletasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar coletas:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    coletas,
    loading,
    refetch: fetchColetas
  };
};