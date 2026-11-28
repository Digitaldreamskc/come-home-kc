// Sector labels supplied in the CapitalAtlas.ai reference screenshots.
export const sectors=['Artificial Intelligence','Business Services','Consumer Discretionary','Developer Tools','Diversified','Energy & Utilities','Financial & Insurance Services','FinTech','Healthcare','Industrials','Information Technology','Infrastructure','Machine Learning','Raw Materials & Natural Resources','Real Estate','SaaS','Telecoms & Media'] as const;
export function documentedSectors(value: string | readonly string[]): string[] {
  const labels = (typeof value === 'string' ? [value] : value).flatMap(label => label.split(/[,;|]/));
  return [...new Set(labels.map(label => {
    const text = label.trim().toLowerCase();
    if (text === 'technology') return 'Information Technology';
    if (text === 'life sciences') return 'Healthcare';
    if (text === 'manufacturing' || text === 'advanced manufacturing') return 'Industrials';
    return sectors.find(sector => sector.toLowerCase() === text);
  }).filter((label): label is NonNullable<typeof label> => label !== undefined))];
}

export function matchesSectors(
  documented: string | readonly string[],
  selected: readonly string[],
  generalSupport = false,
): boolean {
  return !selected.length || generalSupport || documentedSectors(documented).some(sector => selected.includes(sector));
}

export function jobSectors(industry: string | null | undefined, employer?: {
  sectors?: readonly string[]; industry?: string | null;
}): string[] {
  const explicit = documentedSectors(industry ?? '');
  return explicit.length ? explicit : documentedSectors([...(employer?.sectors ?? []), employer?.industry ?? '']);
}
