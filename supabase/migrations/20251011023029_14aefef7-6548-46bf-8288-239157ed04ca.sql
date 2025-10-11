-- Adicionar coluna textos_mais_barato na tabela coletas
ALTER TABLE coletas ADD COLUMN textos_mais_barato jsonb DEFAULT '{}'::jsonb;