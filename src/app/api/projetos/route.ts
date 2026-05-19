import { createProjeto, listProjetos } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "todos";
    const setor = searchParams.get("setor") || "todos";
    const search = searchParams.get("search") || "";
    const orderBy = searchParams.get("orderBy") || "data_atualizacao";
    const order = searchParams.get("order") || "desc";

    const data = await listProjetos({ status, setor, search, orderBy, order });
    return NextResponse.json(data);
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (typeof body.nome !== "string" || body.nome.trim().length === 0) {
      return NextResponse.json(
        { error: "Nome do projeto é obrigatório" },
        { status: 400 }
      );
    }

    const data = await createProjeto({
      nome: body.nome,
      setor: body.setor,
      descricao: body.descricao,
      status: "ativo",
      versao: body.versao,
      url_base: body.url_base,
      responsavel: body.responsavel,
      email_contato: body.email_contato,
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
