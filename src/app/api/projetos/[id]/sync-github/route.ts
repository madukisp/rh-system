import { getProjetoById, updateProjeto } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface GitHubCommit {
  commit: {
    author: {
      date: string;
    };
  };
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/i);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchLatestCommitFromGitHub(
  owner: string,
  repo: string
): Promise<string | null> {
  try {
    const token = process.env.GITHUB_TOKEN;
    const headers: HeadersInit = {
      Accept: "application/vnd.github.v3+json",
    };

    if (token) {
      headers.Authorization = `token ${token}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
      { headers }
    );

    if (!response.ok) {
      console.error(
        `GitHub API error: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const commits: GitHubCommit[] = await response.json();
    if (commits.length > 0) {
      return commits[0].commit.author.date;
    }

    return null;
  } catch (error) {
    console.error("Erro ao buscar commits do GitHub:", error);
    return null;
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projeto = await getProjetoById(id);

    if (!projeto) {
      return NextResponse.json(
        { error: "Projeto não encontrado" },
        { status: 404 }
      );
    }

    if (!projeto.url_base) {
      return NextResponse.json(
        { error: "Projeto não possui URL base configurada" },
        { status: 400 }
      );
    }

    const parsed = parseGitHubUrl(projeto.url_base);
    if (!parsed) {
      return NextResponse.json(
        { error: "URL base não é um repositório GitHub válido" },
        { status: 400 }
      );
    }

    const commitDate = await fetchLatestCommitFromGitHub(
      parsed.owner,
      parsed.repo
    );

    if (!commitDate) {
      return NextResponse.json(
        { error: "Não foi possível buscar commits do repositório" },
        { status: 500 }
      );
    }

    const updated = await updateProjeto(id, { data_atualizacao: commitDate });

    if (!updated) {
      return NextResponse.json(
        { error: "Erro ao atualizar projeto" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sincronizado com sucesso",
      data_atualizacao: commitDate,
      projeto: updated,
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
