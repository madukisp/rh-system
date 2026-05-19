import path from "node:path";
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";

const { Client } = pg;

const ROOT = process.cwd();
const SQLITE_PATH = process.env.SQLITE_PATH || path.join(ROOT, "data", "rh-system.sqlite");
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_INTERNAL;

function ensureSchema(client) {
  return client.query(`
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
}

function readAll(sqlite, sql) {
  return sqlite.prepare(sql).all();
}

async function main() {
  if (!DATABASE_URL) {
    throw new Error("Defina DATABASE_URL, POSTGRES_URL ou POSTGRES_URL_INTERNAL antes de rodar a migração.");
  }

  if (!existsSync(SQLITE_PATH)) {
    throw new Error(`Banco SQLite não encontrado em: ${SQLITE_PATH}`);
  }

  const sqlite = new DatabaseSync(SQLITE_PATH);
  sqlite.exec("PRAGMA foreign_keys = ON");

  const projetos = readAll(sqlite, "SELECT * FROM projetos ORDER BY data_criacao ASC");
  const cards = readAll(sqlite, "SELECT * FROM kanban_cards ORDER BY data_criacao ASC");
  const historico = readAll(sqlite, "SELECT * FROM kanban_historico ORDER BY data_mudanca ASC");

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  await client.connect();
  await ensureSchema(client);
  await client.query("BEGIN");

  try {
    for (const row of projetos) {
      await client.query(
        `
          INSERT INTO projetos (
            id, nome, setor, descricao, documentacao_uso, status, versao, url_base,
            logo_url, responsavel, email_contato, data_criacao, data_atualizacao, criado_por
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14
          )
          ON CONFLICT (id) DO UPDATE SET
            nome = EXCLUDED.nome,
            setor = EXCLUDED.setor,
            descricao = EXCLUDED.descricao,
            documentacao_uso = EXCLUDED.documentacao_uso,
            status = EXCLUDED.status,
            versao = EXCLUDED.versao,
            url_base = EXCLUDED.url_base,
            logo_url = EXCLUDED.logo_url,
            responsavel = EXCLUDED.responsavel,
            email_contato = EXCLUDED.email_contato,
            data_criacao = EXCLUDED.data_criacao,
            data_atualizacao = EXCLUDED.data_atualizacao,
            criado_por = EXCLUDED.criado_por
        `,
        [
          row.id,
          row.nome,
          row.setor ?? null,
          row.descricao ?? null,
          row.documentacao_uso ?? null,
          row.status,
          row.versao ?? null,
          row.url_base ?? null,
          row.logo_url ?? null,
          row.responsavel ?? null,
          row.email_contato ?? null,
          row.data_criacao,
          row.data_atualizacao,
          row.criado_por ?? null,
        ]
      );
    }

    for (const row of cards) {
      await client.query(
        `
          INSERT INTO kanban_cards (
            id, projeto_id, coluna, titulo, descricao, cor, prioridade, categoria,
            posicao, data_criacao, data_atualizacao
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11
          )
          ON CONFLICT (id) DO UPDATE SET
            projeto_id = EXCLUDED.projeto_id,
            coluna = EXCLUDED.coluna,
            titulo = EXCLUDED.titulo,
            descricao = EXCLUDED.descricao,
            cor = EXCLUDED.cor,
            prioridade = EXCLUDED.prioridade,
            categoria = EXCLUDED.categoria,
            posicao = EXCLUDED.posicao,
            data_criacao = EXCLUDED.data_criacao,
            data_atualizacao = EXCLUDED.data_atualizacao
        `,
        [
          row.id,
          row.projeto_id,
          row.coluna,
          row.titulo,
          row.descricao ?? null,
          row.cor ?? "blue",
          row.prioridade ?? "media",
          row.categoria ?? "desenvolvimento",
          Number.isFinite(row.posicao) ? row.posicao : Number(row.posicao ?? 0),
          row.data_criacao,
          row.data_atualizacao,
        ]
      );
    }

    for (const row of historico) {
      await client.query(
        `
          INSERT INTO kanban_historico (
            id, card_id, coluna_anterior, coluna_nova, data_mudanca
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET
            card_id = EXCLUDED.card_id,
            coluna_anterior = EXCLUDED.coluna_anterior,
            coluna_nova = EXCLUDED.coluna_nova,
            data_mudanca = EXCLUDED.data_mudanca
        `,
        [
          row.id,
          row.card_id,
          row.coluna_anterior ?? null,
          row.coluna_nova,
          row.data_mudanca,
        ]
      );
    }

    await client.query("COMMIT");

    console.log("Migracao concluida com sucesso.");
    console.log(`SQLite: ${SQLITE_PATH}`);
    console.log(`Projetos migrados: ${projetos.length}`);
    console.log(`Cards migrados: ${cards.length}`);
    console.log(`Historico migrado: ${historico.length}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
