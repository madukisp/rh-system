export type ProjetoStatus = "ativo" | "construcao" | "inativo";

export type Projeto = {
  id: string;
  nome: string;
  setor: string | null;
  descricao: string | null;
  documentacao_uso: string | null;
  status: ProjetoStatus;
  versao: string | null;
  url_base: string | null;
  logo_url: string | null;
  responsavel: string | null;
  email_contato: string | null;
  data_criacao: string;
  data_atualizacao: string;
  criado_por: string | null;
};

export type HistoricoEntry = {
  id: string;
  card_id: string;
  coluna_anterior: string | null;
  coluna_nova: string;
  data_mudanca: string;
};

export type KanbanCard = {
  id: string;
  projeto_id: string;
  coluna: string;
  titulo: string;
  descricao: string | null;
  cor: string;
  prioridade: string;
  categoria: string;
  posicao: number;
  data_criacao: string;
  data_atualizacao: string;
  historico?: HistoricoEntry[];
};
