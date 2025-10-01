import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Relatorio {
  id: string;
  nome: string;
  nome_cliente: string;
  data: string;
  produtos: string[];
  coletas: string[];
  relatorio_padrao_id: string | null;
  created_at: string;
}

export const useRelatorios = () => {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRelatorios();
  }, []);

  const fetchRelatorios = async () => {
    try {
      const { data, error } = await supabase
        .from('relatorios' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any;

      if (error) throw error;
      setRelatorios(data || []);
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRelatorio = async (
    nome: string,
    nome_cliente: string,
    data: string,
    produtos: string[],
    coletas: string[],
    relatorio_padrao_id?: string
  ) => {
    try {
      const { data: relatorioData, error } = await supabase
        .from('relatorios' as any)
        .insert({
          nome,
          nome_cliente,
          data,
          produtos,
          coletas,
          relatorio_padrao_id: relatorio_padrao_id || null
        })
        .select()
        .single() as any;

      if (error) throw error;
      await fetchRelatorios();
      return { data: relatorioData, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  };

  const deleteRelatorio = async (id: string) => {
    try {
      const { error } = await supabase
        .from('relatorios' as any)
        .delete()
        .eq('id', id) as any;

      if (error) throw error;
      await fetchRelatorios();
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  return {
    relatorios,
    loading,
    createRelatorio,
    deleteRelatorio,
    refetch: fetchRelatorios
  };
};