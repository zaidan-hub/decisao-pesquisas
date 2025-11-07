-- Adicionar coluna hierarquia_customizada na tabela coletas
ALTER TABLE coletas 
ADD COLUMN hierarquia_customizada jsonb DEFAULT '{}'::jsonb;