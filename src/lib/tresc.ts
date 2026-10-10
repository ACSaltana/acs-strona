// Dostęp do treści z CMS w postaci gotowej dla stron i komponentów.
import { getImage } from 'astro:assets';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { chwila, dzisiaj, formatDzien, formatZakres } from './daty';
import { zbudujDrabinke, type Drabinka, type DruzynaDrabinki } from './drabinka';
import { formatKwota } from './format';
import { obraz } from './obrazy';
import type { Grafika, NavItem, Social, TournamentStatus } from './typy';
import { wybierzAktualny } from './wybor';

export const NAZWA = 'Altana Championship Series';
export const SKROT = 'ACS';

/** Nawigacja główna. Nazwa to „Aktualności”, nie „Blog”. */
export const NAV: NavItem[] = [
  { label: 'Turnieje', href: '/turnieje' },
  { label: 'Aktualności', href: '/aktualnosci' },
  { label: 'O nas', href: '/o-nas' },
  { label: 'Kontakt', href: '/kontakt' },
];

/* ---------- ustawienia i teksty stron ---------- */

export interface Ustawienia {
  email: string;
  logo?: Grafika;
  opis: string;
  socials: Social[];
}

export async function pobierzUstawienia(): Promise<Ustawienia> {
  const dane = (await getEntry('ustawienia', 'ustawienia'))?.data;
  return {
    email: dane?.email ?? 'kontakt@[domena].pl',
    logo: obraz(dane?.logo),
    opis: dane?.opis ?? 'Altana Championship Series organizuje turnieje Counter-Strike 2. Jeden duży turniej co kilka miesięcy: drabinka, drużyny, pula nagród i aktualności.',
    socials: (dane?.social ?? []).map((s) => ({ label: s.platforma, href: s.adres ?? '', icon: obraz(s.ikona) })),
  };
}

export async function pobierzTeksty() {
  const dane = (await getEntry('teksty', 'teksty'))?.data;
  return {
    glowna: {
      etykieta: dane?.glowna.etykieta ?? 'Turnieje Counter-Strike 2',
      tytul: dane?.glowna.tytul ?? NAZWA,
      lead: dane?.glowna.lead,
      kontaktTematy: dane?.glowna.kontaktTematy,
    },
    turnieje: { lead: dane?.turnieje.lead },
    aktualnosci: { lead: dane?.aktualnosci.lead },
    kontakt: { lead: dane?.kontakt.lead, wskazowka: dane?.kontakt.wskazowka, tematy: dane?.kontakt.tematy ?? [] },
  };
}

export async function pobierzONas() {
  const dane = (await getEntry('oNas', 'o-nas'))?.data;
  return {
    tytul: dane?.tytul ?? NAZWA,
    lead: dane?.lead,
    grafika: obraz(dane?.grafika),
    opisGrafiki: dane?.opisGrafiki ?? '',
    bloki: dane?.bloki ?? [],
    liczby: dane?.liczby ?? [],
    historia: (dane?.historia ?? '').split(/\n\s*\n/).map((akapit) => akapit.trim()).filter(Boolean),
  };
}

/* ---------- turnieje ---------- */

export interface Druzyna extends DruzynaDrabinki {
  skrot?: string;
}

export interface Sponsor {
  nazwa: string;
  logo?: Grafika;
  glowny: boolean;
  www?: string;
}

export interface Turniej {
  slug: string;
  href: string;
  tytul: string;
  /** Tytuł bez „ACS” na początku: w banerze „ACS” stoi osobno, dużą czcionką */
  edycja: string;
  status: TournamentStatus;
  gra: string;
  format?: string;
  etykietaDrabinki?: string;
  limit: number;
  /** Czas polski "RRRR-MM-DDTGG:MM" */
  start: string;
  koniec?: string;
  /** „14–15.11.2026” */
  data: string;
  pula?: string;
  tryb: string;
  miniatura?: Grafika;
  /** Baner 21:9, a gdy go nie ma: miniatura */
  baner?: Grafika;
  opisGrafiki: string;
  lead?: string;
  druzyny: Druzyna[];
  /** Strona turnieju: „12 / 16” (zapisane / limit), po zakończeniu sama liczba drużyn */
  liczbaDruzyn: string;
  /** Baner: „12 / 16” tylko w trakcie zapisów, poza nimi sama liczba */
  liczbaDruzynBaner: string;
  /** Opis dla wyszukiwarek i udostępnień */
  opis: string;
  /** Wolne miejsca do pokazania jako puste kafelki (tylko przy otwartych zapisach) */
  wolneMiejsca: number;
  drabinka: Drabinka;
  zwyciezca?: Druzyna;
  sponsorzy: Sponsor[];
  regulaminPdf?: string;
  kicker: string;
  wpis: CollectionEntry<'turnieje'>;
}

// Przy budowaniu każdą kolekcję czytamy raz. W trybie dev bez pamięci podręcznej,
// bo treść zmienia się w trakcie pracy w panelu.
const pamiec = new Map<string, Promise<unknown>>();
function raz<T>(klucz: string, pobierz: () => Promise<T>): Promise<T> {
  if (import.meta.env.DEV) return pobierz();
  if (!pamiec.has(klucz)) pamiec.set(klucz, pobierz());
  return pamiec.get(klucz) as Promise<T>;
}

function pobierzDruzyny(): Promise<Map<string, Druzyna>> {
  return raz('druzyny', async () => {
    const wpisy = await getCollection('druzyny');
    return new Map(wpisy.map((w) => [w.id, { slug: w.id, nazwa: w.data.nazwa, skrot: w.data.skrot, logo: obraz(w.data.logo) }]));
  });
}

function pobierzSponsorow(): Promise<Map<string, Sponsor>> {
  return raz('sponsorzy', async () => {
    const wpisy = await getCollection('sponsorzy');
    return new Map(wpisy.map((w) => [w.id, { nazwa: w.data.nazwa, logo: obraz(w.data.logo), glowny: w.data.poziom === 'glowny', www: w.data.www }]));
  });
}

const istnieje = <T,>(v: T | undefined): v is T => v !== undefined;

async function naTurniej(wpis: CollectionEntry<'turnieje'>): Promise<Turniej> {
  const d = wpis.data;
  const [wszystkieDruzyny, wszyscySponsorzy] = await Promise.all([pobierzDruzyny(), pobierzSponsorow()]);
  const druzyny = d.druzyny.map((slug) => wszystkieDruzyny.get(slug)).filter(istnieje);
  const drabinka = zbudujDrabinke(d.limitDruzyn, d.mecze, wszystkieDruzyny);
  const miniatura = obraz(d.miniatura);
  const sponsorzy = d.sponsorzy.map((slug) => wszyscySponsorzy.get(slug)).filter(istnieje);
  const start = d.start!;
  const zapisy = d.status === 'open';
  const liczbaDruzyn =
    d.status === 'announced' && druzyny.length === 0
      ? String(d.limitDruzyn)
      : d.status === 'finished'
        ? String(druzyny.length || d.limitDruzyn)
        : `${druzyny.length} / ${d.limitDruzyn}`;

  const data = formatZakres(start, d.koniec);
  const pula = formatKwota(d.pulaNagrod);
  const fakty = [d.gra, data, d.format, pula && `pula nagród ${pula}`].filter(Boolean).join(', ');

  return {
    slug: wpis.id,
    href: `/turnieje/${wpis.id}`,
    tytul: d.tytul,
    edycja: d.tytul.replace(/^ACS\s+/i, ''),
    status: d.status,
    gra: d.gra,
    format: d.format,
    etykietaDrabinki: d.etykietaDrabinki,
    limit: d.limitDruzyn,
    start,
    koniec: d.koniec,
    data,
    pula,
    tryb: d.tryb === 'lan' ? 'LAN' : 'Online',
    miniatura,
    baner: obraz(d.baner) ?? miniatura,
    opisGrafiki: d.opisGrafiki ?? `Grafika turnieju ${d.tytul}`,
    lead: d.lead,
    druzyny,
    liczbaDruzyn,
    liczbaDruzynBaner: zapisy ? `${druzyny.length} / ${d.limitDruzyn}` : String(druzyny.length || d.limitDruzyn),
    opis: d.lead ? `${d.lead} ${fakty}.` : `${d.tytul}: turniej ${fakty}.`,
    wolneMiejsca: zapisy ? Math.max(0, d.limitDruzyn - druzyny.length) : 0,
    drabinka,
    zwyciezca: (d.zwyciezca && wszystkieDruzyny.get(d.zwyciezca)) || drabinka.mistrz,
    // sponsor główny zawsze pierwszy: zajmuje duże pole 2×2
    sponsorzy: [...sponsorzy.filter((s) => s.glowny), ...sponsorzy.filter((s) => !s.glowny)],
    regulaminPdf: d.regulaminPdf,
    kicker: d.status === 'live' ? 'Trwa teraz' : d.status === 'finished' ? 'Zakończony' : 'Najbliższy turniej',
    wpis,
  };
}

/** Wszystkie turnieje, od najnowszego. */
export function pobierzTurnieje(): Promise<Turniej[]> {
  return raz('turnieje', async () => {
    const lista = await Promise.all((await getCollection('turnieje')).map(naTurniej));
    return lista.sort((a, b) => b.start.localeCompare(a.start));
  });
}

/**
 * Aktualny turniej: najpierw trwający (live). Gdy żaden nie trwa, niezakończony z najbliższą datą startu.
 * To ten jeden turniej pokazują baner i strona główna.
 */
export async function aktualnyTurniej(): Promise<Turniej | undefined> {
  return wybierzAktualny(await pobierzTurnieje(), dzisiaj());
}

/** Archiwum: turnieje zakończone, od najnowszego. */
export async function archiwumTurniejow(): Promise<Turniej[]> {
  return (await pobierzTurnieje()).filter((t) => t.status === 'finished');
}

/** Do czego liczy zegar na stronie turnieju: do finału, gdy turniej trwa, inaczej do startu. */
export function celOdliczania(t: Turniej): { cel: Date; etykieta: string } | undefined {
  if (t.status === 'finished') return undefined;
  if (t.status === 'live') return t.drabinka.terminFinalu ? { cel: chwila(t.drabinka.terminFinalu), etykieta: 'Finał za' } : undefined;
  return { cel: chwila(t.start), etykieta: 'Start za' };
}

/* ---------- aktualności ---------- */

export const KATEGORIE = [
  { id: 'ogloszenie', nazwa: 'Ogłoszenie', mnoga: 'Ogłoszenia', slug: 'ogloszenia' },
  { id: 'relacja', nazwa: 'Relacja', mnoga: 'Relacje', slug: 'relacje' },
  { id: 'poradnik', nazwa: 'Poradnik', mnoga: 'Poradniki', slug: 'poradniki' },
] as const;

export type KategoriaId = (typeof KATEGORIE)[number]['id'];

export interface Wpis {
  slug: string;
  href: string;
  tytul: string;
  /** "RRRR-MM-DD" */
  data: string;
  /** „02.10.2026” */
  dataTekst: string;
  kategoria: (typeof KATEGORIE)[number];
  okladka?: Grafika;
  opisOkladki: string;
  zajawka?: string;
  wpis: CollectionEntry<'wpisy'>;
}

export const WPISOW_NA_STRONE = 6;

/** Wszystkie wpisy, od najnowszego. */
export function pobierzWpisy(): Promise<Wpis[]> {
  return raz('wpisy', async () =>
    (await getCollection('wpisy'))
      .map((w): Wpis => ({
        slug: w.id,
        href: `/aktualnosci/${w.id}`,
        tytul: w.data.tytul,
        data: w.data.data!,
        dataTekst: formatDzien(w.data.data!),
        kategoria: KATEGORIE.find((k) => k.id === w.data.kategoria) ?? KATEGORIE[0],
        okladka: obraz(w.data.okladka),
        opisOkladki: w.data.opisOkladki ?? '',
        zajawka: w.data.zajawka,
        wpis: w,
      }))
      .sort((a, b) => b.data.localeCompare(a.data) || a.tytul.localeCompare(b.tytul, 'pl')),
  );
}

/* ---------- udostępnianie ---------- */

/** Grafika do udostępniania (Open Graph): kadr 1200×630 JPG z banera albo okładki. SVG i adresy zewnętrzne pomijamy. */
export async function grafikaOg(grafika?: Grafika): Promise<string | undefined> {
  if (!grafika || typeof grafika === 'string' || grafika.format === 'svg') return undefined;
  const szerokosc = Math.min(1200, grafika.width);
  return (await getImage({ src: grafika, width: szerokosc, height: Math.round((szerokosc * 630) / 1200), fit: 'cover', format: 'jpg' })).src;
}
