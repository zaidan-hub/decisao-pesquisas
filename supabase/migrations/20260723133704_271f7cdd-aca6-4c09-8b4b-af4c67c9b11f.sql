
-- Move compradores ownership from supermercados to clientes
-- Existing rows cannot be reliably associated with a client automatically; clear them.
DELETE FROM public.compradores;

ALTER TABLE public.compradores DROP CONSTRAINT IF EXISTS compradores_supermercado_id_fkey;
ALTER TABLE public.compradores DROP COLUMN IF EXISTS supermercado_id;

ALTER TABLE public.compradores
  ADD COLUMN cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_compradores_cliente_id ON public.compradores(cliente_id);
