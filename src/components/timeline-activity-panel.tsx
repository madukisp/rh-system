"use client";

import { useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronDown,
  ChevronUp,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { cn } from "@/lib/utils";

type MonthlyProjectActivity = {
  name: string;
  total: number;
  cards: number;
  moves: number;
  projects: number;
};

type MonthlyActivity = {
  key: string;
  label: string;
  totalEvents: number;
  topProjects: MonthlyProjectActivity[];
};

type TimelineActivityPanelProps = {
  months: MonthlyActivity[];
};

const ZOOM_WIDTHS = [180, 260, 340] as const;

export function TimelineActivityPanel({ months }: TimelineActivityPanelProps) {
  const [zoomIndex, setZoomIndex] = useState(1);
  const [expanded, setExpanded] = useState(true);

  const itemWidth = ZOOM_WIDTHS[zoomIndex];

  const maxEvents = useMemo(
    () => Math.max(...months.map((month) => month.totalEvents), 1),
    [months]
  );

  if (months.length === 0) {
    return null;
  }

  return (
    <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-cyan-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Painel de Atividade por Mês
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Uma faixa cronológica para enxergar em quais projetos você mais mexeu ao longo dos meses,
            com leitura rápida e zoom para abrir mais espaço.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setZoomIndex((current) => Math.max(0, current - 1))}
            disabled={zoomIndex === 0}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            <ZoomOut className="h-4 w-4" />
            Diminuir
          </button>
          <button
            onClick={() => setZoomIndex((current) => Math.min(ZOOM_WIDTHS.length - 1, current + 1))}
            disabled={zoomIndex === ZOOM_WIDTHS.length - 1}
            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
          >
            <ZoomIn className="h-4 w-4" />
            Ampliar
          </button>
          <button
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-1 rounded-xl bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? "Modo compacto" : "Modo detalhado"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="relative mx-auto min-w-max px-6"
          style={{ width: `${months.length * itemWidth + 80}px` }}
        >
          <div className="absolute left-6 right-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500" />

          <div className="relative flex items-stretch justify-between gap-4">
            {months.map((month, index) => {
              const topProject = month.topProjects[0];
              const columnHeight = Math.max(72, (month.totalEvents / maxEvents) * 140);
              const placeAbove = index % 2 === 0;

              return (
                <div
                  key={month.key}
                  className="relative flex shrink-0 flex-col items-center"
                  style={{ width: `${itemWidth}px` }}
                >
                  <div className={cn("flex w-full", placeAbove ? "min-h-[220px] items-end pb-10" : "min-h-[220px] items-start pt-10")}>
                    <div
                      className={cn(
                        "w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900",
                        !expanded && "p-3"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
                          {month.label}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-400">
                          {month.totalEvents} eventos
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="mb-3 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                            style={{ width: `${(month.totalEvents / maxEvents) * 100}%` }}
                          />
                        </div>

                        {topProject ? (
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-gray-400">Projeto mais mexido</p>
                              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                {topProject.name}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <div className="rounded-xl bg-white px-3 py-2 dark:bg-gray-800">
                                <span className="block text-[10px] uppercase tracking-wide text-gray-400">Total</span>
                                <strong className="text-sm text-gray-900 dark:text-white">{topProject.total}</strong>
                              </div>
                              <div className="rounded-xl bg-white px-3 py-2 dark:bg-gray-800">
                                <span className="block text-[10px] uppercase tracking-wide text-gray-400">Cards</span>
                                <strong className="text-sm text-gray-900 dark:text-white">{topProject.cards}</strong>
                              </div>
                              {expanded && (
                                <>
                                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-gray-800">
                                    <span className="block text-[10px] uppercase tracking-wide text-gray-400">Movs.</span>
                                    <strong className="text-sm text-gray-900 dark:text-white">{topProject.moves}</strong>
                                  </div>
                                  <div className="rounded-xl bg-white px-3 py-2 dark:bg-gray-800">
                                    <span className="block text-[10px] uppercase tracking-wide text-gray-400">Projetos</span>
                                    <strong className="text-sm text-gray-900 dark:text-white">{month.topProjects.length}</strong>
                                  </div>
                                </>
                              )}
                            </div>

                            {expanded && month.topProjects.length > 1 && (
                              <div className="rounded-xl border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                <p className="mb-2 font-medium text-gray-700 dark:text-gray-300">
                                  Outros projetos do mês
                                </p>
                                <div className="space-y-1.5">
                                  {month.topProjects.slice(1, 3).map((project) => (
                                    <div key={project.name} className="flex items-center justify-between gap-2">
                                      <span className="truncate">{project.name}</span>
                                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] shadow-sm dark:bg-gray-800">
                                        {project.total}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
                            Sem atividade neste mês.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex h-10 items-center justify-center">
                    <div className="h-4 w-4 rounded-full border-4 border-white bg-cyan-500 shadow-md dark:border-gray-800" />
                  </div>

                  <div className={cn("flex w-full items-start justify-center", placeAbove ? "pt-8" : "pb-8")}>
                    <div className="flex w-full flex-col items-center">
                      <div
                        className="w-1 rounded-full bg-cyan-200 dark:bg-cyan-900/50"
                        style={{ height: `${columnHeight}px` }}
                      />
                      <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-medium text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
                        <Search className="h-3 w-3" />
                        {month.totalEvents} interações
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
