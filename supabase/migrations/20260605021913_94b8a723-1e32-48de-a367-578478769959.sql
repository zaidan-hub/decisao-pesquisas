-- 1. Add archiving columns
ALTER TABLE public.coletas
  ADD COLUMN IF NOT EXISTS arquivada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arquivada_em timestamptz,
  ADD COLUMN IF NOT EXISTS auto_arquivamento_desativado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS finalizada_em timestamptz;

-- 2. Trigger to stamp finalization time when a coleta becomes 'finalizada'
CREATE OR REPLACE FUNCTION public.set_coleta_finalizada_em()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'finalizada' AND (OLD.status IS DISTINCT FROM 'finalizada') THEN
    NEW.finalizada_em = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_coleta_finalizada_em ON public.coletas;
CREATE TRIGGER trg_set_coleta_finalizada_em
  BEFORE UPDATE ON public.coletas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_coleta_finalizada_em();

-- 3. Remove all coletas except the two most recent finalizadas (025 and 024)
DELETE FROM public.coletas
WHERE id NOT IN (
  '17c7584d-e44e-44cd-a474-143627c176fc', -- 025 finalizada 28/05/2026
  'c297b740-55ff-4728-90eb-8fca703bd09c'  -- 024 finalizada 26/05/2026
);

-- 4. Backfill finalization timestamp for the kept finalizadas
UPDATE public.coletas
SET finalizada_em = updated_at
WHERE status = 'finalizada' AND finalizada_em IS NULL;