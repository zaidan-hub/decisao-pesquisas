import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type VisualizacaoItem = {
  tipo: 'departamento' | 'grupo' | 'subgrupo' | 'produto';
  id: string;
  parentId?: string;
};

export interface HierarquiaPersonalizada {
  ordem?: VisualizacaoItem[];
  nomes?: {
    departamentos?: { [id: string]: string };
    grupos?: { [id: string]: string };
    subgrupos?: { [id: string]: string };
  };
}

export interface RelatorioPersonalizado {
  id: string;
  nome: string;
  produtos: string[];
  hierarquiaCustomizada: HierarquiaPersonalizada;
  created_at: string;
}

export const useRelatoriosPersonalizados = () => {
  const [items, setItems] = useState<RelatorioPersonalizado[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('relatorios_personalizados' as any)
        .select('*')
        .order('nome') as any;
      if (error) throw error;
      setItems((data || []).map((r: any) => ({
        id: r.id,
        nome: r.nome,
        produtos: r.produtos || [],
        hierarquiaCustomizada: r.hierarquia_customizada || {},
        created_at: r.created_at,
      })));
    } catch (e) {
      console.error('Erro ao buscar relatórios personalizados:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = async (nome: string, produtos: string[], hierarquia: HierarquiaPersonalizada) => {
    const { error } = await supabase
      .from('relatorios_personalizados' as any)
      .insert([{ nome, produtos, hierarquia_customizada: hierarquia as any }]) as any;
    if (!error) await fetchAll();
    return { error };
  };

  const update = async (id: string, nome: string, produtos: string[], hierarquia: HierarquiaPersonalizada) => {
    const { error } = await supabase
      .from('relatorios_personalizados' as any)
      .update({ nome, produtos, hierarquia_customizada: hierarquia as any })
      .eq('id', id) as any;
    if (!error) await fetchAll();
    return { error };
  };

  const remove = async (id: string) => {
    const { error } = await supabase
      .from('relatorios_personalizados' as any)
      .delete()
      .eq('id', id) as any;
    if (!error) await fetchAll();
    return { error };
  };

  return { items, loading, refetch: fetchAll, create, update, remove };
};
