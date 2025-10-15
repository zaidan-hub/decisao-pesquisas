-- Adicionar campos para hierarquia customizada nas listas
ALTER TABLE listas 
ADD COLUMN IF NOT EXISTS hierarquia_customizada JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN listas.hierarquia_customizada IS 'Estrutura customizada com nomes e ordem de departamentos, grupos e subgrupos. Formato: { "departamentos": [{"id": "uuid", "nome": "Nome Custom", "ordem": 0, "grupos": [...]}] }';