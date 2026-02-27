type OptimizeResult = { description: string } | null;

const compact = (value: string): string => value.replace(/\s+/g, " ").trim();

const toCategoryLabel = (category: string): string =>
  compact(category.replace(/[_-]+/g, " ")) || "wellness";

const truncate = (value: string, max = 120): string => {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
};

export const optimizeContent = async (
  title: string,
  category: string,
  benefits: string[] = []
): Promise<OptimizeResult> => {
  const cleanTitle = compact(title);
  if (!cleanTitle) return null;

  const cleanBenefits = benefits.map(compact).filter(Boolean).slice(0, 2);
  const base = `${cleanTitle} for ${toCategoryLabel(category)}`;
  const suffix =
    cleanBenefits.length > 0
      ? ` to support ${cleanBenefits.join(" and ")}.`
      : " for calm and focus.";

  return { description: truncate(base + suffix) };
};

export const generateEngagementSummary = async (stats: any): Promise<string> => {
  if (!Array.isArray(stats) || stats.length === 0) {
    return "Dashboard metrics are up to date. Keep publishing consistently this week.";
  }

  const first = stats[0];
  const label = typeof first?.label === "string" ? first.label : "Top metric";
  const value =
    typeof first?.value === "string" || typeof first?.value === "number"
      ? String(first.value)
      : "N/A";

  return `${label} is ${value}. Keep consistency in fresh uploads to sustain engagement growth.`;
};
