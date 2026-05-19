import { NextRequest, NextResponse } from "next/server";
import { createKanbanCard, getProjetoById, listKanbanCards } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await listKanbanCards(id);
  return NextResponse.json(data);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const projeto = await getProjetoById(id);

  if (!projeto) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  }

  if (typeof body.titulo !== "string" || body.titulo.trim().length === 0) {
    return NextResponse.json({ error: "Título é obrigatório" }, { status: 400 });
  }

  if (typeof body.coluna !== "string" || body.coluna.trim().length === 0) {
    return NextResponse.json({ error: "Coluna é obrigatória" }, { status: 400 });
  }

  const data = await createKanbanCard(id, body);

  return NextResponse.json(data, { status: 201 });
}
