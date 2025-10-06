-- Adicionar índices para otimizar queries de listagem de coletas
CREATE INDEX IF NOT EXISTS idx_coletas_created_at ON public.coletas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coletas_status ON public.coletas (status);
CREATE INDEX IF NOT EXISTS idx_coletas_pesquisador_status ON public.coletas (pesquisador_id, status);