-- Criar tabela de coletas
CREATE TABLE public.coletas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL,
  supermercado_id UUID NOT NULL REFERENCES public.supermercados(id) ON DELETE CASCADE,
  pesquisador_id UUID NOT NULL,
  numero TEXT,
  ano TEXT,
  status TEXT NOT NULL DEFAULT 'não iniciada' CHECK (status IN ('não iniciada', 'iniciada', 'finalizada')),
  produtos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  precos JSONB DEFAULT '{}'::jsonb,
  precos_editados_admin JSONB DEFAULT '{}'::jsonb,
  observacoes_produtos JSONB DEFAULT '{}'::jsonb,
  observacoes_finais JSONB DEFAULT '[]'::jsonb,
  admin_visualizou_observacoes BOOLEAN DEFAULT false,
  fotos JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coletas ENABLE ROW LEVEL SECURITY;

-- Policies para coletas
CREATE POLICY "Admins podem ver todas as coletas"
ON public.coletas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Pesquisadores podem ver suas próprias coletas"
ON public.coletas
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'pesquisador'
    AND profiles.email = (
      SELECT email FROM pesquisadores WHERE id = coletas.pesquisador_id
    )
  )
);

CREATE POLICY "Apenas admins podem inserir coletas"
ON public.coletas
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Apenas admins podem atualizar coletas (admin)"
ON public.coletas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Pesquisadores podem atualizar suas próprias coletas"
ON public.coletas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'pesquisador'
    AND profiles.email = (
      SELECT email FROM pesquisadores WHERE id = coletas.pesquisador_id
    )
  )
);

CREATE POLICY "Apenas admins podem deletar coletas"
ON public.coletas
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_coletas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_coletas_updated_at
BEFORE UPDATE ON public.coletas
FOR EACH ROW
EXECUTE FUNCTION public.update_coletas_updated_at();