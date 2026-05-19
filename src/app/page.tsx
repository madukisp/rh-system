"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  Search,
  RefreshCw,
  LayoutGrid,
  List,
} from "lucide-react";
import { AppLayout } from "@/components/layout/app-layout";
import { ProjectCard } from "@/components/project-card";
import { CreateProjectModal } from "@/components/create-project-modal";
import { EditProjectModal } from "@/components/edit-project-modal";
import { SETOR_FILTER_OPTIONS } from "@/lib/setores";
import type { Projeto } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "ativo", label: "Ativos" },
  { value: "construcao", label: "Em Construção" },
  { value: "inativo", label: "Inativos" },
];

const ORDER_OPTIONS = [
  { value: "data_atualizacao:desc", label: "Recente" },
  { value: "nome:asc", label: "A-Z" },
  { value: "status:asc", label: "Status" },
];

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: React.ElementType;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [setorFilter, setSetorFilter] = useState("todos");
  const [orderBy, setOrderBy] = useState("data_atualizacao:desc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<Projeto | null>(null);

  const fetchProjetos = useCallback(async () => {
    setLoading(true);
    try {
      const [field, dir] = orderBy.split(":");
      const params = new URLSearchParams({
        status: statusFilter,
        setor: setorFilter,
        search,
        orderBy: field,
        order: dir,
      });
      const res = await fetch(`/api/projetos?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar projetos");
      const data = await res.json();
      setProjetos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, setorFilter, search, orderBy]);

  useEffect(() => {
    const t = setTimeout(fetchProjetos, 300);
    return () => clearTimeout(t);
  }, [fetchProjetos]);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este projeto?")) return;
    await fetch(`/api/projetos/${id}`, { method: "DELETE" });
    setProjetos((ps) => ps.filter((p) => p.id !== id));
  };

  const handleToggleStatus = async (projeto: Projeto) => {
    const newStatus =
      projeto.status === "ativo" ? "inativo" : "ativo";
    const res = await fetch(`/api/projetos/${projeto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProjetos((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
    }
  };

  const stats = {
    total: projetos.length,
    ativos: projetos.filter((p) => p.status === "ativo").length,
    construcao: projetos.filter((p) => p.status === "construcao").length,
    inativos: projetos.filter((p) => p.status === "inativo").length,
  };

  const statusOrder: Record<string, number> = {
    ativo: 0,
    construcao: 1,
    inativo: 2,
  };

  const orderedProjetos = [...projetos].sort(
    (a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99)
  );

  return (
    <AppLayout>
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bem-vindo, Amanda!
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Você administra {stats.total} projeto{stats.total !== 1 ? "s" : ""} no sistema.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FolderKanban}
          value={stats.total}
          label="Total de Projetos"
          color="bg-blue-500"
        />
        <StatCard
          icon={CheckCircle2}
          value={stats.ativos}
          label="Projetos Ativos"
          color="bg-green-500"
        />
        <StatCard
          icon={AlertTriangle}
          value={stats.construcao}
          label="Em Construção"
          color="bg-yellow-500"
        />
        <StatCard
          icon={XCircle}
          value={stats.inativos}
          label="Inativos"
          color="bg-gray-400"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-6 flex flex-wrap gap-3 items-center shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome do projeto..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Setor filter */}
        <select
          value={setorFilter}
          onChange={(e) => setSetorFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {SETOR_FILTER_OPTIONS.map((setor) => (
            <option key={setor.value} value={setor.value}>
              {setor.label}
            </option>
          ))}
        </select>

        {/* Order */}
        <select
          value={orderBy}
          onChange={(e) => setOrderBy(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          {ORDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* View toggle */}
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
          <button
            onClick={() => setView("grid")}
            className={cn(
              "p-2 text-sm transition-colors",
              view === "grid"
                ? "bg-blue-600 text-white"
                : "bg-gray-50 dark:bg-gray-900 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={cn(
              "p-2 text-sm transition-colors",
              view === "list"
                ? "bg-blue-600 text-white"
                : "bg-gray-50 dark:bg-gray-900 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={fetchProjetos}
          className="p-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>

        {/* New project */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-blue-200 dark:shadow-blue-900"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : projetos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <FolderKanban className="w-10 h-10 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Nenhum projeto encontrado
          </h3>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-5">
            Tente ajustar os filtros ou crie um novo projeto.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Projeto
          </button>
        </div>
      ) : (
        <div
          className={cn(
            view === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "flex flex-col gap-3"
          )}
        >
          {orderedProjetos.map((projeto) => (
            <ProjectCard
              key={projeto.id}
              projeto={projeto}
              onEdit={setEditingProject}
              onDelete={handleDelete}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => {
            setProjetos((ps) => [p, ...ps]);
          }}
        />
      )}
      {editingProject && (
        <EditProjectModal
          projeto={editingProject}
          onClose={() => setEditingProject(null)}
          onSaved={(updated) => {
            setProjetos((ps) =>
              ps.map((p) => (p.id === updated.id ? updated : p))
            );
            setEditingProject(null);
          }}
        />
      )}
    </AppLayout>
  );
}
