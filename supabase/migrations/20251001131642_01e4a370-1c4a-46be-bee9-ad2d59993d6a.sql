-- Criar tabela de clientes
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  situacao text NOT NULL CHECK (situacao IN ('Ativo', 'Inativo')),
  data_inicio_contrato date,
  contatos jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Criar tabela de pesquisadores
CREATE TABLE public.pesquisadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  email text NOT NULL UNIQUE,
  telefone text,
  login text NOT NULL UNIQUE,
  senha text NOT NULL,
  ativo boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Criar tabela de listas
CREATE TABLE public.listas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  produtos text[] DEFAULT ARRAY[]::text[],
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para clientes
CREATE POLICY "Usuários autenticados podem ver clientes"
  ON public.clientes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem inserir clientes"
  ON public.clientes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem atualizar clientes"
  ON public.clientes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem deletar clientes"
  ON public.clientes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS para pesquisadores
CREATE POLICY "Usuários autenticados podem ver pesquisadores"
  ON public.pesquisadores FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem inserir pesquisadores"
  ON public.pesquisadores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem atualizar pesquisadores"
  ON public.pesquisadores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem deletar pesquisadores"
  ON public.pesquisadores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas RLS para listas
CREATE POLICY "Usuários autenticados podem ver listas"
  ON public.listas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem inserir listas"
  ON public.listas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem atualizar listas"
  ON public.listas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem deletar listas"
  ON public.listas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Inserir dados iniciais
INSERT INTO public.clientes (nome, situacao, data_inicio_contrato, contatos) VALUES
  ('Empresa ABC Ltda', 'Ativo', '2024-01-15', '[{"id":"1","nome":"João Silva","telefone":"(11) 99999-9999","email":"joao@empresaabc.com"}]'),
  ('XYZ Comércio', 'Inativo', null, '[]');

INSERT INTO public.pesquisadores (codigo, nome, email, telefone, login, senha, ativo) VALUES
  ('PES001', 'Maria Silva', 'maria.silva@sistema.com', '(11) 99999-1111', 'maria.silva', '123456', true),
  ('PES002', 'João Santos', 'joao.santos@sistema.com', '(11) 99999-2222', 'joao.santos', '123456', true),
  ('PES003', 'Ana Costa', 'ana.costa@sistema.com', '(11) 99999-3333', 'ana.costa', '123456', false);