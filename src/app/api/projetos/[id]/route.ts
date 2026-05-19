import { NextResponse } from "next/server";
import { deleteProjeto, getProjetoById, updateProjeto } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = getProjetoById(id);
  if (!data) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const data = updateProjeto(id, body);
  if (!data) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteProjeto(id);
  if (!deleted) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
