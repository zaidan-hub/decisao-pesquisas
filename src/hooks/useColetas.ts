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
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-coletas`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ao listar coletas (${res.status})`);
      }

      const { data } = await res.json();

      // Converter dados do banco para o formato da aplicação
      const coletasFormatadas = (data || []).map((coleta: any) => ({
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
        fotos: coleta.fotos || {}
      }));

      console.log('🔍 COLETAS (edge):', coletasFormatadas);
      setColetas(coletasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar coletas:', error);
    } finally {
      setLoading(false);
    }
  };
  const createColeta = async (coletaData: Omit<Coleta, 'id'>) => {
    try {
      console.log('🔵 CRIANDO COLETA:', coletaData);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';

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
      };

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-coleta`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      console.log('🟢 RESPOSTA INSERT (edge):', json);

      if (!res.ok) throw new Error(json.error || 'Erro ao criar coleta');

      await fetchColetas();
      return { data: json.data, error: null };
    } catch (error: any) {
      console.error('🔴 ERRO AO CRIAR:', error);
      return { data: null, error: error.message };
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