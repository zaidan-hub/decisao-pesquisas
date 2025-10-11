-- Adicionar coluna mais_barato na tabela produtos
ALTER TABLE produtos ADD COLUMN mais_barato boolean NOT NULL DEFAULT false;