// Lista aktualności: filtry kategorii i paginacja jako zwykłe podstrony (działają bez JavaScriptu).
import { KATEGORIE, WPISOW_NA_STRONE, pobierzWpisy, type Wpis } from './tresc';

export type Kategoria = (typeof KATEGORIE)[number];

export interface StronaListy {
  wpisy: Wpis[];
  strona: number;
  stron: number;
  kategoria?: Kategoria;
}

/** Adres strony listy: /aktualnosci, /aktualnosci/strona/2, /aktualnosci/kategoria/relacje, …/strona/2 */
export function adresListy(kategoria?: Kategoria, strona = 1): string {
  const baza = kategoria ? `/aktualnosci/kategoria/${kategoria.slug}` : '/aktualnosci';
  return strona > 1 ? `${baza}/strona/${strona}` : baza;
}

/** Wszystkie strony listy dla danej kategorii (albo wszystkich wpisów). Pierwsza strona istnieje zawsze. */
export async function stronyListy(kategoria?: Kategoria): Promise<StronaListy[]> {
  const wszystkie = await pobierzWpisy();
  const wpisy = kategoria ? wszystkie.filter((w) => w.kategoria.id === kategoria.id) : wszystkie;
  const stron = Math.max(1, Math.ceil(wpisy.length / WPISOW_NA_STRONE));
  return Array.from({ length: stron }, (_, i) => ({
    wpisy: wpisy.slice(i * WPISOW_NA_STRONE, (i + 1) * WPISOW_NA_STRONE),
    strona: i + 1,
    stron,
    kategoria,
  }));
}

/** Jedna strona listy na podstawie parametrów adresu. Brak takiej strony daje undefined. */
export async function stronaListy(slugKategorii?: string, numer: string | number = 1): Promise<StronaListy | undefined> {
  const kategoria = slugKategorii ? KATEGORIE.find((k) => k.slug === slugKategorii) : undefined;
  if (slugKategorii && !kategoria) return undefined;
  return (await stronyListy(kategoria))[Number(numer) - 1];
}
