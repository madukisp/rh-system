import "server-only";

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Pool, type PoolClient } from "pg";

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

type SqlExecutor = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "rh-system.sqlite");
const POSTGRES_URL =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_INTERNAL ??
  null;

let sqliteDatabase: DatabaseSync | null = null;
let pgPool: Pool | null = null;
let pgReadyPromise: Promise<Pool> | null = null;

function hasColumn(db: DatabaseSync, table: string, column: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<Record<string, unknown>>;
  return columns.some((entry) => entry.name === column);
}

function ensureSqliteDb() {
  if (sqliteDatabase) {
    return sqliteDatabase;
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

  sqliteDatabase = db;
  return db;
}

async function ensurePostgresPool() {
  if (!POSTGRES_URL) {
    return null;
  }

  if (pgPool) {
    return pgPool;
  }

  if (!pgReadyPromise) {
    pgReadyPromise = (async () => {
      const pool = new Pool({
        connectionString: POSTGRES_URL,
      });

      await pool.query(`
        CREATE TABLE IF NOT EXISTS projetos (
          id TEXT PRIMARY KEY,
          nome TEXT NOT NULL,
          setor TEXT,
          descricao TEXT,
          documentacao_uso TEXT,
          status TEXT NOT NULL DEFAULT 'ativo',
          versao TEXT,
          url_base TEXT,
          logo_url TEXT,
          responsavel TEXT,
          email_contato TEXT,
          data_criacao TEXT NOT NULL,
          data_atualizacao TEXT NOT NULL,
          criado_por TEXT,
          CONSTRAINT projetos_status_check CHECK (status IN ('ativo', 'construcao', 'inativo'))
        );

        CREATE TABLE IF NOT EXISTS kanban_cards (
          id TEXT PRIMARY KEY,
          projeto_id TEXT NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
          coluna TEXT NOT NULL,
          titulo TEXT NOT NULL,
          descricao TEXT,
          cor TEXT NOT NULL DEFAULT 'blue',
          prioridade TEXT NOT NULL DEFAULT 'media',
          categoria TEXT NOT NULL DEFAULT 'desenvolvimento',
          posicao INTEGER NOT NULL DEFAULT 0,
          data_criacao TEXT NOT NULL,
          data_atualizacao TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS kanban_historico (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
          coluna_anterior TEXT,
          coluna_nova TEXT NOT NULL,
          data_mudanca TEXT NOT NULL
        );

        ALTER TABLE projetos ADD COLUMN IF NOT EXISTS documentacao_uso TEXT;

        CREATE INDEX IF NOT EXISTS idx_projetos_data_atualizacao ON projetos(data_atualizacao DESC);
        CREATE INDEX IF NOT EXISTS idx_kanban_cards_projeto_posicao ON kanban_cards(projeto_id, posicao);
        CREATE INDEX IF NOT EXISTS idx_kanban_historico_card_data ON kanban_historico(card_id, data_mudanca);
      `);

      pgPool = pool;
      return pool;
    })();
  }

  return pgReadyPromise;
}

async function getExecutor(client?: PoolClient): Promise<SqlExecutor> {
  const postgres = await ensurePostgresPool();

  if (postgres) {
    const runner = client ?? postgres;
    return {
      async query(sql, params = []) {
        const result = await runner.query(sql, params);
        return { rows: result.rows as Record<string, unknown>[], rowCount: result.rowCount ?? 0 };
      },
    };
  }

  const db = ensureSqliteDb();
  return {
    async query(sql, params = []) {
      const normalized = sql.replace(/\$(\d+)/g, "?");
      const trimmed = normalized.trim().toUpperCase();

      if (trimmed.startsWith("SELECT")) {
        const rows = db.prepare(normalized).all(...params) as Record<string, unknown>[];
        return { rows, rowCount: rows.length };
      }

      if (trimmed.includes("RETURNING")) {
        const rows = db.prepare(normalized).all(...params) as Record<string, unknown>[];
        return { rows, rowCount: rows.length };
      }

      const result = db.prepare(normalized).run(...params);
      return { rows: [], rowCount: result.changes };
    },
  };
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
  return {
    ...row,
    posicao: typeof row.posicao === "number" ? row.posicao : Number(row.posicao ?? 0),
  } as unknown as KanbanCard;
}

function mapHistoricoEntry(row: Record<string, unknown>): HistoricoEntry {
  return row as unknown as HistoricoEntry;
}

async function withTransaction<T>(callback: (client?: PoolClient) => Promise<T>) {
  const postgres = await ensurePostgresPool();

  if (!postgres) {
    const db = ensureSqliteDb();
    db.exec("BEGIN");
    try {
      const result = await callback();
      db.exec("COMMIT");
      return result;
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  const client = await postgres.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listProjetos(filters: ProjetoFilters = {}) {
  const executor = await getExecutor();
  const clauses: string[] = [];
  const values: unknown[] = [];

  if (filters.status && filters.status !== "todos") {
    values.push(filters.status);
    clauses.push(`status = $${values.length}`);
  }

  if (filters.setor && filters.setor !== "todos") {
    values.push(filters.setor);
    clauses.push(`setor = $${values.length}`);
  }

  if (filters.search?.trim()) {
    values.push(`%${filters.search.trim()}%`);
    clauses.push(`LOWER(nome) LIKE LOWER($${values.length})`);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const orderBy = sanitizeOrderBy(filters.orderBy);
  const order = sanitizeOrder(filters.order).toUpperCase();

  const { rows } = await executor.query(
    `SELECT * FROM projetos ${whereClause} ORDER BY ${orderBy} ${order}`,
    values
  );

  return rows.map(mapProjeto);
}

export async function getProjetoById(id: string) {
  const executor = await getExecutor();
  const { rows } = await executor.query("SELECT * FROM projetos WHERE id = $1", [id]);
  const row = rows[0];
  return row ? mapProjeto(row) : null;
}

export async function createProjeto(input: ProjetoInput) {
  const executor = await getExecutor();
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

  await executor.query(
    `
      INSERT INTO projetos (
        id, nome, setor, descricao, documentacao_uso, status, versao, url_base, logo_url,
        responsavel, email_contato, data_criacao, data_atualizacao, criado_por
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `,
    [
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
      projeto.criado_por,
    ]
  );

  return projeto;
}

export async function updateProjeto(id: string, updates: Partial<ProjetoInput> & { data_atualizacao?: string }) {
  const current = await getProjetoById(id);

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

  const executor = await getExecutor();
  await executor.query(
    `
      UPDATE projetos
      SET nome = $1, setor = $2, descricao = $3, documentacao_uso = $4, status = $5, versao = $6,
          url_base = $7, logo_url = $8, responsavel = $9, email_contato = $10,
          data_atualizacao = $11, criado_por = $12
      WHERE id = $13
    `,
    [
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
      id,
    ]
  );

  return next;
}

export async function deleteProjeto(id: string) {
  const executor = await getExecutor();
  const result = await executor.query("DELETE FROM projetos WHERE id = $1", [id]);
  return result.rowCount > 0;
}

export async function listKanbanCards(projetoId: string) {
  const executor = await getExecutor();
  const { rows } = await executor.query(
    "SELECT * FROM kanban_cards WHERE projeto_id = $1 ORDER BY posicao ASC, data_criacao ASC",
    [projetoId]
  );

  return rows.map(mapKanbanCard);
}

export async function createKanbanCard(projetoId: string, input: KanbanCardInput) {
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

  await withTransaction(async (client) => {
    const executor = await getExecutor(client);

    await executor.query(
      `
        INSERT INTO kanban_cards (
          id, projeto_id, coluna, titulo, descricao, cor, prioridade, categoria,
          posicao, data_criacao, data_atualizacao
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
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
        card.data_atualizacao,
      ]
    );

    await executor.query(
      `
        INSERT INTO kanban_historico (id, card_id, coluna_anterior, coluna_nova, data_mudanca)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [randomUUID(), card.id, null, card.coluna, now]
    );
  });

  return card;
}

export async function getKanbanCardById(projetoId: string, cardId: string) {
  const executor = await getExecutor();
  const cardResult = await executor.query(
    "SELECT * FROM kanban_cards WHERE id = $1 AND projeto_id = $2",
    [cardId, projetoId]
  );
  const cardRow = cardResult.rows[0];

  if (!cardRow) {
    return null;
  }

  const historyResult = await executor.query(
    "SELECT * FROM kanban_historico WHERE card_id = $1 ORDER BY data_mudanca ASC",
    [cardId]
  );

  return {
    ...mapKanbanCard(cardRow),
    historico: historyResult.rows.map(mapHistoricoEntry),
  };
}

export async function updateKanbanCard(projetoId: string, cardId: string, updates: KanbanCardUpdate) {
  const executor = await getExecutor();
  const currentResult = await executor.query(
    "SELECT * FROM kanban_cards WHERE id = $1 AND projeto_id = $2",
    [cardId, projetoId]
  );
  const current = currentResult.rows[0];

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

  await withTransaction(async (client) => {
    const transactional = await getExecutor(client);

    if ("coluna" in updates && currentCard.coluna !== next.coluna) {
      await transactional.query(
        `
          INSERT INTO kanban_historico (id, card_id, coluna_anterior, coluna_nova, data_mudanca)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [randomUUID(), cardId, currentCard.coluna, next.coluna, now]
      );
    }

    await transactional.query(
      `
        UPDATE kanban_cards
        SET coluna = $1, titulo = $2, descricao = $3, cor = $4, prioridade = $5,
            categoria = $6, posicao = $7, data_atualizacao = $8
        WHERE id = $9 AND projeto_id = $10
      `,
      [
        next.coluna,
        next.titulo,
        next.descricao,
        next.cor,
        next.prioridade,
        next.categoria,
        next.posicao,
        next.data_atualizacao,
        cardId,
        projetoId,
      ]
    );
  });

  return next;
}

export async function deleteKanbanCard(projetoId: string, cardId: string) {
  const executor = await getExecutor();
  const result = await executor.query(
    "DELETE FROM kanban_cards WHERE id = $1 AND projeto_id = $2",
    [cardId, projetoId]
  );

  return result.rowCount > 0;
}

export async function getDatabasePath() {
  if (POSTGRES_URL) {
    return null;
  }

  ensureSqliteDb();
  return DB_PATH;
}

export async function getTimelineSnapshot() {
  const executor = await getExecutor();
  const projetosResult = await executor.query("SELECT * FROM projetos ORDER BY data_criacao ASC");
  const cardsResult = await executor.query(
    `
      SELECT c.*, p.nome AS projeto_nome
      FROM kanban_cards c
      LEFT JOIN projetos p ON p.id = c.projeto_id
      ORDER BY c.data_criacao ASC
    `
  );
  const historicoResult = await executor.query(
    `
      SELECT h.*, c.titulo, c.projeto_id, p.nome AS projeto_nome
      FROM kanban_historico h
      INNER JOIN kanban_cards c ON c.id = h.card_id
      LEFT JOIN projetos p ON p.id = c.projeto_id
      ORDER BY h.data_mudanca ASC
    `
  );

  return {
    projetos: projetosResult.rows.map(mapProjeto),
    cards: cardsResult.rows.map(mapKanbanCard) as TimelineCardRow[],
    historico: historicoResult.rows as unknown as TimelineHistoryRow[],
  };
}
