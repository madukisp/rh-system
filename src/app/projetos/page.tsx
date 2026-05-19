"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  Power,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/app-layout";
import { StatusBadge } from "@/components/status-badge";
import { CreateProjectModal } from "@/components/create-project-modal";
import { EditProjectModal } from "@/components/edit-project-modal";
import type { Projeto } from "@/lib/types";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [10, 20, 50];

type SortField = "nome" | "setor" | "status" | "versao" | "data_atualizacao";

export default function ProjetosPage() {
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("data_atualizacao");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<Projeto | null>(null);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const fetchProjetos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        orderBy: sortField,
        order: sortDir,
      });
      const res = await fetch(`/api/projetos?${params}`);
      const data = await res.json();
      setProjetos(data);
    } finally {
      setLoading(false);
    }
  }, [search, sortField, sortDir]);

  useEffect(() => {
    const t = setTimeout(fetchProjetos, 300);
    return () => clearTimeout(t);
  }, [fetchProjetos]);

  // Pagination
  const total = projetos.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginated = projetos.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
    );
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });

  const toggleAll = () => {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map((p) => p.id)));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deletar este projeto?")) return;
    await fetch(`/api/projetos/${id}`, { method: "DELETE" });
    setProjetos((ps) => ps.filter((p) => p.id !== id));
    setSelected((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  };

  const handleToggleStatus = async (projeto: Projeto) => {
    const newStatus = projeto.status === "ativo" ? "inativo" : "ativo";
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

  const exportCSV = () => {
    const rows = [
      ["Nome", "Setor", "Status", "Versão", "Responsável", "Email", "Última Atualização"],
      ...projetos.map((p) => [
        p.nome,
        p.setor ?? "",
        p.status,
        p.versao ?? "",
        p.responsavel ?? "",
        p.email_contato ?? "",
        p.data_atualizacao,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projetos.csv";
    a.click();
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Deletar ${selected.size} projetos selecionados?`)) return;
    await Promise.all(
      [...selected].map((id) => fetch(`/api/projetos/${id}`, { method: "DELETE" }))
    );
    setProjetos((ps) => ps.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
  };

  return (
    <AppLayout>
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Meus Projetos
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {total} projeto{total !== 1 ? "s" : ""} no total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-blue-200 dark:shadow-blue-900"
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Pesquisar projetos..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
            >
              <Trash2 className="w-4 h-4" />
              Deletar {selected.size} selecionado{selected.size > 1 ? "s" : ""}
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      paginated.length > 0 && selected.size === paginated.length
                    }
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                {(
                  [
                    { field: "nome", label: "Projeto" },
                    { field: "setor", label: "Setor" },
                    { field: "status", label: "Status" },
                    { field: "versao", label: "Versão" },
                    { field: "data_atualizacao", label: "Atualizado" },
                  ] as { field: SortField; label: string }[]
                ).map(({ field, label }) => (
                  <th
                    key={field}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSort(field)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon field={field} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Responsável
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full max-w-[120px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-400 dark:text-gray-500"
                  >
                    Nenhum projeto encontrado
                  </td>
                </tr>
              ) : (
                paginated.map((projeto) => (
                  <tr
                    key={projeto.id}
                    className={cn(
                      "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                      selected.has(projeto.id) &&
                        "bg-blue-50 dark:bg-blue-900/10"
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(projeto.id)}
                        onChange={() => toggleSelect(projeto.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {projeto.nome}
                      </div>
                      {projeto.url_base && (
                        <a
                          href={projeto.url_base}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {projeto.url_base.replace(/^https?:\/\//, "").slice(0, 40)}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {projeto.setor ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={projeto.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                      {projeto.versao ? `v${projeto.versao}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(projeto.data_atualizacao), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {projeto.responsavel ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActionMenu(
                              actionMenu === projeto.id ? null : projeto.id
                            )
                          }
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {actionMenu === projeto.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenu(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden py-1">
                              <button
                                onClick={() => {
                                  setEditingProject(projeto);
                                  setActionMenu(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" /> Editar
                              </button>
                              <button
                                onClick={() => {
                                  handleToggleStatus(projeto);
                                  setActionMenu(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                              >
                                <Power className="w-4 h-4" />
                                {projeto.status === "ativo"
                                  ? "Desativar"
                                  : "Ativar"}
                              </button>
                              <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                              <button
                                onClick={() => {
                                  handleDelete(projeto.id);
                                  setActionMenu(null);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" /> Deletar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>Linhas por página:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm focus:outline-none"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span>
              {Math.min((page - 1) * pageSize + 1, total)}–
              {Math.min(page * pageSize, total)} de {total}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 || p === totalPages || Math.abs(p - page) <= 1
              )
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1)
                  acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                      page === p
                        ? "bg-blue-600 text-white"
                        : "border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    )}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => setProjetos((ps) => [p, ...ps])}
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
