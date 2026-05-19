import { readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, ".env.local");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "rh-system.sqlite");

function parseEnvFile(filePath) {
  const env = {};
  const raw = readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function ensureSchema(db) {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS projetos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      setor TEXT,
      descricao TEXT,
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
  `);
}

async function fetchAllRows({ baseUrl, anonKey, table, orderBy = "id", batchSize = 1000 }) {
  const rows = [];
  let offset = 0;

  while (true) {
    const url = new URL(`${baseUrl}/rest/v1/${table}`);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", `${orderBy}.asc`);

    const response = await fetch(url, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Range-Unit": "items",
        Range: `${offset}-${offset + batchSize - 1}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Falha ao buscar ${table}: ${response.status} ${body}`);
    }

    const batch = await response.json();
    rows.push(...batch);

    if (batch.length < batchSize) {
      break;
    }

    offset += batchSize;
  }

  return rows;
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function importProjetos(db, rows) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO projetos (
      id, nome, setor, descricao, status, versao, url_base, logo_url,
      responsavel, email_contato, data_criacao, data_atualizacao, criado_por
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  for (const row of rows) {
    const result = insert.run(
      row.id,
      row.nome,
      row.setor ?? null,
      row.descricao ?? null,
      row.status,
      row.versao ?? null,
      row.url_base ?? null,
      row.logo_url ?? null,
      row.responsavel ?? null,
      row.email_contato ?? null,
      row.data_criacao,
      row.data_atualizacao,
      row.criado_por ?? null
    );
    inserted += result.changes;
  }

  return inserted;
}

function importKanbanCards(db, rows) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO kanban_cards (
      id, projeto_id, coluna, titulo, descricao, cor, prioridade, categoria,
      posicao, data_criacao, data_atualizacao
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  for (const row of rows) {
    const result = insert.run(
      row.id,
      row.projeto_id,
      row.coluna,
      row.titulo,
      row.descricao ?? null,
      row.cor ?? "blue",
      row.prioridade ?? "media",
      row.categoria ?? "desenvolvimento",
      Number.isFinite(row.posicao) ? row.posicao : 0,
      row.data_criacao,
      row.data_atualizacao
    );
    inserted += result.changes;
  }

  return inserted;
}

function importKanbanHistorico(db, rows) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO kanban_historico (
      id, card_id, coluna_anterior, coluna_nova, data_mudanca
    ) VALUES (?, ?, ?, ?, ?)
  `);

  let inserted = 0;
  for (const row of rows) {
    const result = insert.run(
      row.id,
      row.card_id,
      row.coluna_anterior ?? null,
      row.coluna_nova,
      row.data_mudanca
    );
    inserted += result.changes;
  }

  return inserted;
}

async function main() {
  if (!existsSync(ENV_PATH)) {
    throw new Error(".env.local não encontrado.");
  }

  const env = parseEnvFile(ENV_PATH);
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!baseUrl || !anonKey) {
    throw new Error("Credenciais NEXT_PUBLIC_SUPABASE_* não encontradas em .env.local.");
  }

  ensureDataDir();
  const db = new DatabaseSync(DB_PATH);
  ensureSchema(db);

  console.log("Buscando projetos no Supabase...");
  const projetos = await fetchAllRows({ baseUrl, anonKey, table: "projetos" });

  console.log("Buscando cards do kanban no Supabase...");
  const cards = await fetchAllRows({ baseUrl, anonKey, table: "kanban_cards" });

  console.log("Buscando histórico do kanban no Supabase...");
  const historico = await fetchAllRows({
    baseUrl,
    anonKey,
    table: "kanban_historico",
    orderBy: "data_mudanca",
  });

  db.exec("BEGIN");
  try {
    const projetosInseridos = importProjetos(db, projetos);
    const cardsInseridos = importKanbanCards(db, cards);
    const historicoInserido = importKanbanHistorico(db, historico);
    db.exec("COMMIT");

    console.log("");
    console.log("Importação concluída sem apagar dados locais.");
    console.log(`Projetos no Supabase: ${projetos.length} | inseridos no SQLite: ${projetosInseridos}`);
    console.log(`Cards no Supabase: ${cards.length} | inseridos no SQLite: ${cardsInseridos}`);
    console.log(`Histórico no Supabase: ${historico.length} | inserido no SQLite: ${historicoInserido}`);
    console.log(`Banco SQLite: ${DB_PATH}`);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
