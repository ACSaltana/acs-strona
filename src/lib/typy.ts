import type { ImageMetadata } from 'astro';

/** Grafika z repozytorium (src/assets, optymalizowana) albo zwykły adres (public/, zewnętrzny). */
export type Grafika = ImageMetadata | string;

export type TournamentStatus = 'announced' | 'open' | 'closed' | 'live' | 'finished';

export const STATUS_LABEL: Record<TournamentStatus, string> = {
  announced: 'Zapowiedź',
  open: 'Zapisy otwarte',
  closed: 'Zapisy zamknięte',
  live: 'Live',
  finished: 'Zakończony',
};

export interface NavItem {
  label: string;
  href: string;
}

export interface BracketTeam {
  name?: string;
  logo?: Grafika;
  score?: number | string;
  winner?: boolean;
}

export interface BracketMatch {
  /** "14.11 · 18:00"; puste albo "ASAP" pokazuje "ASAP" */
  time?: string;
  live?: boolean;
  a?: BracketTeam;
  b?: BracketTeam;
}

export interface BracketRound {
  name: string;
  date?: string;
  matches: BracketMatch[];
}

export interface Social {
  label: string;
  href: string;
  /** Oficjalna biała ikona platformy; bez niej widać nazwę */
  icon?: Grafika;
}

/** Inicjały drużyny dla kafelka i drabinki, gdy nie ma logo. */
export function initials(name?: string): string {
  return String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();
}

export function grafikaSrc(g: Grafika): string {
  return typeof g === 'string' ? g : g.src;
}
