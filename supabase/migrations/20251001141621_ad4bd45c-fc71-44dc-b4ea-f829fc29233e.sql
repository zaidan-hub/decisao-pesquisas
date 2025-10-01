-- Tabela para relatórios padrão (templates)
CREATE TABLE public.relatorios_padrao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  produtos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para relatórios gerados
CREATE TABLE public.relatorios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  nome_cliente TEXT NOT NULL,
  data DATE NOT NULL,
  produtos TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  coletas TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  relatorio_padrao_id UUID REFERENCES public.relatorios_padrao(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relatorios_padrao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios ENABLE ROW LEVEL SECURITY;

-- Policies para relatorios_padrao
CREATE POLICY "Usuários autenticados podem ver relatórios padrão"
ON public.relatorios_padrao
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem inserir relatórios padrão"
ON public.relatorios_padrao
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Apenas admins podem atualizar relatórios padrão"
ON public.relatorios_padrao
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Apenas admins podem deletar relatórios padrão"
ON public.relatorios_padrao
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policies para relatorios
CREATE POLICY "Usuários autenticados podem ver relatórios"
ON public.relatorios
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem inserir relatórios"
ON public.relatorios
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Apenas admins podem atualizar relatórios"
ON public.relatorios
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Apenas admins podem deletar relatórios"
ON public.relatorios
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);