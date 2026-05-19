import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FolderKanban,
  GitBranch,
  History,
  Sparkles,
} from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { getTimelineSnapshot } from "@/lib/db";
import { buildMonthlyActivity } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import { TimelineActivityPanel } from "@/components/timeline-activity-panel";

type TimelineEvent = {
  id: string;
  date: string;
  title: string;
  description: string;
  kind: "projeto" | "card" | "movimento" | "marco";
  projectName?: string | null;
};

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function columnLabel(coluna: string) {
  const labels: Record<string, string> = {
    ideias: "Ideias",
    a_fazer: "A Fazer",
    em_andamento: "Em Andamento",
    testes: "Testes",
    concluido: "Concluído",
  };

  return labels[coluna] ?? coluna.replace(/_/g, " ");
}

function eventStyle(kind: TimelineEvent["kind"]) {
  switch (kind) {
    case "projeto":
      return {
        dot: "bg-blue-500",
        ring: "ring-blue-500/20",
        icon: FolderKanban,
      };
    case "card":
      return {
        dot: "bg-cyan-500",
        ring: "ring-cyan-500/20",
        icon: BookOpen,
      };
    case "movimento":
      return {
        dot: "bg-violet-500",
        ring: "ring-violet-500/20",
        icon: GitBranch,
      };
    case "marco":
    default:
      return {
        dot: "bg-amber-500",
        ring: "ring-amber-500/20",
        icon: Sparkles,
      };
  }
}

export default function TimelinePage() {
  const { projetos, cards, historico } = getTimelineSnapshot();
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);

  const completedMoves = historico.filter((entry) => entry.coluna_nova === "concluido");
  const recentProjects = projetos.filter((projeto) => new Date(projeto.data_criacao) >= oneYearAgo);
  const recentCards = cards.filter((card) => new Date(card.data_criacao) >= oneYearAgo);
  const recentHistory = historico.filter((entry) => new Date(entry.data_mudanca) >= oneYearAgo);

  const events: TimelineEvent[] = [
    {
      id: "marco-1-ano",
      date: today.toISOString(),
      title: "1 ano de empresa",
      description: `Hoje você completa um ano de trajetória com ${projetos.length} projetos registrados no sistema.`,
      kind: "marco" as const,
    },
    ...recentProjects.map((projeto) => ({
      id: `projeto-${projeto.id}`,
      date: projeto.data_criacao,
      title: `Projeto criado: ${projeto.nome}`,
      description: `${projeto.setor ?? "Sem setor"}${projeto.responsavel ? ` • responsável: ${projeto.responsavel}` : ""}`,
      kind: "projeto" as const,
      projectName: projeto.nome,
    })),
    ...recentCards.map((card) => ({
      id: `card-${card.id}`,
      date: card.data_criacao,
      title: `Novo card em ${card.projeto_nome ?? "projeto sem nome"}`,
      description: `${card.titulo} • coluna inicial: ${columnLabel(card.coluna)}`,
      kind: "card" as const,
      projectName: card.projeto_nome,
    })),
    ...recentHistory.map((entry) => ({
      id: `movimento-${entry.id}`,
      date: entry.data_mudanca,
      title: `${entry.projeto_nome ?? "Projeto"} • ${entry.titulo}`,
      description:
        entry.coluna_anterior === null
          ? `Card criado na coluna ${columnLabel(entry.coluna_nova)}`
          : `Saiu de ${columnLabel(entry.coluna_anterior)} e foi para ${columnLabel(entry.coluna_nova)}`,
      kind: "movimento" as const,
      projectName: entry.projeto_nome,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const groupedEvents = events.reduce<Record<string, TimelineEvent[]>>((acc, event) => {
    const key = formatMonthLabel(new Date(event.date));
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(event);
    return acc;
  }, {});

  const monthlyKeys = Object.keys(groupedEvents);

  const mostActiveMonth =
    monthlyKeys
      .map((key) => ({ key, count: groupedEvents[key].length }))
      .sort((a, b) => b.count - a.count)[0] ?? null;

  const monthlyActivity = buildMonthlyActivity({
    recentProjects: recentProjects.map((projeto) => ({
      date: projeto.data_criacao,
      projectName: projeto.nome,
    })),
    recentCards: recentCards.map((card) => ({
      date: card.data_criacao,
      projectName: card.projeto_nome,
    })),
    recentHistory: recentHistory.map((entry) => ({
      date: entry.data_mudanca,
      projectName: entry.projeto_nome,
    })),
  });

  return (
    <AppLayout>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            1 ano de empresa • retrospectiva inicial
          </div>
          <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">
            Linha do Tempo dos Seus Projetos
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
            Uma visão do que você construiu neste primeiro ano: projetos criados, cards movimentados e marcos importantes
            ao longo da sua trajetória.
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Projetos no ano",
            value: recentProjects.length,
            icon: FolderKanban,
            color: "bg-blue-500",
          },
          {
            label: "Cards criados",
            value: recentCards.length,
            icon: BookOpen,
            color: "bg-cyan-500",
          },
          {
            label: "Movimentações",
            value: recentHistory.length,
            icon: History,
            color: "bg-violet-500",
          },
          {
            label: "Concluídos",
            value: completedMoves.length,
            icon: CheckCircle2,
            color: "bg-green-500",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center gap-4">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", item.color)}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resumo da Trajetória</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Primeiro projeto do ciclo</p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                {recentProjects[0]?.nome ?? projetos[0]?.nome ?? "Sem registros"}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Mês mais movimentado</p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                {mostActiveMonth ? `${mostActiveMonth.key} • ${mostActiveMonth.count} eventos` : "Sem dados"}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Projetos ativos hoje</p>
              <p className="mt-2 font-semibold text-gray-900 dark:text-white">
                {projetos.filter((projeto) => projeto.status === "ativo").length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leitura Rápida</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm text-gray-500 dark:text-gray-400">
            <p>Use esta página para enxergar o seu ano em ordem cronológica, e não só por status atual.</p>
            <p>Ela já junta criação de projetos, criação de cards e mudanças de coluna do kanban.</p>
            <p>Nas próximas versões, dá para adicionar filtros por setor, conquistas e destaques por projeto.</p>
          </div>
        </div>
      </div>

      <TimelineActivityPanel months={monthlyActivity} />

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-6 flex items-center gap-2">
          <History className="h-5 w-5 text-violet-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Timeline do Último Ano</h2>
        </div>

        {monthlyKeys.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400 dark:border-gray-700 dark:text-gray-500">
            Ainda não há eventos suficientes para montar a timeline.
          </div>
        ) : (
          <div className="space-y-10">
            {monthlyKeys.map((month) => (
              <div key={month}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                    {month}
                  </span>
                  <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                </div>

                <div className="relative pl-6">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-4">
                    {groupedEvents[month].map((event) => {
                      const style = eventStyle(event.kind);
                      const Icon = style.icon;
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "relative rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900",
                            "ring-1",
                            style.ring
                          )}
                        >
                          <div className={cn("absolute -left-7 top-5 flex h-6 w-6 items-center justify-center rounded-full border-4 border-white shadow-sm dark:border-gray-800", style.dot)}>
                            <Icon className="h-3.5 w-3.5 text-white" />
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{event.title}</p>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{event.description}</p>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                              {formatDateLabel(new Date(event.date))}
                              <ArrowRight className="h-3 w-3" />
                              {event.kind}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
}
