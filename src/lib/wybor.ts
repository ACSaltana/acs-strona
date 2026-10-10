// Który turniej jest „aktualny”: ten jeden pokazują baner i strona główna.
import type { TournamentStatus } from './typy';

interface Kandydat {
  status: TournamentStatus;
  /** Czas polski "RRRR-MM-DDTGG:MM" */
  start: string;
  /** "RRRR-MM-DD" */
  koniec?: string;
}

/**
 * Najpierw turniej trwający (live). Gdy żaden nie trwa: niezakończony z najbliższą datą startu,
 * licząc od dziś (turniej wielodniowy liczy się do swojego ostatniego dnia). Gdy wszystkie
 * niezakończone mają daty w przeszłości, wygrywa najpóźniejszy z nich. Zakończone nie są brane pod uwagę.
 */
export function wybierzAktualny<T extends Kandydat>(turnieje: T[], dzis: string): T | undefined {
  const rosnaco = [...turnieje].sort((a, b) => a.start.localeCompare(b.start));
  const live = rosnaco.find((t) => t.status === 'live');
  if (live) return live;
  const kandydaci = rosnaco.filter((t) => t.status !== 'finished');
  return kandydaci.find((t) => (t.koniec ?? t.start.slice(0, 10)) >= dzis) ?? kandydaci.at(-1);
}
