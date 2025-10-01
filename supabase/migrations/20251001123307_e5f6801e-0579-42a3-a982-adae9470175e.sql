-- Criar tabela de grupos
CREATE TABLE IF NOT EXISTS public.grupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de subgrupos
CREATE TABLE IF NOT EXISTS public.subgrupos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de produtos
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  subgrupo_id UUID NOT NULL REFERENCES public.subgrupos(id) ON DELETE CASCADE,
  unidade_medida TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subgrupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para visualização pública (ajuste conforme necessário)
CREATE POLICY "Grupos são visíveis para todos"
ON public.grupos FOR SELECT
USING (true);

CREATE POLICY "Subgrupos são visíveis para todos"
ON public.subgrupos FOR SELECT
USING (true);

CREATE POLICY "Produtos são visíveis para todos"
ON public.produtos FOR SELECT
USING (true);

-- Políticas para inserção, atualização e exclusão (apenas admins)
-- Você pode ajustar estas políticas depois baseado na sua lógica de autenticação
CREATE POLICY "Apenas admins podem inserir grupos"
ON public.grupos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Apenas admins podem atualizar grupos"
ON public.grupos FOR UPDATE
USING (true);

CREATE POLICY "Apenas admins podem deletar grupos"
ON public.grupos FOR DELETE
USING (true);

CREATE POLICY "Apenas admins podem inserir subgrupos"
ON public.subgrupos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Apenas admins podem atualizar subgrupos"
ON public.subgrupos FOR UPDATE
USING (true);

CREATE POLICY "Apenas admins podem deletar subgrupos"
ON public.subgrupos FOR DELETE
USING (true);

CREATE POLICY "Apenas admins podem inserir produtos"
ON public.produtos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Apenas admins podem atualizar produtos"
ON public.produtos FOR UPDATE
USING (true);

CREATE POLICY "Apenas admins podem deletar produtos"
ON public.produtos FOR DELETE
USING (true);

-- Criar índices para melhor performance
CREATE INDEX idx_subgrupos_grupo_id ON public.subgrupos(grupo_id);
CREATE INDEX idx_produtos_grupo_id ON public.produtos(grupo_id);
CREATE INDEX idx_produtos_subgrupo_id ON public.produtos(subgrupo_id);
CREATE INDEX idx_produtos_codigo ON public.produtos(codigo);