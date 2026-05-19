"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import type { Projeto } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  ativo: "bg-green-500",
  construcao: "bg-yellow-400",
  inativo: "bg-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  ativo: "Ativo",
  construcao: "Em Construção",
  inativo: "Inativo",
};

const DOCUMENTATION_PLACEHOLDER = `Documente aqui as instrucoes de uso do projeto.

Sugestao de estrutura:
1. Objetivo do projeto
2. Como acessar
3. Fluxo principal de uso
4. Cuidados ou observacoes
5. Contatos de suporte`;

export default function ProjetoDocumentacaoPage() {
  const params = useParams();
  const router = useRouter();
  const projetoId = params.id as string;

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [documentacao, setDocumentacao] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const fetchProjeto = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/projetos/${projetoId}`);
      if (!response.ok) {
        throw new Error("Erro ao buscar projeto");
      }

      const data: Projeto = await response.json();
      setProjeto(data);
      setDocumentacao(data.documentacao_uso ?? "");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => {
    fetchProjeto();
  }, [fetchProjeto]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projetos/${projetoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentacao_uso: documentacao,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar documentação");
      }

      const updated: Projeto = await response.json();
      setProjeto(updated);
      setDocumentacao(updated.documentacao_uso ?? "");
      setSavedAt(new Date().toISOString());
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao Dashboard
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {projeto ? `Documentação • ${projeto.nome}` : "Documentação"}
                </h1>
                {projeto && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white font-medium",
                      STATUS_COLORS[projeto.status]
                    )}
                  >
                    {STATUS_LABELS[projeto.status]}
                  </span>
                )}
              </div>
              {projeto && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {projeto.setor} — registre instruções de uso e observações operacionais
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {projeto?.url_base && (
              <a
                href={projeto.url_base}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm rounded-xl transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Acessar Projeto
              </a>
            )}
            <button
              onClick={fetchProjeto}
              className="p-2 border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-400 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar Documentação"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_360px]">
        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Instruções de Uso
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mantenha aqui o passo a passo de uso, acessos, fluxos e observações importantes.
            </p>
          </div>

          <div className="p-6">
            <textarea
              value={documentacao}
              onChange={(event) => setDocumentacao(event.target.value)}
              placeholder={DOCUMENTATION_PLACEHOLDER}
              className="min-h-[420px] w-full resize-y rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              O que documentar
            </h3>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <p>1. Como acessar o projeto e quais perfis usam.</p>
              <p>2. Passo a passo das rotinas principais.</p>
              <p>3. Regras de negócio, atalhos e pontos de atenção.</p>
              <p>4. Links úteis, credenciais operacionais e contatos responsáveis.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Status da documentação
            </h3>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <p>
                Projeto:
                <span className="ml-1 font-medium text-gray-700 dark:text-gray-200">
                  {projeto?.nome ?? "Carregando..."}
                </span>
              </p>
              <p>
                Último salvamento:
                <span className="ml-1 font-medium text-gray-700 dark:text-gray-200">
                  {savedAt ? new Date(savedAt).toLocaleString("pt-BR") : "Ainda não salvo nesta sessão"}
                </span>
              </p>
              <p>
                Conteúdo atual:
                <span className="ml-1 font-medium text-gray-700 dark:text-gray-200">
                  {documentacao.trim() ? "Preenchido" : "Vazio"}
                </span>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </AppLayout>
  );
}
