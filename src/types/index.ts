export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'anotadora' | 'cliente';
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
}

// Mantém Pesquisa como alias para compatibilidade
export interface Pesquisa extends Coleta {}