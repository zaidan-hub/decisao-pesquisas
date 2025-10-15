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
  hierarquiaCustomizada?: {
    departamentos?: { [id: string]: string };
    grupos?: { [id: string]: string };
    subgrupos?: { [id: string]: string };
  };
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
      
      // Mapear hierarquia_customizada para hierarquiaCustomizada
      const relatoriosFormatados = (data || []).map((rel: any) => ({
        ...rel,
        hierarquiaCustomizada: rel.hierarquia_customizada
      }));
      
      setRelatorios(relatoriosFormatados);
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
    relatorio_padrao_id?: string,
    hierarquia_customizada?: {
      departamentos?: { [id: string]: string };
      grupos?: { [id: string]: string };
      subgrupos?: { [id: string]: string };
    }
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
          relatorio_padrao_id: relatorio_padrao_id || null,
          hierarquia_customizada: hierarquia_customizada || {}
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