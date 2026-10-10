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

const RUNDY: { id: RundaId; mecze: number; nazwa: string }[] = [
  { id: '1-8', mecze: 8, nazwa: '1/8 finału' },
  { id: 'cwiercfinal', mecze: 4, nazwa: 'Ćwierćfinały' },
  { id: 'polfinal', mecze: 2, nazwa: 'Półfinały' },
  { id: 'final', mecze: 1, nazwa: 'Finał' },
];

/** Liczba meczów pierwszej rundy dla danego limitu drużyn: 16 → 8, 9–15 → 8 (wolne losy), 8 → 4, 4 → 2, 2 → 1. */
function meczePierwszejRundy(limit: number): number {
  let mecze = 1;
  while (mecze * 2 < limit && mecze < 8) mecze *= 2;
  return mecze;
}

export interface Drabinka {
  rounds: BracketRound[];
  /** Zwycięzca finału, jeśli finał jest rozstrzygnięty */
  mistrz?: DruzynaDrabinki;
  /** Termin finału (czas polski), jeśli jest ustawiony */
  terminFinalu?: string;
}

export function zbudujDrabinke(limit: number, mecze: Mecz[], druzyny: Map<string, DruzynaDrabinki>): Drabinka {
  const pierwsza = meczePierwszejRundy(limit);
  const rundy = RUNDY.filter((r) => r.mecze <= pierwsza);
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
