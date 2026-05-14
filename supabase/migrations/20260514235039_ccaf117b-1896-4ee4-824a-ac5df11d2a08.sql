-- Tabela para relatórios personalizados (com hierarquia totalmente customizável)
CREATE TABLE public.relatorios_personalizados (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  produtos text[] NOT NULL DEFAULT ARRAY[]::text[],
  hierarquia_customizada jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.relatorios_personalizados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver relatórios personalizados"
ON public.relatorios_personalizados FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem inserir relatórios personalizados"
ON public.relatorios_personalizados FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem atualizar relatórios personalizados"
ON public.relatorios_personalizados FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem deletar relatórios personalizados"
ON public.relatorios_personalizados FOR DELETE
USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_relatorios_personalizados_updated_at
BEFORE UPDATE ON public.relatorios_personalizados
FOR EACH ROW
EXECUTE FUNCTION public.update_coletas_updated_at();