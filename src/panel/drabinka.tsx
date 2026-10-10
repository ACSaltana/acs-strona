// Pole panelu Keystatic: edytor drabinki, który pokazuje ją tak jak strona turnieju.
// Kliknięcie meczu otwiera jego edycję pod drabinką. Zapisuje strukturę { rozmiar, lista },
// którą strona czyta przez odczytajDrabinke (src/lib/drabinka.ts).
import { useMemo, useState } from 'react';
import { fields, type BasicFormField, type FormFieldInputProps } from '@keystatic/core';
import { ActionButton } from '@keystar/ui/button';
import { Heading, Text } from '@keystar/ui/typography';
import {
  odczytajDrabinke,
  rozmiarZListy,
  rundyDrabinki,
  zapiszDrabinke,
  zbudujDrabinke,
  type DruzynaDrabinki,
  type Mecz,
  type RozmiarDrabinki,
  type RundaId,
} from '../lib/drabinka';
import { initials, type BracketTeam } from '../lib/typy';
import tokeny from '../styles/tokens.css?raw';
import komponenty from '../styles/bundle.css?raw';
import '../styles/fonts.css';

export interface WartoscDrabinki {
  rozmiar: RozmiarDrabinki;
  lista: Mecz[];
}

/* ---------- nazwy drużyn do podglądu ---------- */

// Nazwy z plików drużyn w chwili budowania panelu. Drużyna dodana przed chwilą pokaże się
// pod nazwą odtworzoną z identyfikatora, dopóki strona się nie przebuduje.
const plikiDruzyn = import.meta.glob<string>('/src/content/druzyny/*.yaml', { eager: true, query: '?raw', import: 'default' });
const NAZWY: Record<string, string> = Object.fromEntries(
  Object.entries(plikiDruzyn).flatMap(([sciezka, tresc]) => {
    const slug = sciezka.split('/').pop()!.replace(/\.yaml$/, '');
    const nazwa = /^nazwa:\s*(.+)$/m.exec(tresc)?.[1]?.trim().replace(/^(['"])(.*)\1$/, '$2');
    return nazwa ? [[slug, nazwa]] : [];
  }),
);
const zIdentyfikatora = (slug: string) => slug.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
const nazwaDruzyny = (slug: string) => NAZWY[slug] ?? zIdentyfikatora(slug);

/** Każdy identyfikator ma nazwę: panel pokazuje także drużyny, których pliku jeszcze nie zna. */
class MapaDruzyn extends Map<string, DruzynaDrabinki> {
  override get(slug: string): DruzynaDrabinki {
    return { slug, nazwa: nazwaDruzyny(slug) };
  }
}
const DRUZYNY = new MapaDruzyn();

/* ---------- wygląd: te same style co na stronie, zamknięte w pudełku edytora ---------- */

// Reguły drabinki, etykiet i przycisków wyjęte z bundle.css, żeby podgląd wyglądał jak strona,
// a globalne style strony nie zmieniały reszty panelu.
// Bierzemy tylko reguły zapisane w całości w jednej linii (tak jest w bundle.css), żeby niedomknięty
// nawias nie zepsuł reszty arkusza.
const REGULY = komponenty
  .split('\n')
  .filter((linia) => /^\.acs-(bracket(?![a-z])|br__|label|status__dot|btn)/.test(linia) && linia.split('{').length === linia.split('}').length)
  .join('\n');
const ZMIENNE = /:root\s*\{([^}]*)\}/.exec(tokeny)?.[1] ?? '';
const CSS = `
@keyframes acs-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .acs-edytor *, .acs-edytor *::before, .acs-edytor *::after { transition: none !important; animation: none !important; } }
.acs-edytor {${ZMIENNE}
  margin-top: 8px; padding: var(--space-4); background: var(--bg); color: var(--ink); border: 1px solid var(--line);
  font-family: var(--font-sans); font-size: 14px; line-height: 20px; -webkit-font-smoothing: antialiased;
  *, *::before, *::after { box-sizing: border-box; }
  ${REGULY}
  .acs-edytor__pasek { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); padding-bottom: var(--space-4); margin-bottom: var(--space-6); border-bottom: 1px solid var(--line); }
  .acs-edytor__pasek .acs-label { margin-right: var(--space-2); }
  .acs-edytor__rada { margin: 0 0 0 auto; color: var(--ink-muted); font-size: 12px; line-height: 16px; }
  .acs-edytor__ink { color: var(--ink); }
  /* cztery rundy mają się mieścić w kolumnie formularza bez przewijania */
  .acs-bracket { --br-gap: 32px; }
  .acs-bracket__inner { min-width: 0; }
  .acs-edytor__mecz { display: block; padding: 0; margin: 0; appearance: none; font: inherit; color: inherit; text-align: left; cursor: pointer; transition: border-color .16s ease-out; }
  .acs-edytor__mecz:hover { border-color: var(--line-strong); }
  .acs-edytor__mecz[aria-pressed="true"], .acs-edytor__mecz.is-live[aria-pressed="true"] { border-color: var(--ink); box-shadow: 0 0 0 1px var(--ink); }
  .acs-edytor__mecz:focus-visible { outline: none; box-shadow: var(--focus-ring); }
}
.acs-edytor-form { margin-top: 16px; padding: 16px; border: 1px solid color-mix(in srgb, currentColor 18%, transparent); border-radius: 8px; }
.acs-edytor-form__glowa { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; }
.acs-edytor-form__opis { margin-top: 8px; }
.acs-edytor-opis { margin-top: 4px; }
.acs-edytor-form__pola { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 24px; margin-top: 16px; align-items: start; }
.acs-edytor-form__cale { grid-column: 1 / -1; }
@media (max-width: 700px) { .acs-edytor-form__pola { grid-template-columns: 1fr; } }
`;

/* ---------- pola edycji meczu: zwykłe pola Keystatic ---------- */

const POLA = {
  naZywo: fields.checkbox({ label: 'Mecz na żywo', description: 'Czerwona ramka i „Live” zamiast godziny. Po ustawieniu zwycięzcy znika samo.' }),
  termin: fields.datetime({ label: 'Data i godzina', description: 'Czas polski. Puste = „ASAP” (mecz zaraz po poprzednim).' }),
  druzynaA: fields.relationship({ label: 'Drużyna A (górna)', collection: 'druzyny' }),
  druzynaB: fields.relationship({ label: 'Drużyna B (dolna)', collection: 'druzyny' }),
  wynikA: fields.integer({ label: 'Wynik A', description: 'Wygrane mapy.', validation: { min: 0 } }),
  wynikB: fields.integer({ label: 'Wynik B', validation: { min: 0 } }),
};

const ROZMIARY: { rozmiar: RozmiarDrabinki; etykieta: string }[] = [
  { rozmiar: 16, etykieta: '16 drużyn' },
  { rozmiar: 8, etykieta: '8 drużyn' },
  { rozmiar: 4, etykieta: '4 drużyny' },
  { rozmiar: 2, etykieta: '2 drużyny' },
];

const klasy = (...lista: (string | false | undefined)[]) => lista.filter(Boolean).join(' ');
const tenSam = (m: { runda: RundaId; pozycja: number }, runda: RundaId, pozycja: number) => m.runda === runda && m.pozycja === pozycja;
const pustyMecz = (runda: RundaId, pozycja: number): Mecz => ({ runda, pozycja, zwyciezca: 'brak', naZywo: false });

function Strona({ druzyna, rozstrzygniety }: { druzyna?: BracketTeam; rozstrzygniety: boolean }) {
  return (
    <span className={klasy('acs-br__team', druzyna?.winner && 'is-winner', rozstrzygniety && !druzyna?.winner && 'is-loser', !druzyna?.name && 'is-tbd')}>
      <span className="acs-br__logo" aria-hidden="true">{druzyna?.name ? initials(druzyna.name) : ''}</span>
      <span className="acs-br__name">{druzyna?.name || 'TBD'}</span>
      <span className="acs-br__score">{druzyna?.score ?? '–'}</span>
    </span>
  );
}

function EdytorDrabinki({ value, onChange, label, description }: FormFieldInputProps<WartoscDrabinki> & { label: string; description?: string }) {
  const rundy = rundyDrabinki(value.rozmiar);
  const podglad = useMemo(() => zbudujDrabinke(value.rozmiar, value.lista, DRUZYNY), [value]);

  // na start: mecz na żywo, a gdy żaden nie trwa, pierwszy nierozstrzygnięty z kompletem drużyn
  const [wybor, ustawWybor] = useState<{ runda: RundaId; pozycja: number } | undefined>(() => {
    const kandydaci = podglad.rounds.flatMap((r, ri) => r.matches.map((m, pi) => ({ m, runda: rundy[ri]!.id, pozycja: pi + 1 })));
    const cel = kandydaci.find((k) => k.m.live) ?? kandydaci.find((k) => k.m.a?.name && k.m.b?.name && !k.m.a.winner && !k.m.b.winner);
    return cel && { runda: cel.runda, pozycja: cel.pozycja };
  });
  const indeksRundy = wybor ? rundy.findIndex((r) => r.id === wybor.runda && wybor.pozycja <= r.mecze) : -1;
  const wybrany = wybor && indeksRundy >= 0 ? wybor : undefined;
  const rekord = wybrany && (value.lista.find((m) => tenSam(m, wybrany.runda, wybrany.pozycja)) ?? pustyMecz(wybrany.runda, wybrany.pozycja));
  const widok = wybrany && podglad.rounds[indeksRundy]?.matches[wybrany.pozycja - 1];

  const zmien = (zmiany: Partial<Mecz>) => {
    if (!rekord) return;
    const nowy = { ...rekord, ...zmiany };
    // rozstrzygnięty mecz przestaje być meczem na żywo
    if (zmiany.zwyciezca && zmiany.zwyciezca !== 'brak') nowy.naZywo = false;
    onChange({ ...value, lista: [...value.lista.filter((m) => !tenSam(m, rekord.runda, rekord.pozycja)), nowy] });
  };
  const wyczysc = () => rekord && onChange({ ...value, lista: value.lista.filter((m) => !tenSam(m, rekord.runda, rekord.pozycja)) });

  const nazwaA = widok?.a?.name;
  const nazwaB = widok?.b?.name;
  // lista zwycięzcy pokazuje nazwy drużyn, więc pole powstaje od nowa, gdy zmieni się skład meczu
  const poleZwyciezcy = useMemo(
    () =>
      fields.select({
        label: 'Zwycięzca meczu',
        description: 'Przechodzi automatycznie do kolejnej rundy.',
        options: [
          { label: 'Nierozstrzygnięty', value: 'brak' },
          { label: nazwaA ?? 'Drużyna A (górna)', value: 'a' },
          { label: nazwaB ?? 'Drużyna B (dolna)', value: 'b' },
        ],
        defaultValue: 'brak',
      }),
    [nazwaA, nazwaB],
  );

  return (
    <div>
      <style>{CSS}</style>
      <Text weight="semibold">{label}</Text>
      {description && (
        <div className="acs-edytor-opis">
          <Text size="small" color="neutralSecondary">{description}</Text>
        </div>
      )}

      <div className="acs-edytor">
        <div className="acs-edytor__pasek">
          <span className="acs-label">Wielkość drabinki</span>
          {ROZMIARY.map((r) => (
            <button key={r.rozmiar} type="button" className={klasy('acs-btn', 'acs-btn--sm', value.rozmiar === r.rozmiar ? 'acs-btn--primary' : 'acs-btn--secondary')} aria-pressed={value.rozmiar === r.rozmiar} onClick={() => onChange({ ...value, rozmiar: r.rozmiar })}>
              {r.etykieta}
            </button>
          ))}
          <p className="acs-edytor__rada">Kliknij mecz, żeby go edytować.</p>
        </div>
        <div className="acs-bracket">
          <div className="acs-bracket__inner" style={{ minWidth: rundy.length * 170 }}>
            {podglad.rounds.map((runda, ri) => (
              <div key={rundy[ri]!.id} className={klasy('acs-br__round', ri === 0 && 'is-first', ri === podglad.rounds.length - 1 && 'is-last')}>
                <div className="acs-br__head">
                  <span className="acs-label acs-edytor__ink">{runda.name}</span>
                  {runda.date && <span className="acs-br__date">{runda.date}</span>}
                </div>
                <div className="acs-br__col">
                  {runda.matches.map((mecz, pi) => {
                    const zaznaczony = Boolean(wybrany && tenSam(wybrany, rundy[ri]!.id, pi + 1));
                    const rozstrzygniety = Boolean(mecz.a?.winner || mecz.b?.winner);
                    return (
                      <div key={pi} className="acs-br__slot" style={{ height: 104 * 2 ** ri }}>
                        <button
                          type="button"
                          className={klasy('acs-br__match', 'acs-edytor__mecz', mecz.live && 'is-live')}
                          aria-pressed={zaznaczony}
                          aria-label={`${rundy[ri]!.nazwaMeczu} ${pi + 1}: ${mecz.a?.name ?? 'TBD'} – ${mecz.b?.name ?? 'TBD'}`}
                          onClick={() => ustawWybor({ runda: rundy[ri]!.id, pozycja: pi + 1 })}
                        >
                          <span className="acs-br__time">
                            {mecz.live ? (
                              <>
                                <span className="acs-status__dot" aria-hidden="true" />
                                <span>Live</span>
                              </>
                            ) : (
                              mecz.time || 'ASAP'
                            )}
                          </span>
                          <Strona druzyna={mecz.a} rozstrzygniety={rozstrzygniety} />
                          <Strona druzyna={mecz.b} rozstrzygniety={rozstrzygniety} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {rekord && wybrany ? (
        <div className="acs-edytor-form" key={`${wybrany.runda}:${wybrany.pozycja}`}>
          <div className="acs-edytor-form__glowa">
            <div>
              <Heading size="small">
                {rundy[indeksRundy]!.nazwaMeczu}
                {rundy[indeksRundy]!.mecze > 1 ? ` ${wybrany.pozycja}` : ''}: {nazwaA ?? 'TBD'} – {nazwaB ?? 'TBD'}
              </Heading>
              {indeksRundy > 0 && (
                <div className="acs-edytor-form__opis">
                  <Text size="small" color="neutralSecondary">Drużyny wchodzą tu z poprzedniej rundy. Pola drużyn wypełnij tylko wtedy, gdy chcesz to nadpisać.</Text>
                </div>
              )}
            </div>
            <ActionButton onPress={wyczysc}>Wyczyść mecz</ActionButton>
          </div>
          <div className="acs-edytor-form__pola">
            <div className="acs-edytor-form__cale">
              <POLA.naZywo.Input value={rekord.naZywo} onChange={(naZywo) => zmien({ naZywo })} autoFocus={false} forceValidation={false} />
            </div>
            <POLA.wynikA.Input value={rekord.wynikA ?? null} onChange={(v) => zmien({ wynikA: v ?? undefined })} autoFocus={false} forceValidation={false} />
            <POLA.wynikB.Input value={rekord.wynikB ?? null} onChange={(v) => zmien({ wynikB: v ?? undefined })} autoFocus={false} forceValidation={false} />
            <div className="acs-edytor-form__cale">
              <poleZwyciezcy.Input value={rekord.zwyciezca} onChange={(v) => zmien({ zwyciezca: v === 'a' || v === 'b' ? v : 'brak' })} autoFocus={false} forceValidation={false} />
            </div>
            <div className="acs-edytor-form__cale">
              <POLA.termin.Input value={rekord.termin ?? null} onChange={(v) => zmien({ termin: v ?? undefined })} autoFocus={false} forceValidation={false} />
            </div>
            <POLA.druzynaA.Input value={rekord.druzynaA ?? null} onChange={(v) => zmien({ druzynaA: v ?? undefined })} autoFocus={false} forceValidation={false} />
            <POLA.druzynaB.Input value={rekord.druzynaB ?? null} onChange={(v) => zmien({ druzynaB: v ?? undefined })} autoFocus={false} forceValidation={false} />
          </div>
        </div>
      ) : (
        <div className="acs-edytor-form">
          <Text color="neutralSecondary">Kliknij mecz w drabince, żeby ustawić godzinę, drużyny, wynik albo oznaczyć go jako mecz na żywo.</Text>
        </div>
      )}
    </div>
  );
}

/** Pole „Drabinka” do schematu turnieju w keystatic.config. */
export function poleDrabinki({ label, description }: { label: string; description?: string }): BasicFormField<WartoscDrabinki> {
  const odczytaj = (wartosc: unknown): WartoscDrabinki => {
    const drabinka = odczytajDrabinke(wartosc);
    return { rozmiar: drabinka.rozmiar ?? rozmiarZListy(drabinka.lista), lista: drabinka.lista };
  };
  return {
    kind: 'form',
    label,
    Input: (props) => <EdytorDrabinki {...props} label={label} description={description} />,
    defaultValue: () => ({ rozmiar: 16, lista: [] }),
    parse: odczytaj,
    serialize: (wartosc) => ({ value: zapiszDrabinke(wartosc) }),
    validate: (wartosc) => wartosc,
    reader: { parse: odczytaj },
  };
}
