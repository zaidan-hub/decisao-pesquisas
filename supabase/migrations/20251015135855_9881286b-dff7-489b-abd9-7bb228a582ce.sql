-- Adicionar campo de hierarquia customizada na tabela relatorios
ALTER TABLE relatorios
ADD COLUMN IF NOT EXISTS hierarquia_customizada JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN relatorios.hierarquia_customizada IS 'Estrutura customizada com nomes de departamentos, grupos e subgrupos herdada da lista. Formato: { "departamentos": {"id": "nome"}, "grupos": {"id": "nome"}, "subgrupos": {"id": "nome"} }';