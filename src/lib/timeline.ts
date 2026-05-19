type BaseTimelineActivity = {
  date: string;
  projectName?: string | null;
};

type MonthlyProjectActivity = {
  name: string;
  total: number;
  cards: number;
  moves: number;
  projects: number;
};

export type MonthlyActivity = {
  key: string;
  label: string;
  totalEvents: number;
  topProjects: MonthlyProjectActivity[];
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  });
}

export function buildMonthlyActivity(params: {
  recentProjects: BaseTimelineActivity[];
  recentCards: BaseTimelineActivity[];
  recentHistory: BaseTimelineActivity[];
}) {
  const months = new Map<
    string,
    {
      label: string;
      totalEvents: number;
      projects: Map<
        string,
        {
          name: string;
          total: number;
          cards: number;
          moves: number;
          projects: number;
        }
      >;
    }
  >();

  const register = (
    source: BaseTimelineActivity[],
    type: "project" | "card" | "move"
  ) => {
    for (const item of source) {
      const date = new Date(item.date);
      const key = monthKey(date);
      const label = monthLabel(date);
      const projectName = item.projectName?.trim() || "Sem projeto";

      if (!months.has(key)) {
        months.set(key, {
          label,
          totalEvents: 0,
          projects: new Map(),
        });
      }

      const month = months.get(key)!;
      month.totalEvents += 1;

      if (!month.projects.has(projectName)) {
        month.projects.set(projectName, {
          name: projectName,
          total: 0,
          cards: 0,
          moves: 0,
          projects: 0,
        });
      }

      const project = month.projects.get(projectName)!;
      project.total += 1;

      if (type === "project") {
        project.projects += 1;
      } else if (type === "card") {
        project.cards += 1;
      } else {
        project.moves += 1;
      }
    }
  };

  register(params.recentProjects, "project");
  register(params.recentCards, "card");
  register(params.recentHistory, "move");

  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      label: value.label,
      totalEvents: value.totalEvents,
      topProjects: [...value.projects.values()]
        .sort((a, b) => b.total - a.total || b.moves - a.moves || b.cards - a.cards)
        .slice(0, 5),
    })) satisfies MonthlyActivity[];
}
