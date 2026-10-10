// Daty i godziny ACS. W treści są zapisane jako czas polski bez strefy ("2026-11-14T16:00"),
// a build na serwerze działa w UTC, dlatego nic tutaj nie polega na strefie serwera.

const STREFA = 'Europe/Warsaw';

const czesci = (s: string) => {
  const [data = '', godzina = ''] = s.split('T');
  const [rok = '', miesiac = '', dzien = ''] = data.split('-');
  return { rok, miesiac, dzien, godzina: godzina.slice(0, 5) };
};

/** "2026-11-14" → "14.11.2026" */
export function formatDzien(s: string): string {
  const { rok, miesiac, dzien } = czesci(s);
  return `${dzien}.${miesiac}.${rok}`;
}

/** "2026-11-14T16:00" → "14.11" */
export function formatDzienMiesiac(s: string): string {
  const { miesiac, dzien } = czesci(s);
  return `${dzien}.${miesiac}`;
}

/** "2026-11-14T16:00" → "14.11 · 16:00" (godzina meczu w drabince) */
export function formatTerminMeczu(s: string): string {
  const { godzina } = czesci(s);
  return godzina ? `${formatDzienMiesiac(s)} · ${godzina}` : formatDzienMiesiac(s);
}

/** "2026-11-14T16:00" → "14.11.2026 · 16:00" */
export function formatDzienGodzina(s: string): string {
  const { godzina } = czesci(s);
  return godzina ? `${formatDzien(s)} · ${godzina}` : formatDzien(s);
}

/** Zakres dat: "14.11.2026", "14–15.11.2026", "30.11–01.12.2026" albo "30.12.2026–02.01.2027". */
export function formatZakres(start: string, koniec?: string): string {
  const a = czesci(start);
  if (!koniec) return formatDzien(start);
  const b = czesci(koniec);
  if (a.rok !== b.rok) return `${formatDzien(start)}–${formatDzien(koniec)}`;
  if (a.miesiac !== b.miesiac) return `${a.dzien}.${a.miesiac}–${b.dzien}.${b.miesiac}.${b.rok}`;
  if (a.dzien !== b.dzien) return `${a.dzien}–${b.dzien}.${b.miesiac}.${b.rok}`;
  return formatDzien(start);
}

/** Czas polski "2026-11-14T16:00" → dokładna chwila (uwzględnia czas letni i zimowy). */
export function chwila(lokalnie: string): Date {
  const { rok, miesiac, dzien, godzina } = czesci(lokalnie);
  const jakUtc = Date.parse(`${rok}-${miesiac}-${dzien}T${godzina || '00:00'}:00Z`);
  const zegar = new Intl.DateTimeFormat('en-CA', {
    timeZone: STREFA,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(jakUtc));
  const pole = (typ: string) => Number(zegar.find((p) => p.type === typ)?.value);
  const przesuniecie = Date.UTC(pole('year'), pole('month') - 1, pole('day'), pole('hour'), pole('minute')) - jakUtc;
  return new Date(jakUtc - przesuniecie);
}

/** Dzisiejsza data w Polsce jako "RRRR-MM-DD". */
export function dzisiaj(teraz = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: STREFA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(teraz);
}

/** Odliczanie do chwili: dwucyfrowe dni, godziny i minuty albo undefined, gdy czas minął. */
export function odliczanie(cel: Date, teraz = new Date()): { d: string; h: string; m: string } | undefined {
  const zostalo = cel.getTime() - teraz.getTime();
  if (!(zostalo > 0)) return undefined;
  const minuty = Math.floor(zostalo / 60000);
  const dwie = (n: number) => String(n).padStart(2, '0');
  return { d: dwie(Math.floor(minuty / 1440)), h: dwie(Math.floor((minuty % 1440) / 60)), m: dwie(minuty % 60) };
}
