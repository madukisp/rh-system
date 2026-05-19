// Edite este arquivo para alterar os nomes e icones dos setores em toda a aplicacao.
export const SETORES = [
  { value: "RH - Seleção", label: "RH - Seleção", icon: "🏥" },
  { value: "Cargos e Salários", label: "Cargos e Salários", icon: "⚕️" },
  { value: "DHO", label: "DHO", icon: "🏢" },
  { value: "Projetos", label: "Projetos", icon: "🎓" },
  { value: "Financeiro", label: "Financeiro", icon: "💰" },
  { value: "SBCData", label: "SBCData", icon: "💻" },
  { value: "Outros", label: "Outros", icon: "📁" },
] as const;

export const SETOR_VALUES = SETORES.map((setor) => setor.value);

export const SETOR_FILTER_OPTIONS = [
  { value: "todos", label: "Todos os Setores" },
  ...SETORES.map((setor) => ({
    value: setor.value,
    label: setor.label,
  })),
] as const;

export const SETOR_ICON_BY_VALUE = Object.fromEntries(
  SETORES.map((setor) => [setor.value, setor.icon])
) as Record<string, string>;
