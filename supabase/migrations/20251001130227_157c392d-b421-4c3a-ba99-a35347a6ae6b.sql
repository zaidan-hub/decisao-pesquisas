-- Adicionar coluna quantidade na tabela produtos
ALTER TABLE public.produtos ADD COLUMN quantidade text;

-- Atualizar dados existentes para separar quantidade e unidade
-- Exemplo: "330 ML" -> quantidade: "330", unidade_medida: "ML"
UPDATE public.produtos
SET 
  quantidade = TRIM(SPLIT_PART(unidade_medida, ' ', 1)),
  unidade_medida = CASE 
    WHEN unidade_medida LIKE '% %' THEN TRIM(SPLIT_PART(unidade_medida, ' ', 2))
    ELSE unidade_medida
  END
WHERE unidade_medida LIKE '% %';

-- Para casos onde a unidade já está sozinha (ex: "ML", "KG", "UN")
-- a quantidade ficará vazia e a unidade permanece igual