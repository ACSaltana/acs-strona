// Buduje drabinkę (pojedyncza eliminacja, do 16 drużyn) z rekordów Meczu: runda + pozycja.
// Szkielet wynika z limitu drużyn, a rekordy go wypełniają. Brak godziny = „ASAP”, brak drużyny = „TBD”.
import { formatDzienMiesiac, formatTerminMeczu } from './daty';
import type { BracketMatch, BracketRound, BracketTeam, Grafika } from './typy';

export type RundaId = '1-8' | 'cwiercfinal' | 'polfinal' | 'final';

export interface Mecz {
  runda: RundaId;
  pozycja: number;
  termin?: string;
  druzynaA?: string;
  druzynaB?: string;
  wynikA?: number;
  wynikB?: number;
  zwyciezca: 'brak' | 'a' | 'b';
  naZywo: boolean;
}

export interface DruzynaDrabinki {
  slug: string;
  nazwa: string;
  logo?: Grafika;
}

export interface Runda {
  id: RundaId;
  /** Liczba meczów w rundzie */
  mecze: number;
  /** Nazwa kolumny drabinki, np. „Ćwierćfinały” */
  nazwa: string;
  /** Nazwa pojedynczego meczu, np. „Ćwierćfinał” */
  nazwaMeczu: string;
}

const RUNDY: Runda[] = [
  { id: '1-8', mecze: 8, nazwa: '1/8 finału', nazwaMeczu: '1/8 finału' },
  { id: 'cwiercfinal', mecze: 4, nazwa: 'Ćwierćfinały', nazwaMeczu: 'Ćwierćfinał' },
  { id: 'polfinal', mecze: 2, nazwa: 'Półfinały', nazwaMeczu: 'Półfinał' },
  { id: 'final', mecze: 1, nazwa: 'Finał', nazwaMeczu: 'Finał' },
];

/** Liczba meczów pierwszej rundy dla danej liczby drużyn: 16 → 8, 9–15 → 8 (wolne losy), 8 → 4, 4 → 2, 2 → 1. */
function meczePierwszejRundy(limit: number): number {
  let mecze = 1;
  while (mecze * 2 < limit && mecze < 8) mecze *= 2;
  return mecze;
}

/** Rundy drabinki dla danej liczby drużyn, od pierwszej do finału. */
export function rundyDrabinki(limit: number): Runda[] {
  const pierwsza = meczePierwszejRundy(limit);
  return RUNDY.filter((r) => r.mecze <= pierwsza);
}

/* ---------- zapis i odczyt drabinki w treści ---------- */

export type RozmiarDrabinki = 2 | 4 | 8 | 16;
const ROZMIARY: RozmiarDrabinki[] = [2, 4, 8, 16];

export interface ZapisanaDrabinka {
  /** Liczba drużyn w drabince. Brak (starsze wpisy) = strona liczy ją z limitu drużyn. */
  rozmiar?: RozmiarDrabinki;
  lista: Mecz[];
}

const tekst = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const liczba = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

function naMecz(surowy: unknown): Mecz | undefined {
  if (!surowy || typeof surowy !== 'object') return undefined;
  const s = surowy as Record<string, unknown>;
  const runda = RUNDY.find((r) => r.id === s.runda)?.id;
  const pozycja = Number(s.pozycja);
  if (!runda || !Number.isInteger(pozycja) || pozycja < 1) return undefined;
  // Keystatic zapisuje datę z godziną jako znacznik czasu YAML, w którym zegar UTC = czas polski
  const termin = s.termin instanceof Date ? s.termin.toISOString().slice(0, 16) : tekst(s.termin)?.slice(0, 16);
  return {
    runda,
    pozycja,
    termin,
    druzynaA: tekst(s.druzynaA),
    druzynaB: tekst(s.druzynaB),
    wynikA: liczba(s.wynikA),
    wynikB: liczba(s.wynikB),
    zwyciezca: s.zwyciezca === 'a' || s.zwyciezca === 'b' ? s.zwyciezca : 'brak',
    naZywo: s.naZywo === true,
  };
}

/**
 * Drabinka z pliku treści. Przyjmuje obecny zapis ({ rozmiar, lista }) i starszy (sama lista meczów).
 * Błędne rekordy pomija, żeby zły wpis nie zatrzymał budowania strony.
 */
export function odczytajDrabinke(wartosc: unknown): ZapisanaDrabinka {
  const obiekt = wartosc && typeof wartosc === 'object' && !Array.isArray(wartosc) ? (wartosc as Record<string, unknown>) : undefined;
  const surowa = Array.isArray(wartosc) ? wartosc : Array.isArray(obiekt?.lista) ? obiekt.lista : [];
  const lista: Mecz[] = [];
  for (const mecz of surowa.map(naMecz)) {
    if (mecz && !lista.some((m) => m.runda === mecz.runda && m.pozycja === mecz.pozycja)) lista.push(mecz);
  }
  return { rozmiar: ROZMIARY.find((r) => r === Number(obiekt?.rozmiar)), lista };
}

/** Rozmiar drabinki, gdy nie jest zapisany: najmniejszy, w którym mieszczą się wpisane mecze, a bez meczów 16. */
export function rozmiarZListy(lista: Mecz[]): RozmiarDrabinki {
  if (lista.some((m) => m.runda === '1-8')) return 16;
  if (lista.some((m) => m.runda === 'cwiercfinal')) return 8;
  if (lista.some((m) => m.runda === 'polfinal')) return 4;
  return 16;
}

const maTresc = (m: Mecz) => Boolean(m.termin || m.druzynaA || m.druzynaB || m.wynikA !== undefined || m.wynikB !== undefined || m.zwyciezca !== 'brak' || m.naZywo);

/**
 * Drabinka w postaci do zapisu w pliku: tylko mecze mieszczące się w drabince i zawierające jakąś informację,
 * w kolejności rund i pozycji, bez pustych pól.
 */
export function zapiszDrabinke(drabinka: { rozmiar: RozmiarDrabinki; lista: Mecz[] }) {
  const rundy = rundyDrabinki(drabinka.rozmiar);
  const kolejnosc = (m: Mecz) => rundy.findIndex((r) => r.id === m.runda) * 100 + m.pozycja;
  const lista = drabinka.lista
    .filter((m) => rundy.some((r) => r.id === m.runda && m.pozycja <= r.mecze) && maTresc(m))
    .sort((a, b) => kolejnosc(a) - kolejnosc(b))
    .map((m) => ({
      runda: m.runda,
      pozycja: m.pozycja,
      ...(m.termin ? { termin: m.termin } : {}),
      ...(m.druzynaA ? { druzynaA: m.druzynaA } : {}),
      ...(m.druzynaB ? { druzynaB: m.druzynaB } : {}),
      ...(m.wynikA !== undefined ? { wynikA: m.wynikA } : {}),
      ...(m.wynikB !== undefined ? { wynikB: m.wynikB } : {}),
      zwyciezca: m.zwyciezca,
      naZywo: m.naZywo,
    }));
  return { rozmiar: drabinka.rozmiar, lista };
}

export interface Drabinka {
  rounds: BracketRound[];
  /** Zwycięzca finału, jeśli finał jest rozstrzygnięty */
  mistrz?: DruzynaDrabinki;
  /** Termin finału (czas polski), jeśli jest ustawiony */
  terminFinalu?: string;
}

export function zbudujDrabinke(limit: number, mecze: Mecz[], druzyny: Map<string, DruzynaDrabinki>): Drabinka {
  const rundy = rundyDrabinki(limit);
  const rounds: BracketRound[] = [];
  let mistrz: DruzynaDrabinki | undefined;
  let terminFinalu: string | undefined;
  // zwycięzcy poprzedniej rundy, indeks = pozycja meczu - 1
  let awans: (DruzynaDrabinki | undefined)[] = [];

  for (const runda of rundy) {
    const zwyciezcy: (DruzynaDrabinki | undefined)[] = [];
    const terminy: string[] = [];
    const matches: BracketMatch[] = [];

    for (let pozycja = 1; pozycja <= runda.mecze; pozycja++) {
      const rekord = mecze.find((m) => m.runda === runda.id && m.pozycja === pozycja);
      // drużyna wpisana ręcznie ma pierwszeństwo, inaczej wchodzi zwycięzca z poprzedniej rundy
      const a = (rekord?.druzynaA && druzyny.get(rekord.druzynaA)) || awans[(pozycja - 1) * 2];
      const b = (rekord?.druzynaB && druzyny.get(rekord.druzynaB)) || awans[(pozycja - 1) * 2 + 1];
      const wygrany = rekord?.zwyciezca === 'a' ? a : rekord?.zwyciezca === 'b' ? b : undefined;
      zwyciezcy.push(wygrany);
      if (rekord?.termin) terminy.push(rekord.termin);
      if (runda.id === 'final') {
        mistrz = wygrany;
        terminFinalu = rekord?.termin;
      }

      const strona = (druzyna: DruzynaDrabinki | undefined, wynik: number | undefined): BracketTeam => ({
        name: druzyna?.nazwa,
        logo: druzyna?.logo,
        score: wynik,
        winner: Boolean(druzyna && wygrany && druzyna.slug === wygrany.slug),
      });
      matches.push({
        time: rekord?.termin ? formatTerminMeczu(rekord.termin) : undefined,
        // rozstrzygnięty mecz nie może już być „na żywo”, nawet gdy ktoś zapomni odznaczyć pole
        live: Boolean(rekord?.naZywo) && !wygrany,
        a: strona(a, rekord?.wynikA),
        b: strona(b, rekord?.wynikB),
      });
    }

    const dni = [...new Set(terminy.sort().map(formatDzienMiesiac))];
    rounds.push({
      name: runda.nazwa,
      date: dni.length === 0 ? undefined : dni.length === 1 ? dni[0] : `${dni[0]}–${dni.at(-1)}`,
      matches,
    });
    awans = zwyciezcy;
  }

  return { rounds, mistrz, terminFinalu };
}
