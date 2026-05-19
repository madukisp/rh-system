"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Kanban,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { KanbanBoard, type KanbanCard } from "@/components/kanban-board";
import type { Projeto } from "@/lib/types";
import { cn } from "@/lib/utils";

function SkeletonKanban() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="min-w-[260px] w-[260px] bg-gray-100 dark:bg-gray-900 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          </div>
          {Array.from({ length: i + 1 }).map((_, j) => (
            <div key={j} className="bg-white dark:bg-gray-800 rounded-xl p-3 space-y-2">
              <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
              <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

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

export default function KanbanPage() {
  const params = useParams();
  const router = useRouter();
  const projetoId = params.id as string;

  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, cardsRes] = await Promise.all([
        fetch(`/api/projetos/${projetoId}`),
        fetch(`/api/projetos/${projetoId}/kanban`),
      ]);
      if (projRes.ok) setProjeto(await projRes.json());
      if (cardsRes.ok) setCards(await cardsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projetoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async (
    coluna: string,
    data: { titulo: string; descricao: string; cor: string; prioridade: string; categoria: string }
  ) => {
    setSaving(true);
    try {
      const colCards = cards.filter((c) => c.coluna === coluna);
      const res = await fetch(`/api/projetos/${projetoId}/kanban`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, coluna, posicao: colCards.length }),
      });
      if (res.ok) {
        const card = await res.json();
        setCards((prev) => [...prev, card]);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (
    card: KanbanCard,
    data: { titulo: string; descricao: string; cor: string; prioridade: string; categoria: string }
  ) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projetos/${projetoId}/kanban/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deletar este card?")) return;
    await fetch(`/api/projetos/${projetoId}/kanban/${id}`, { method: "DELETE" });
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  const handleMove = async (cardId: string, newColuna: string) => {
    // Optimistic update
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, coluna: newColuna } : c))
    );
    await fetch(`/api/projetos/${projetoId}/kanban/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coluna: newColuna }),
    });
  };

  const totalCards = cards.length;
  const concluidoCards = cards.filter((c) => c.coluna === "concluido").length;
  const progress = totalCards > 0 ? Math.round((concluidoCards / totalCards) * 100) : 0;

  return (
    <AppLayout>
      {/* Page header */}
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
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-xl shrink-0">
              <Kanban className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {projeto ? projeto.nome : "Kanban"}
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
                  {projeto.setor} — {projeto.descricao ?? ""}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress */}
            {totalCards > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {progress}%
                </span>
              </div>
            )}
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
              onClick={fetchData}
              className="p-2 border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Stats row */}
        {!loading && (
          <div className="flex flex-wrap gap-4 mt-4">
            {[
              { label: "Total de cards", value: totalCards, color: "text-gray-700 dark:text-gray-300" },
              { label: "Ideias", value: cards.filter((c) => c.coluna === "ideias").length, color: "text-purple-600" },
              { label: "A Fazer", value: cards.filter((c) => c.coluna === "a_fazer").length, color: "text-blue-600" },
              { label: "Em Andamento", value: cards.filter((c) => c.coluna === "em_andamento").length, color: "text-yellow-600" },
              { label: "Testes", value: cards.filter((c) => c.coluna === "testes").length, color: "text-orange-600" },
              { label: "Concluído", value: concluidoCards, color: "text-green-600" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5 text-sm">
                <span className={cn("font-bold text-base", s.color)}>{s.value}</span>
                <span className="text-gray-400 dark:text-gray-500">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Board */}
      {loading ? (
        <SkeletonKanban />
      ) : (
        <KanbanBoard
          projetoId={projetoId}
          cards={cards}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onMove={handleMove}
          onUpdateCards={setCards}
          saving={saving}
        />
      )}
    </AppLayout>
  );
}
