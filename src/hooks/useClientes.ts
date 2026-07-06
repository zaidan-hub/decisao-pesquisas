import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Cliente } from '@/types';

export const useClientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes' as any)
        .select('*')
        .order('nome') as any;

      if (error) throw error;
      
      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        nome: item.nome,
        situacao: item.situacao,
        dataInicioContrato: item.data_inicio_contrato,
        contatos: item.contatos || [],
        guiaPrecos: item.guia_precos || undefined
      }));
      
      setClientes(mappedData);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  return { clientes, loading, refetch: fetchClientes };
};
