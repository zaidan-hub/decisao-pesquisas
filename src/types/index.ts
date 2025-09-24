export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'pesquisador';
}

export interface Supermercado {
  id: string;
  codigo: string;
  nome: string;
  sigla: string;
  situacao: 'Cliente' | 'Não Cliente';
  contatos: Contato[];
  dataInicioContrato?: string;
  produtosPadrao: string[]; // Array de IDs dos produtos
}

export interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
}

export interface Grupo {
  id: string;
  codigo: string;
  nome: string;
}

export interface Subgrupo {
  id: string;
  codigo: string;
  nome: string;
  grupoId: string;
}

export interface Produto {
  id: string;
  codigo: string;
  nome: string;
  grupoId: string;
  subgrupoId: string;
  unidadeMedida: string;
}

export interface Pesquisador {
  id: string;
  codigo: string;
  nome: string;
  email: string;
  telefone: string;
  ativo: boolean;
  login: string;
  senha: string;
}

export interface Coleta {
  id: string;
  data: string;
  supermercadoId: string;
  pesquisadorId: string;
  numero?: string;
  grupo?: string;
  ano?: string;
  status: 'não iniciada' | 'iniciada' | 'finalizada';
  produtos: string[]; // Array de IDs dos produtos da coleta
  precos?: { [produtoId: string]: number }; // Preços coletados por produto
  observacoesProdutos?: { [produtoId: string]: string }; // Observações por produto
  observacoesFinais?: ObservacaoFinal[]; // Observações adicionadas após finalização
  adminVisualizouObservacoes?: boolean; // Se admin já visualizou as observações
}

export interface ObservacaoFinal {
  id: string;
  texto: string;
  dataHora: string; // ISO string com timezone GMT-3
}

// Mantém Pesquisa como alias para compatibilidade
export interface Pesquisa extends Coleta {}