import { NextRequest, NextResponse } from "next/server";
import {
  deleteKanbanCard,
  getKanbanCardById,
  updateKanbanCard,
} from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const { id, cardId } = await params;
  const data = await getKanbanCardById(id, cardId);
  if (!data) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const { id, cardId } = await params;
  const body = await req.json();
  const data = await updateKanbanCard(id, cardId, body);
  if (!data) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const { id, cardId } = await params;
  const deleted = await deleteKanbanCard(id, cardId);
  if (!deleted) {
    return NextResponse.json({ error: "Card não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
