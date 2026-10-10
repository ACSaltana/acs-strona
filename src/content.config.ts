// Schemat treści po stronie strony. Pliki zapisuje panel Keystatic (keystatic.config.ts),
// tutaj są tylko odczytywane i sprawdzane przy budowaniu. Schemat jest celowo wyrozumiały:
// brak pola opcjonalnego nie może zatrzymać publikacji.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Tekst opcjonalny: pusty napis i null traktujemy jak brak. */
const tekst = z
  .union([z.string(), z.number()])
  .nullish()
  .transform((v) => (v === null || v === undefined ? undefined : String(v).trim() || undefined));

/** Data z godziną jako czas polski "RRRR-MM-DDTGG:MM". Keystatic zapisuje ją w YAML jako znacznik czasu. */
const dataCzas = z
  .union([z.string(), z.date()])
  .nullish()
  .transform((v) => (v === null || v === undefined || v === '' ? undefined : (v instanceof Date ? v.toISOString() : v).slice(0, 16)));

/** Sama data "RRRR-MM-DD". */
const dzien = z
  .union([z.string(), z.date()])
  .nullish()
  .transform((v) => (v === null || v === undefined || v === '' ? undefined : (v instanceof Date ? v.toISOString() : v).slice(0, 10)));

const liczba = z.number().nullish().transform((v) => v ?? undefined);
const lista = z.array(z.string()).nullish().transform((v) => v ?? []);

const mecz = z.object({
  runda: z.enum(['1-8', 'cwiercfinal', 'polfinal', 'final']),
  pozycja: z.number().int().min(1),
  termin: dataCzas,
  druzynaA: tekst,
  druzynaB: tekst,
  wynikA: liczba,
  wynikB: liczba,
  zwyciezca: z.enum(['brak', 'a', 'b']).default('brak'),
  naZywo: z.boolean().default(false),
});

const turnieje = defineCollection({
  loader: glob({ pattern: '*.mdoc', base: './src/content/turnieje' }),
  schema: z.object({
    tytul: z.string(),
    status: z.enum(['announced', 'open', 'closed', 'live', 'finished']).default('announced'),
    gra: tekst.transform((v) => v ?? 'CS2'),
    format: tekst,
    etykietaDrabinki: tekst,
    limitDruzyn: z.number().int().default(16),
    start: dataCzas.refine((v) => v !== undefined, 'Turniej musi mieć datę startu'),
    koniec: dzien,
    pulaNagrod: tekst,
    tryb: z.enum(['online', 'lan']).default('online'),
    miniatura: tekst,
    baner: tekst,
    opisGrafiki: tekst,
    lead: tekst,
    druzyny: lista,
    zwyciezca: tekst,
    mecze: z.array(mecz).nullish().transform((v) => v ?? []),
    sponsorzy: lista,
    regulaminPdf: tekst,
  }),
});

const druzyny = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/druzyny' }),
  schema: z.object({
    nazwa: z.string(),
    skrot: tekst,
    logo: tekst,
  }),
});

const sponsorzy = defineCollection({
  loader: glob({ pattern: '*.yaml', base: './src/content/sponsorzy' }),
  schema: z.object({
    nazwa: z.string(),
    logo: tekst,
    poziom: z.enum(['glowny', 'partner']).default('partner'),
    www: tekst,
  }),
});

const wpisy = defineCollection({
  loader: glob({ pattern: '*.mdoc', base: './src/content/wpisy' }),
  schema: z.object({
    tytul: z.string(),
    data: dzien.refine((v) => v !== undefined, 'Wpis musi mieć datę publikacji'),
    kategoria: z.enum(['ogloszenie', 'relacja', 'poradnik']).default('ogloszenie'),
    okladka: tekst,
    opisOkladki: tekst,
    zajawka: tekst,
  }),
});

const teksty = defineCollection({
  loader: glob({ pattern: 'teksty.yaml', base: './src/content/strony' }),
  schema: z.object({
    glowna: z.object({ etykieta: tekst, tytul: tekst, lead: tekst, kontaktTematy: tekst }).prefault({}),
    turnieje: z.object({ lead: tekst }).prefault({}),
    aktualnosci: z.object({ lead: tekst }).prefault({}),
    kontakt: z
      .object({
        lead: tekst,
        wskazowka: tekst,
        tematy: z
          .array(z.object({ tytul: z.string(), temat: tekst, opis: tekst, linkEtykieta: tekst, linkAdres: tekst }))
          .nullish()
          .transform((v) => v ?? []),
      })
      .prefault({}),
  }),
});

const oNas = defineCollection({
  loader: glob({ pattern: 'o-nas.yaml', base: './src/content/strony' }),
  schema: z.object({
    tytul: tekst,
    lead: tekst,
    grafika: tekst,
    opisGrafiki: tekst,
    bloki: z.array(z.object({ tytul: z.string(), tekst: tekst })).nullish().transform((v) => v ?? []),
    liczby: z.array(z.object({ wartosc: z.union([z.string(), z.number()]).transform(String), etykieta: z.string() })).nullish().transform((v) => v ?? []),
    historia: tekst,
  }),
});

const ustawienia = defineCollection({
  loader: glob({ pattern: 'ustawienia.yaml', base: './src/content/strony' }),
  schema: z.object({
    email: z.string(),
    logo: tekst,
    opis: tekst,
    social: z.array(z.object({ platforma: z.string(), adres: tekst, ikona: tekst })).nullish().transform((v) => v ?? []),
  }),
});

export const collections = { turnieje, druzyny, sponsorzy, wpisy, teksty, oNas, ustawienia };
