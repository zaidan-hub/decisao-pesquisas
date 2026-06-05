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
  alertasCount?: number;
  arquivada: boolean;
  arquivadaEm: string | null;
  finalizadaEm: string | null;
  autoArquivamentoDesativado: boolean;
}

export const useColetasAdmin = () => {
  const [coletas, setColetas] = useState<ColetaAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchColetas = async () => {
    try {
      setLoading(true);
      
      // Buscar apenas campos essenciais (sem fotos, otimizado)
      const { data: rows, error } = await supabase
        .from('coletas')
        .select('id, data, supermercado_id, pesquisador_id, numero, ano, status, produtos, alertas_variacao, arquivada, arquivada_em, finalizada_em, auto_arquivamento_desativado')
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
        produtosCount: (coleta.produtos || []).length,
        alertasCount: (coleta.alertas_variacao || []).filter((a: any) => !a.visualizado).length,
        arquivada: coleta.arquivada ?? false,
        arquivadaEm: coleta.arquivada_em ?? null,
        finalizadaEm: coleta.finalizada_em ?? null,
        autoArquivamentoDesativado: coleta.auto_arquivamento_desativado ?? false
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
