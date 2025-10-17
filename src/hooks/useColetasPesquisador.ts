import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Coleta } from '@/types';

export const useColetasPesquisador = (userEmail: string | undefined) => {
  const [coletasAtivas, setColetasAtivas] = useState<Coleta[]>([]);
  const [coletasFinalizadas, setColetasFinalizadas] = useState<Coleta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userEmail) {
      fetchColetasPesquisador();
    }
  }, [userEmail]);

  const fetchColetasPesquisador = async () => {
    if (!userEmail) return;

    try {
      setLoading(true);

      // Primeiro, buscar o pesquisador pelo email
      const { data: pesquisador, error: pesquisadorError } = await supabase
        .from('pesquisadores')
        .select('id')
        .eq('email', userEmail.toLowerCase())
        .single();

      if (pesquisadorError || !pesquisador) {
        console.error('Erro ao buscar pesquisador:', pesquisadorError);
        setColetasAtivas([]);
        setColetasFinalizadas([]);
        return;
      }

      // Buscar coletas do pesquisador (query otimizada)
      const { data: rows, error } = await supabase
        .from('coletas')
        .select('id, data, supermercado_id, pesquisador_id, numero, ano, status, produtos, precos, precos_editados_admin, observacoes_produtos, observacoes_finais, admin_visualizou_observacoes, textos_mais_barato, alertas_variacao, created_at')
        .eq('pesquisador_id', pesquisador.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Formatar e separar as coletas
      const coletasFormatadas = (rows || []).map((coleta: any) => ({
        id: coleta.id,
        data: coleta.data,
        supermercadoId: coleta.supermercado_id,
        pesquisadorId: coleta.pesquisador_id,
        numero: coleta.numero,
        ano: coleta.ano,
        status: coleta.status,
        produtos: coleta.produtos || [],
        precos: coleta.precos || {},
        precosEditadosAdmin: coleta.precos_editados_admin || {},
        observacoesProdutos: coleta.observacoes_produtos || {},
        observacoesFinais: coleta.observacoes_finais || [],
        adminVisualizouObservacoes: coleta.admin_visualizou_observacoes || false,
        fotos: {},
        textosMaisBarato: coleta.textos_mais_barato || {},
        alertasVariacao: coleta.alertas_variacao || []
      }));

      // Separar coletas ativas e finalizadas
      setColetasAtivas(coletasFormatadas.filter(c => c.status !== 'finalizada'));
      setColetasFinalizadas(coletasFormatadas.filter(c => c.status === 'finalizada'));

    } catch (error) {
      console.error('Erro ao buscar coletas do pesquisador:', error);
      setColetasAtivas([]);
      setColetasFinalizadas([]);
    } finally {
      setLoading(false);
    }
  };

  const updateColeta = async (id: string, updates: Partial<Coleta>) => {
    try {
      const updateData: any = {};
      
      if (updates.data) updateData.data = updates.data;
      if (updates.supermercadoId) updateData.supermercado_id = updates.supermercadoId;
      if (updates.pesquisadorId) updateData.pesquisador_id = updates.pesquisadorId;
      if (updates.numero) updateData.numero = updates.numero;
      if (updates.ano) updateData.ano = updates.ano;
      if (updates.status) updateData.status = updates.status;
      if (updates.produtos) updateData.produtos = updates.produtos;
      if (updates.precos !== undefined) updateData.precos = updates.precos;
      if (updates.precosEditadosAdmin !== undefined) updateData.precos_editados_admin = updates.precosEditadosAdmin;
      if (updates.observacoesProdutos !== undefined) updateData.observacoes_produtos = updates.observacoesProdutos;
      if (updates.observacoesFinais !== undefined) updateData.observacoes_finais = updates.observacoesFinais;
      if (updates.adminVisualizouObservacoes !== undefined) updateData.admin_visualizou_observacoes = updates.adminVisualizouObservacoes;
      if (updates.fotos !== undefined) updateData.fotos = updates.fotos;
      if (updates.textosMaisBarato !== undefined) updateData.textos_mais_barato = updates.textosMaisBarato;

      const { data, error } = await supabase
        .from('coletas')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Atualizar localmente de forma otimizada
      await fetchColetasPesquisador();
      
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  };

  return {
    coletasAtivas,
    coletasFinalizadas,
    loading,
    updateColeta,
    refetch: fetchColetasPesquisador
  };
};
