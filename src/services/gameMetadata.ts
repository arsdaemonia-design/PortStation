export interface GameMetadataLookup {
  pageTitle: string;
  pageUrl: string;
  synopsis?: string;
  releaseYear?: number;
  developer?: string;
  platforms?: string[];
}

type WikidataClaims = Record<string, Array<{
  rank?: string;
  mainsnak?: { datavalue?: { value?: { id?: string; time?: string } | string | number } };
}>>;

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Metadata request failed (${response.status})`);
  return response.json();
}

function claimIds(claims: WikidataClaims | undefined, property: string): string[] {
  const statements = claims?.[property] || [];
  const preferred = statements.filter((statement) => statement.rank === 'preferred');
  const selected = preferred.length ? preferred : statements;
  return [...new Set(selected
    .map((statement) => {
      const value = statement.mainsnak?.datavalue?.value;
      return value && typeof value === 'object' ? value.id : undefined;
    })
    .filter((id): id is string => Boolean(id)))];
}

/** Look up the article first, then enrich only from structured Wikidata claims. */
export async function lookupGameMetadata(query: string): Promise<GameMetadataLookup | null> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return null;

  let language = 'en';
  let pageTitle: string | undefined;
  for (const [lang, suffix] of [['es', 'videojuego'], ['en', 'video game']]) {
    const params = new URLSearchParams({
      action: 'query', list: 'search', srsearch: `${cleanQuery} ${suffix}`,
      srlimit: '5', format: 'json', origin: '*',
    });
    const result = await fetchJson(`https://${lang}.wikipedia.org/w/api.php?${params}`);
    pageTitle = result?.query?.search?.[0]?.title;
    if (pageTitle) {
      language = lang;
      break;
    }
  }
  if (!pageTitle) return null;

  const article = encodeURIComponent(pageTitle.replace(/ /g, '_'));
  const summary = await fetchJson(`https://${language}.wikipedia.org/api/rest_v1/page/summary/${article}`)
    .catch(() => null);
  const wikiParams = new URLSearchParams({
    action: 'query', titles: pageTitle, prop: 'pageprops', ppprop: 'wikibase_item',
    format: 'json', origin: '*',
  });
  const wikiPage = await fetchJson(`https://${language}.wikipedia.org/w/api.php?${wikiParams}`)
    .catch(() => null);
  const page = Object.values(wikiPage?.query?.pages || {})[0] as any;
  const entityId = page?.pageprops?.wikibase_item as string | undefined;

  let developer: string | undefined;
  let platforms: string[] | undefined;
  let releaseYear: number | undefined;
  if (entityId) {
    const entityParams = new URLSearchParams({ action: 'wbgetentities', ids: entityId, props: 'claims', format: 'json', origin: '*' });
    const entityResponse = await fetchJson(`https://www.wikidata.org/w/api.php?${entityParams}`).catch(() => null);
    const claims = entityResponse?.entities?.[entityId]?.claims as WikidataClaims | undefined;
    const developerIds = claimIds(claims, 'P178');
    const platformIds = claimIds(claims, 'P400');
    const dateClaims = claims?.P577 || [];
    const dateClaim = dateClaims.find((statement) => statement.rank === 'preferred') || dateClaims[0];
    const dateValue = dateClaim?.mainsnak?.datavalue?.value;
    const dateTime = dateValue && typeof dateValue === 'object' ? dateValue.time : undefined;
    const yearMatch = typeof dateTime === 'string' ? dateTime.match(/\+(\d{4})-/) : null;
    if (yearMatch) releaseYear = Number(yearMatch[1]);

    const labelIds = [...new Set([...developerIds, ...platformIds])];
    if (labelIds.length) {
      const labelsParams = new URLSearchParams({
        action: 'wbgetentities', ids: labelIds.join('|'), props: 'labels',
        languages: 'es|en', languagefallback: '1', format: 'json', origin: '*',
      });
      const labelsResponse = await fetchJson(`https://www.wikidata.org/w/api.php?${labelsParams}`).catch(() => null);
      const labelFor = (id: string) => labelsResponse?.entities?.[id]?.labels?.es?.value
        || labelsResponse?.entities?.[id]?.labels?.en?.value;
      developer = developerIds.map(labelFor).filter(Boolean).join(' / ') || undefined;
      platforms = platformIds.map(labelFor).filter(Boolean);
      if (!platforms.length) platforms = undefined;
    }
  }

  const description = typeof summary?.extract === 'string' ? summary.extract : undefined;
  const yearFromText = (summary?.description || description || '').match(/\b(19\d{2}|20\d{2})\b/);
  if (!developer && summary?.description) {
    const developerMatch = summary.description.match(/(?:developed by|desarrollado por)\s+(.+?)(?:,|\s+and\s+|\s+y\s+|$)/i);
    if (developerMatch?.[1]) developer = developerMatch[1].trim();
  }
  return {
    pageTitle,
    pageUrl: `https://${language}.wikipedia.org/wiki/${article}`,
    synopsis: description,
    releaseYear: releaseYear || (yearFromText ? Number(yearFromText[1]) : undefined),
    developer,
    platforms,
  };
}
