-- Criar tabela de departamentos
CREATE TABLE public.departamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir departamentos padrão
INSERT INTO public.departamentos (codigo, nome) VALUES
  ('MERC', 'Mercearia'),
  ('HIGL', 'Higiene e Limpeza'),
  ('PERE', 'Perecíveis'),
  ('BAZA', 'Bazar');

-- Adicionar coluna departamento_id na tabela grupos
ALTER TABLE public.grupos 
ADD COLUMN departamento_id UUID REFERENCES public.departamentos(id);

-- Adicionar coluna departamento_id na tabela produtos (para produtos sem grupo)
ALTER TABLE public.produtos 
ADD COLUMN departamento_id UUID REFERENCES public.departamentos(id);

-- Enable RLS
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para departamentos
CREATE POLICY "Usuários autenticados podem ver departamentos"
  ON public.departamentos
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem inserir departamentos"
  ON public.departamentos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem atualizar departamentos"
  ON public.departamentos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem deletar departamentos"
  ON public.departamentos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );