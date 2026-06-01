// Persistência local (rascunho) da coleta para evitar perda de dados
// mesmo em caso de recarregamento, queda do app ou falha de rede.

const PREFIX = 'coleta-draft:';

export interface ColetaDraft {
  precos: { [produtoId: string]: number };
  observacoes: { [produtoId: string]: string };
  textosMaisBarato: { [produtoId: string]: string };
  fotos: { [produtoId: string]: string[] };
  updatedAt: number;
}

export const loadColetaDraft = (coletaId: string): ColetaDraft | null => {
  try {
    const raw = localStorage.getItem(PREFIX + coletaId);
    if (!raw) return null;
    return JSON.parse(raw) as ColetaDraft;
  } catch (e) {
    console.error('Erro ao ler rascunho local da coleta:', e);
    return null;
  }
};

export const saveColetaDraft = (
  coletaId: string,
  draft: Omit<ColetaDraft, 'updatedAt'>
) => {
  try {
    localStorage.setItem(
      PREFIX + coletaId,
      JSON.stringify({ ...draft, updatedAt: Date.now() })
    );
  } catch (e) {
    console.error('Erro ao salvar rascunho local da coleta:', e);
  }
};

export const clearColetaDraft = (coletaId: string) => {
  try {
    localStorage.removeItem(PREFIX + coletaId);
  } catch (e) {
    console.error('Erro ao limpar rascunho local da coleta:', e);
  }
};
