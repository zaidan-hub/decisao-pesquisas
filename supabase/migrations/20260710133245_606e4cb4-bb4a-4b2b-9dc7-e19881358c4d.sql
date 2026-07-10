ALTER TABLE public.departamentos ADD COLUMN IF NOT EXISTS ordem integer;

WITH r AS (
  SELECT id, row_number() OVER (ORDER BY nome) AS rn
  FROM public.departamentos
)
UPDATE public.departamentos d SET ordem = r.rn FROM r WHERE d.id = r.id;