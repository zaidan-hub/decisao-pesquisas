export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'pesquisador';
}

export interface Cliente {
  id: string;
  nome: string;
  situacao: 'Ativo' | 'Inativo';
  dataInicioContrato?: string;
  contatos: Contato[];
}

export interface Supermercado {
  id: string;
  nome: string;
  endereco: string;
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
  quantidade?: string;
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

export interface Lista {
  id: string;
  nome: string;
  produtos: string[]; // Array de IDs dos produtos
}

export interface RelatorioPadrao {
  id: string;
  nome: string;
  produtos: string[]; // Array de IDs dos produtos
}

export interface Relatorio {
  id: string;
  nome: string;
  clienteNome: string;
  data: string;
  produtos: string[]; // Array de IDs dos produtos
  coletaIds: string[]; // Array de IDs das coletas consideradas
  createdAt: string;
}

export interface Coleta {
  id: string;
  data: string;
  supermercadoId: string;
  pesquisadorId: string;
  listaId?: string; // Nova referência à lista
  numero?: string;
  grupo?: string;
  ano?: string;
  status: 'não iniciada' | 'iniciada' | 'finalizada';
  produtos: string[]; // Array de IDs dos produtos da coleta
  precos?: { [produtoId: string]: number }; // Preços coletados por produto
  precosEditadosAdmin?: { [produtoId: string]: number }; // Preços editados pelo admin
  observacoesProdutos?: { [produtoId: string]: string }; // Observações por produto
  observacoesFinais?: ObservacaoFinal[]; // Observações adicionadas após finalização
  adminVisualizouObservacoes?: boolean; // Se admin já visualizou as observações
  fotos?: { [produtoId: string]: string[] }; // Fotos por produto
  produtosComFotos?: string[]; // IDs dos produtos que possuem fotos (sem carregar as imagens)
}

export interface ObservacaoFinal {
  id: string;
  texto: string;
  dataHora: string; // ISO string com timezone GMT-3
}

// Mantém Pesquisa como alias para compatibilidade
export interface Pesquisa extends Coleta {}