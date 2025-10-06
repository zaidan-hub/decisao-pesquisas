import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Interface otimizada para listagem (sem campos pesados)
export interface ColetaAdmin {
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
  const [coletas, setColetas] = useState<ColetaAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchColetas = async () => {
    try {
      setLoading(true);
      
      // Buscar apenas campos essenciais (sem fotos, precos, observacoes)
      const { data: rows, error } = await supabase
        .from('coletas')
        .select('id, data, supermercado_id, pesquisador_id, numero, ano, status, produtos')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const coletasFormatadas: ColetaAdmin[] = (rows || []).map((coleta: any) => ({
        id: coleta.id,
        data: coleta.data,
        supermercadoId: coleta.supermercado_id,
        pesquisadorId: coleta.pesquisador_id,
        numero: coleta.numero,
        ano: coleta.ano,
        status: coleta.status,
        produtosCount: (coleta.produtos || []).length
      }));

      setColetas(coletasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar coletas (admin):', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColetas();
  }, []);

  return {
    coletas,
    loading,
    refetch: fetchColetas
  };
};
