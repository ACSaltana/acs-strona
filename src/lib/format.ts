const NBSP = ' ';

/** Kwota według brandbooka: "2000" → "2 000 PLN" (spacje niełamliwe). Tekst inny niż kwota zostaje bez zmian. */
export function formatKwota(wartosc?: string): string | undefined {
  const tekst = wartosc?.trim();
  if (!tekst) return undefined;
  const dopasowanie = tekst.match(/^(\d[\d\s ]*)(?:\s*(?:pln|zł))?$/i);
  if (!dopasowanie) return tekst;
  const cyfry = dopasowanie[1]!.replace(/\D/g, '');
  return `${cyfry.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}${NBSP}PLN`;
}

/** Link mailto z gotowym tematem, np. „Zgłoszenie – ACS Winter Cup #3”. */
export function mailto(email: string, temat?: string): string {
  return temat ? `mailto:${email}?subject=${encodeURIComponent(temat)}` : `mailto:${email}`;
}
