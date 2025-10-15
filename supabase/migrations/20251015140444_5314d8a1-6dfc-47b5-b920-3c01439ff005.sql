-- Adicionar campo para armazenar alertas de variação de preços
ALTER TABLE coletas
ADD COLUMN IF NOT EXISTS alertas_variacao JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN coletas.alertas_variacao IS 'Lista de alertas de variação de preço significativa. Formato: [{"produto_id": "uuid", "preco_anterior": 10.5, "preco_atual": 20.0, "variacao_percentual": 90.5, "coleta_anterior_id": "uuid", "data_anterior": "2025-01-01", "visualizado": false}]';