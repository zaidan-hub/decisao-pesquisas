
CREATE TABLE public.compradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supermercado_id uuid NOT NULL REFERENCES public.supermercados(id) ON DELETE CASCADE,
  nome text NOT NULL,
  produtos text[] NOT NULL DEFAULT ARRAY[]::text[],
  hierarquia_customizada jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.compradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem ver compradores"
  ON public.compradores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Apenas admins podem inserir compradores"
  ON public.compradores FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Apenas admins podem atualizar compradores"
  ON public.compradores FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Apenas admins podem deletar compradores"
  ON public.compradores FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
