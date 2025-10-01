import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RelatorioPadrao {
  id: string;
  nome: string;
  produtos: string[];
  created_at: string;
}

export const useRelatoriosPadrao = () => {
  const [relatoriosPadrao, setRelatoriosPadrao] = useState<RelatorioPadrao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatoriosPadrao();
  }, []);

  const fetchRelatoriosPadrao = async () => {
    try {
      const { data, error } = await supabase
        .from('relatorios_padrao' as any)
        .select('*')
        .order('nome') as any;

      if (error) throw error;
      setRelatoriosPadrao(data || []);
    } catch (error) {
      console.error('Erro ao buscar relatórios padrão:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRelatorioPadrao = async (nome: string, produtos: string[]) => {
    try {
      const { data, error } = await supabase
        .from('relatorios_padrao' as any)
        .insert({ nome, produtos })
        .select()
        .single() as any;

      if (error) throw error;
      await fetchRelatoriosPadrao();
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  };

  const updateRelatorioPadrao = async (id: string, nome: string, produtos: string[]) => {
    try {
      const { data, error } = await supabase
        .from('relatorios_padrao' as any)
        .update({ nome, produtos })
        .eq('id', id)
        .select()
        .single() as any;

      if (error) throw error;
      await fetchRelatoriosPadrao();
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  };

  const deleteRelatorioPadrao = async (id: string) => {
    try {
      const { error } = await supabase
        .from('relatorios_padrao' as any)
        .delete()
        .eq('id', id) as any;

      if (error) throw error;
      await fetchRelatoriosPadrao();
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  return {
    relatoriosPadrao,
    loading,
    createRelatorioPadrao,
    updateRelatorioPadrao,
    deleteRelatorioPadrao,
    refetch: fetchRelatoriosPadrao
  };
};