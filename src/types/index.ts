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
  abreviacao?: string;
}

export interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
}

export interface Departamento {
  id: string;
  codigo: string;
  nome: string;
}

export interface Grupo {
  id: string;
  codigo: string;
  nome: string;
  departamentoId?: string;
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
  maisBarato?: boolean;
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
  hierarquiaCustomizada?: {
    departamentos?: { [id: string]: string }; // ID do departamento -> nome customizado
    grupos?: { [id: string]: string }; // ID do grupo -> nome customizado
    subgrupos?: { [id: string]: string }; // ID do subgrupo -> nome customizado
  };
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
  hierarquiaCustomizada?: {
    departamentos?: { [id: string]: string };
    grupos?: { [id: string]: string };
    subgrupos?: { [id: string]: string };
  };
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
  textosMaisBarato?: { [produtoId: string]: string }; // Textos adicionais para produtos mais barato
  alertasVariacao?: AlertaVariacao[]; // Alertas de variação significativa de preços
}

export interface AlertaVariacao {
  produto_id: string;
  preco_anterior: number;
  preco_atual: number;
  variacao_percentual: number;
  coleta_anterior_id: string;
  data_anterior: string;
  visualizado: boolean;
}

export interface ObservacaoFinal {
  id: string;
  texto: string;
  dataHora: string; // ISO string com timezone GMT-3
}

// Mantém Pesquisa como alias para compatibilidade
export interface Pesquisa extends Coleta {}