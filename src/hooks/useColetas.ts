import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Coleta } from '@/types';

export const useColetas = () => {
  const [coletas, setColetas] = useState<Coleta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Limpar estado antes de buscar
    setColetas([]);
    fetchColetas();
  }, []);

  const fetchColetas = async () => {
    try {
      // Buscar apenas campos essenciais, sem fotos (otimizado para relatórios)
      const { data: rows, error } = await supabase
        .from('coletas')
        .select('id, data, supermercado_id, pesquisador_id, numero, ano, status, produtos, precos, precos_editados_admin, observacoes_produtos, observacoes_finais, admin_visualizou_observacoes, textos_mais_barato, created_at')
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
        produtos: coleta.produtos || [],
        precos: coleta.precos || {},
        precosEditadosAdmin: coleta.precos_editados_admin || {},
        observacoesProdutos: coleta.observacoes_produtos || {},
        observacoesFinais: coleta.observacoes_finais || [],
        adminVisualizouObservacoes: coleta.admin_visualizou_observacoes || false,
        fotos: {}, // Não buscar fotos para otimizar performance em relatórios
        textosMaisBarato: coleta.textos_mais_barato || {}
      }));

      console.log('🔍 COLETAS CARREGADAS:', coletasFormatadas);
      setColetas(coletasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar coletas:', error);
    } finally {
      setLoading(false);
    }
  };
  const createColeta = async (coletaData: Omit<Coleta, 'id'>) => {
    try {
      console.log('🔵 CRIANDO COLETA (edge):', coletaData);

      const payload = {
        data: coletaData.data,
        supermercado_id: coletaData.supermercadoId,
        pesquisador_id: coletaData.pesquisadorId,
        numero: coletaData.numero,
        ano: coletaData.ano,
        status: coletaData.status,
        produtos: coletaData.produtos,
        precos: coletaData.precos || {},
        precos_editados_admin: coletaData.precosEditadosAdmin || {},
        observacoes_produtos: coletaData.observacoesProdutos || {},
        observacoes_finais: coletaData.observacoesFinais || [],
        admin_visualizou_observacoes: false,
        fotos: coletaData.fotos || {},
        textos_mais_barato: coletaData.textosMaisBarato || {}
      };

      const { data, error } = await supabase.functions.invoke('admin-create-coleta', {
        body: payload,
      });

      if (error) {
        console.error('🔴 ERRO (edge):', error);
        
        // Melhor tratamento para erros de autorização
        if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
          throw new Error('Você não tem permissão de administrador. Contate o suporte.');
        }
        
        throw error;
      }

      console.log('🟢 RESPOSTA INSERT (edge):', data);

      await fetchColetas();
      return { data: (data as any)?.data, error: null };
    } catch (error: any) {
      console.error('🔴 ERRO AO CRIAR:', error);
      const message = error?.message || 'Erro ao criar coleta';
      return { data: null, error: message };
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
        .from('coletas' as any)
        .update(updateData)
        .eq('id', id)
        .select()
        .single() as any;

      if (error) throw error;
      await fetchColetas();
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  };

  const deleteColeta = async (id: string) => {
    try {
      const { error } = await supabase
        .from('coletas' as any)
        .delete()
        .eq('id', id) as any;

      if (error) throw error;
      await fetchColetas();
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  return {
    coletas,
    loading,
    createColeta,
    updateColeta,
    deleteColeta,
    refetch: fetchColetas
  };
};