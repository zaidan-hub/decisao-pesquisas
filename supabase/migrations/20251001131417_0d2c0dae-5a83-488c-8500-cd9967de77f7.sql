-- Criar tabela de supermercados
CREATE TABLE public.supermercados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.supermercados ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem ver supermercados"
  ON public.supermercados FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem inserir supermercados"
  ON public.supermercados FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem atualizar supermercados"
  ON public.supermercados FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Apenas admins podem deletar supermercados"
  ON public.supermercados FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Inserir dados iniciais
INSERT INTO public.supermercados (nome, endereco) VALUES
  ('Extra Hiper', 'Av. Paulista, 1000 - São Paulo, SP'),
  ('Pão de Açúcar', 'Rua Augusta, 2500 - São Paulo, SP');