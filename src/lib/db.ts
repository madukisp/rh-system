import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { HistoricoEntry, KanbanCard, Projeto, ProjetoStatus } from "@/lib/types";

type ProjetoOrderBy = "data_atualizacao" | "nome" | "status" | "data_criacao";
type SortOrder = "asc" | "desc";

type ProjetoFilters = {
  status?: string;
  setor?: string;
  search?: string;
  orderBy?: string;
  order?: string;
};

type ProjetoInput = {
  nome: string;
  setor?: string | null;
  descricao?: string | null;
  documentacao_uso?: string | null;
  status?: ProjetoStatus;
  versao?: string | null;
  url_base?: string | null;
  logo_url?: string | null;
  responsavel?: string | null;
  email_contato?: string | null;
  criado_por?: string | null;
};

type KanbanCardInput = {
  coluna: string;
  titulo: string;
  descricao?: string | null;
  cor?: string;
  prioridade?: string;
  categoria?: string;
  posicao?: number;
};

type KanbanCardUpdate = Partial<KanbanCardInput>;

type TimelineCardRow = KanbanCard & {
  projeto_nome: string | null;
};

type TimelineHistoryRow = HistoricoEntry & {
  titulo: string;
  projeto_id: string;
  projeto_nome: string | null;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "rh-system.sqlite");

let database: DatabaseSync | null = null;

function hasColumn(db: DatabaseSync, table: string, column: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<Record<string, unknown>>;
  return columns.some((entry) => entry.name === column);
}

function ensureDb() {
  if (database) {
    return database;
  }

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS projetos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      setor TEXT,
      descricao TEXT,
      documentacao_uso TEXT,
      status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'construcao', 'inativo')),
      versao TEXT,
      url_base TEXT,
      logo_url TEXT,
      responsavel TEXT,
      email_contato TEXT,
      data_criacao TEXT NOT NULL,
      data_atualizacao TEXT NOT NULL,
      criado_por TEXT
    );

    CREATE TABLE IF NOT EXISTS kanban_cards (
      id TEXT PRIMARY KEY,
      projeto_id TEXT NOT NULL,
      coluna TEXT NOT NULL,
      titulo TEXT NOT NULL,
      descricao TEXT,
      cor TEXT NOT NULL DEFAULT 'blue',
      prioridade TEXT NOT NULL DEFAULT 'media',
      categoria TEXT NOT NULL DEFAULT 'desenvolvimento',
      posicao INTEGER NOT NULL DEFAULT 0,
      data_criacao TEXT NOT NULL,
      data_atualizacao TEXT NOT NULL,
      FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS kanban_historico (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      coluna_anterior TEXT,
      coluna_nova TEXT NOT NULL,
      data_mudanca TEXT NOT NULL,
      FOREIGN KEY (card_id) REFERENCES kanban_cards(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_projetos_data_atualizacao ON projetos(data_atualizacao DESC);
    CREATE INDEX IF NOT EXISTS idx_kanban_cards_projeto_posicao ON kanban_cards(projeto_id, posicao);
    CREATE INDEX IF NOT EXISTS idx_kanban_historico_card_data ON kanban_historico(card_id, data_mudanca);
  `);

  if (!hasColumn(db, "projetos", "documentacao_uso")) {
    db.exec("ALTER TABLE projetos ADD COLUMN documentacao_uso TEXT");
  }

  database = db;
  return db;
}

function normalizeNullableString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeOrderBy(value: string | undefined): ProjetoOrderBy {
  switch (value) {
    case "nome":
    case "status":
    case "data_criacao":
    case "data_atualizacao":
      return value;
    default:
      return "data_atualizacao";
  }
}

function sanitizeOrder(value: string | undefined): SortOrder {
  return value === "asc" ? "asc" : "desc";
}

function mapProjeto(row: Record<string, unknown>): Projeto {
  return row as unknown as Projeto;
}

function mapKanbanCard(row: Record<string, unknown>): KanbanCard {
  return row as unknown as KanbanCard;
}

function mapHistoricoEntry(row: Record<string, unknown>): HistoricoEntry {
  return row as unknown as HistoricoEntry;
}

export function listProjetos(filters: ProjetoFilters = {}) {
  const db = ensureDb();
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters.status && filters.status !== "todos") {
    clauses.push("status = ?");
    values.push(filters.status);
  }

  if (filters.setor && filters.setor !== "todos") {
    clauses.push("setor = ?");
    values.push(filters.setor);
  }

  if (filters.search?.trim()) {
    clauses.push("LOWER(nome) LIKE LOWER(?)");
    values.push(`%${filters.search.trim()}%`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const orderBy = sanitizeOrderBy(filters.orderBy);
  const order = sanitizeOrder(filters.order).toUpperCase();

  const rows = db
    .prepare(`SELECT * FROM projetos ${whereClause} ORDER BY ${orderBy} ${order}`)
    .all(...values) as Record<string, unknown>[];

  return rows.map(mapProjeto);
}

export function getProjetoById(id: string) {
  const db = ensureDb();
  const row = db
    .prepare("SELECT * FROM projetos WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;

  return row ? mapProjeto(row) : null;
}

export function createProjeto(input: ProjetoInput) {
  const db = ensureDb();
  const now = new Date().toISOString();
  const projeto: Projeto = {
    id: randomUUID(),
    nome: input.nome.trim(),
    setor: normalizeNullableString(input.setor),
    descricao: normalizeNullableString(input.descricao),
    documentacao_uso: normalizeNullableString(input.documentacao_uso),
    status: input.status ?? "ativo",
    versao: normalizeNullableString(input.versao),
    url_base: normalizeNullableString(input.url_base),
    logo_url: normalizeNullableString(input.logo_url),
    responsavel: normalizeNullableString(input.responsavel),
    email_contato: normalizeNullableString(input.email_contato),
    data_criacao: now,
    data_atualizacao: now,
    criado_por: normalizeNullableString(input.criado_por),
  };

  db.prepare(`
    INSERT INTO projetos (
      id, nome, setor, descricao, documentacao_uso, status, versao, url_base, logo_url,
      responsavel, email_contato, data_criacao, data_atualizacao, criado_por
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    projeto.id,
    projeto.nome,
    projeto.setor,
    projeto.descricao,
    projeto.documentacao_uso,
    projeto.status,
    projeto.versao,
    projeto.url_base,
    projeto.logo_url,
    projeto.responsavel,
    projeto.email_contato,
    projeto.data_criacao,
    projeto.data_atualizacao,
    projeto.criado_por
  );

  return projeto;
}

export function updateProjeto(id: string, updates: Partial<ProjetoInput> & { data_atualizacao?: string }) {
  const db = ensureDb();
  const current = getProjetoById(id);

  if (!current) {
    return null;
  }

  const next: Projeto = {
    ...current,
    nome: typeof updates.nome === "string" ? updates.nome.trim() : current.nome,
    setor: "setor" in updates ? normalizeNullableString(updates.setor) : current.setor,
    descricao: "descricao" in updates ? normalizeNullableString(updates.descricao) : current.descricao,
    documentacao_uso:
      "documentacao_uso" in updates
        ? normalizeNullableString(updates.documentacao_uso)
        : current.documentacao_uso,
    status: updates.status ?? current.status,
    versao: "versao" in updates ? normalizeNullableString(updates.versao) : current.versao,
    url_base: "url_base" in updates ? normalizeNullableString(updates.url_base) : current.url_base,
    logo_url: "logo_url" in updates ? normalizeNullableString(updates.logo_url) : current.logo_url,
    responsavel: "responsavel" in updates ? normalizeNullableString(updates.responsavel) : current.responsavel,
    email_contato: "email_contato" in updates ? normalizeNullableString(updates.email_contato) : current.email_contato,
    criado_por: "criado_por" in updates ? normalizeNullableString(updates.criado_por) : current.criado_por,
    data_atualizacao: updates.data_atualizacao ?? new Date().toISOString(),
  };

  db.prepare(`
    UPDATE projetos
    SET nome = ?, setor = ?, descricao = ?, documentacao_uso = ?, status = ?, versao = ?, url_base = ?,
        logo_url = ?, responsavel = ?, email_contato = ?, data_atualizacao = ?, criado_por = ?
    WHERE id = ?
  `).run(
    next.nome,
    next.setor,
    next.descricao,
    next.documentacao_uso,
    next.status,
    next.versao,
    next.url_base,
    next.logo_url,
    next.responsavel,
    next.email_contato,
    next.data_atualizacao,
    next.criado_por,
    id
  );

  return next;
}

export function deleteProjeto(id: string) {
  const db = ensureDb();
  const result = db.prepare("DELETE FROM projetos WHERE id = ?").run(id);
  return result.changes > 0;
}

export function listKanbanCards(projetoId: string) {
  const db = ensureDb();
  const rows = db
    .prepare("SELECT * FROM kanban_cards WHERE projeto_id = ? ORDER BY posicao ASC, data_criacao ASC")
    .all(projetoId) as Record<string, unknown>[];

  return rows.map(mapKanbanCard);
}

export function createKanbanCard(projetoId: string, input: KanbanCardInput) {
  const db = ensureDb();
  const now = new Date().toISOString();
  const card: KanbanCard = {
    id: randomUUID(),
    projeto_id: projetoId,
    coluna: input.coluna,
    titulo: input.titulo.trim(),
    descricao: normalizeNullableString(input.descricao),
    cor: input.cor ?? "blue",
    prioridade: input.prioridade ?? "media",
    categoria: input.categoria ?? "desenvolvimento",
    posicao: typeof input.posicao === "number" ? input.posicao : 0,
    data_criacao: now,
    data_atualizacao: now,
  };

  db.prepare(`
    INSERT INTO kanban_cards (
      id, projeto_id, coluna, titulo, descricao, cor, prioridade, categoria,
      posicao, data_criacao, data_atualizacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    card.id,
    card.projeto_id,
    card.coluna,
    card.titulo,
    card.descricao,
    card.cor,
    card.prioridade,
    card.categoria,
    card.posicao,
    card.data_criacao,
    card.data_atualizacao
  );

  db.prepare(`
    INSERT INTO kanban_historico (id, card_id, coluna_anterior, coluna_nova, data_mudanca)
    VALUES (?, ?, ?, ?, ?)
  `).run(randomUUID(), card.id, null, card.coluna, now);

  return card;
}

export function getKanbanCardById(projetoId: string, cardId: string) {
  const db = ensureDb();
  const cardRow = db
    .prepare("SELECT * FROM kanban_cards WHERE id = ? AND projeto_id = ?")
    .get(cardId, projetoId) as Record<string, unknown> | undefined;

  if (!cardRow) {
    return null;
  }

  const historyRows = db
    .prepare("SELECT * FROM kanban_historico WHERE card_id = ? ORDER BY data_mudanca ASC")
    .all(cardId) as Record<string, unknown>[];

  return {
    ...mapKanbanCard(cardRow),
    historico: historyRows.map(mapHistoricoEntry),
  };
}

export function updateKanbanCard(projetoId: string, cardId: string, updates: KanbanCardUpdate) {
  const db = ensureDb();
  const current = db
    .prepare("SELECT * FROM kanban_cards WHERE id = ? AND projeto_id = ?")
    .get(cardId, projetoId) as Record<string, unknown> | undefined;

  if (!current) {
    return null;
  }

  const currentCard = mapKanbanCard(current);
  const now = new Date().toISOString();
  const next: KanbanCard = {
    ...currentCard,
    coluna: typeof updates.coluna === "string" ? updates.coluna : currentCard.coluna,
    titulo: typeof updates.titulo === "string" ? updates.titulo.trim() : currentCard.titulo,
    descricao: "descricao" in updates ? normalizeNullableString(updates.descricao) : currentCard.descricao,
    cor: typeof updates.cor === "string" ? updates.cor : currentCard.cor,
    prioridade: typeof updates.prioridade === "string" ? updates.prioridade : currentCard.prioridade,
    categoria: typeof updates.categoria === "string" ? updates.categoria : currentCard.categoria,
    posicao: typeof updates.posicao === "number" ? updates.posicao : currentCard.posicao,
    data_atualizacao: now,
  };

  if ("coluna" in updates && currentCard.coluna !== next.coluna) {
    db.prepare(`
      INSERT INTO kanban_historico (id, card_id, coluna_anterior, coluna_nova, data_mudanca)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), cardId, currentCard.coluna, next.coluna, now);
  }

  db.prepare(`
    UPDATE kanban_cards
    SET coluna = ?, titulo = ?, descricao = ?, cor = ?, prioridade = ?,
        categoria = ?, posicao = ?, data_atualizacao = ?
    WHERE id = ? AND projeto_id = ?
  `).run(
    next.coluna,
    next.titulo,
    next.descricao,
    next.cor,
    next.prioridade,
    next.categoria,
    next.posicao,
    next.data_atualizacao,
    cardId,
    projetoId
  );

  return next;
}

export function deleteKanbanCard(projetoId: string, cardId: string) {
  const db = ensureDb();
  const result = db
    .prepare("DELETE FROM kanban_cards WHERE id = ? AND projeto_id = ?")
    .run(cardId, projetoId);

  return result.changes > 0;
}

export function getDatabasePath() {
  ensureDb();
  return DB_PATH;
}

export function getTimelineSnapshot() {
  const db = ensureDb();
  const projetos = db
    .prepare("SELECT * FROM projetos ORDER BY data_criacao ASC")
    .all() as Record<string, unknown>[];

  const cards = db
    .prepare(`
      SELECT c.*, p.nome AS projeto_nome
      FROM kanban_cards c
      LEFT JOIN projetos p ON p.id = c.projeto_id
      ORDER BY c.data_criacao ASC
    `)
    .all() as Record<string, unknown>[];

  const historico = db
    .prepare(`
      SELECT h.*, c.titulo, c.projeto_id, p.nome AS projeto_nome
      FROM kanban_historico h
      INNER JOIN kanban_cards c ON c.id = h.card_id
      LEFT JOIN projetos p ON p.id = c.projeto_id
      ORDER BY h.data_mudanca ASC
    `)
    .all() as Record<string, unknown>[];

  return {
    projetos: projetos.map(mapProjeto),
    cards: cards as unknown as TimelineCardRow[],
    historico: historico as unknown as TimelineHistoryRow[],
  };
}
