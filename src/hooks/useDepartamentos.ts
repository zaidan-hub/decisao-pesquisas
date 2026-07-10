import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Departamento } from '@/types';

export const useDepartamentos = () => {
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDepartamentos();
  }, []);

  const fetchDepartamentos = async () => {
    try {
      const { data, error } = await supabase
        .from('departamentos')
        .select('*')
        .order('nome');

      if (error) throw error;
      
      const mappedData = (data || []).map(item => ({
        id: item.id,
        codigo: item.codigo,
        nome: item.nome,
        ordem: (item as any).ordem ?? undefined
      }));
      
      setDepartamentos(mappedData);
    } catch (error) {
      console.error('Erro ao buscar departamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  return { departamentos, loading, refetch: fetchDepartamentos };
};
