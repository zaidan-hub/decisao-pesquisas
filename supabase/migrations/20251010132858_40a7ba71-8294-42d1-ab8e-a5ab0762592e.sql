-- Remove a coluna departamento_id da tabela produtos, pois produtos pertencem a subgrupos
ALTER TABLE produtos DROP COLUMN IF EXISTS departamento_id;