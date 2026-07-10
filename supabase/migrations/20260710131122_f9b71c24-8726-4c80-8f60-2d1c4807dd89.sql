ALTER TABLE public.grupos ADD COLUMN IF NOT EXISTS ordem integer;
ALTER TABLE public.subgrupos ADD COLUMN IF NOT EXISTS ordem integer;
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS ordem integer;

WITH r AS (
  SELECT id, row_number() OVER (PARTITION BY departamento_id ORDER BY nome) AS rn
  FROM public.grupos
)
UPDATE public.grupos g SET ordem = r.rn FROM r WHERE g.id = r.id;

WITH r AS (
  SELECT id, row_number() OVER (PARTITION BY grupo_id ORDER BY nome) AS rn
  FROM public.subgrupos
)
UPDATE public.subgrupos s SET ordem = r.rn FROM r WHERE s.id = r.id;

WITH r AS (
  SELECT id, row_number() OVER (PARTITION BY subgrupo_id ORDER BY nome) AS rn
  FROM public.produtos
)
UPDATE public.produtos p SET ordem = r.rn FROM r WHERE p.id = r.id;