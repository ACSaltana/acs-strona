// Panel administracyjny ACS (Keystatic). Model treści według design-system/cms.md.
// Treść zapisuje się w src/content, grafiki w src/assets, pliki PDF w public/regulaminy.
import { createElement } from 'react';
import { collection, config, fields, singleton } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

// Projekt Keystatic Cloud w formacie "zespol/projekt". Lokalnie (npm run dev) panel zapisuje pliki na dysku.
const cloudProject = import.meta.env.PUBLIC_KEYSTATIC_PROJECT as string | undefined;
const useCloud = Boolean(cloudProject) && !import.meta.env.DEV;

const RUNDY = [
  { label: '1/8 finału', value: '1-8' },
  { label: 'Ćwierćfinał', value: 'cwiercfinal' },
  { label: 'Półfinał', value: 'polfinal' },
  { label: 'Finał', value: 'final' },
] as const;

const PLATFORMY = ['Discord', 'YouTube', 'Twitch', 'Instagram', 'TikTok', 'X', 'Facebook'] as const;

const obraz = (katalog: string, label: string, description: string, required = false) =>
  fields.image({
    label,
    description,
    directory: `src/assets/${katalog}`,
    publicPath: `/src/assets/${katalog}/`,
    validation: { isRequired: required },
  });

// Formatowanie dostępne w treściach: bez tabel i bloków kodu, nagłówki od poziomu 2 (h1 to tytuł strony).
const formatowanie = {
  heading: [2, 3],
  table: false,
  codeBlock: false,
  strikethrough: false,
} as const;

export default config({
  storage: useCloud ? { kind: 'cloud' } : { kind: 'local' },
  cloud: cloudProject ? { project: cloudProject } : undefined,
  locale: 'pl-PL',
  ui: {
    brand: { name: 'ACS' },
    navigation: {
      Turnieje: ['turnieje', 'druzyny', 'sponsorzy'],
      Aktualności: ['wpisy'],
      Strony: ['teksty', 'oNas'],
      Ustawienia: ['ustawienia'],
    },
  },

  collections: {
    turnieje: collection({
      label: 'Turnieje',
      slugField: 'tytul',
      path: 'src/content/turnieje/*',
      format: { contentField: 'zasady' },
      columns: ['status', 'start'],
      previewUrl: '/turnieje/{slug}',
      schema: {
        tytul: fields.slug({
          name: {
            label: 'Tytuł',
            description: 'Maks. ok. 40 znaków, np. „ACS Winter Cup #3”. Dłuższe nazwy skracaj tutaj, strona nie ucina ich wielokropkiem.',
            validation: { isRequired: true, length: { max: 60 } },
          },
          slug: {
            label: 'Adres (slug)',
            description: 'Końcówka adresu: /turnieje/<slug>. Nie zmieniaj po publikacji, bo stare linki przestaną działać.',
          },
        }),
        status: fields.select({
          label: 'Status',
          description: 'Strona główna pokazuje turniej „Live”, a gdy żaden nie trwa: najbliższy niezakończony. „Zakończony” trafia do archiwum.',
          options: [
            { label: 'Zapowiedź', value: 'announced' },
            { label: 'Zapisy otwarte', value: 'open' },
            { label: 'Zapisy zamknięte', value: 'closed' },
            { label: 'Live (trwa)', value: 'live' },
            { label: 'Zakończony', value: 'finished' },
          ],
          defaultValue: 'announced',
        }),
        gra: fields.text({ label: 'Gra', defaultValue: 'CS2', validation: { isRequired: true } }),
        format: fields.text({ label: 'Format', description: 'np. „5v5 · BO3”', validation: { isRequired: true } }),
        etykietaDrabinki: fields.text({ label: 'System rozgrywek', description: 'Etykieta przy drabince, np. „Single elimination · BO3”. Może zostać pusta.' }),
        limitDruzyn: fields.integer({
          label: 'Limit drużyn',
          description: 'Od niego zależy wielkość drabinki (16 drużyn = 1/8 finału, 8 = ćwierćfinały). W trakcie zapisów strona pokazuje „zapisane / limit”.',
          defaultValue: 16,
          validation: { isRequired: true, min: 2, max: 16 },
        }),
        start: fields.datetime({ label: 'Start', description: 'Data i godzina pierwszego meczu (czas polski). Do niej liczy odliczanie.', validation: { isRequired: true } }),
        koniec: fields.date({ label: 'Koniec', description: 'Ostatni dzień turnieju. Puste = turniej jednodniowy.' }),
        pulaNagrod: fields.text({ label: 'Pula nagród', description: 'Kwota w PLN samymi cyframi (np. 2000 → „2 000 PLN”) albo dowolny tekst.', validation: { isRequired: true } }),
        tryb: fields.select({
          label: 'Tryb',
          options: [
            { label: 'Online', value: 'online' },
            { label: 'LAN', value: 'lan' },
          ],
          defaultValue: 'online',
        }),
        miniatura: obraz('turnieje', 'Miniatura (16:9)', '1600×900, WebP lub JPG, do 300 KB. Bez tytułu, daty i kwoty na grafice.', true),
        baner: obraz('turnieje', 'Baner (21:9)', '2520×1080. Najważniejszy motyw po prawej i w środku. Brak = strona użyje miniatury.'),
        opisGrafiki: fields.text({ label: 'Opis grafiki (alt)', description: 'Jedno zdanie dla czytników ekranu, np. „Grafika turnieju ACS Winter Cup #3”.' }),
        lead: fields.text({ label: 'Lead', description: '1–2 zdania pod tytułem.', multiline: true }),
        druzyny: fields.multiRelationship({ label: 'Drużyny', description: 'Drużyny przyjęte do turnieju. Najpierw dodaj drużynę w zakładce „Drużyny”.', collection: 'druzyny' }),
        zwyciezca: fields.relationship({ label: 'Zwycięzca turnieju', description: 'Pokazywany w archiwum. Puste = zwycięzca finału z drabinki.', collection: 'druzyny' }),
        mecze: fields.array(
          fields.object({
            runda: fields.select({ label: 'Runda', options: [...RUNDY], defaultValue: '1-8' }),
            pozycja: fields.integer({ label: 'Pozycja w rundzie', description: '1 = pierwszy mecz od góry drabinki.', defaultValue: 1, validation: { isRequired: true, min: 1, max: 8 } }),
            termin: fields.datetime({ label: 'Data i godzina', description: 'Czas polski. Puste = „ASAP” (mecz zaraz po rozstrzygnięciu poprzedniego).' }),
            druzynaA: fields.relationship({ label: 'Drużyna A', description: 'Puste = zwycięzca poprzedniej rundy, a gdy go jeszcze nie ma: „TBD”.', collection: 'druzyny' }),
            druzynaB: fields.relationship({ label: 'Drużyna B', collection: 'druzyny' }),
            wynikA: fields.integer({ label: 'Wynik A', description: 'Wygrane mapy.', validation: { min: 0 } }),
            wynikB: fields.integer({ label: 'Wynik B', validation: { min: 0 } }),
            zwyciezca: fields.select({
              label: 'Zwycięzca meczu',
              description: 'Zwycięzca przechodzi automatycznie do kolejnej rundy.',
              options: [
                { label: 'Nierozstrzygnięty', value: 'brak' },
                { label: 'Drużyna A', value: 'a' },
                { label: 'Drużyna B', value: 'b' },
              ],
              defaultValue: 'brak',
            }),
            naZywo: fields.checkbox({ label: 'Mecz na żywo', description: 'Czerwona ramka i „Live” zamiast godziny. Odznacz po zakończeniu meczu.' }),
          }),
          {
            label: 'Mecze (drabinka)',
            description: 'Dodaj tylko mecze, które mają godzinę, drużyny albo wynik. Pozostałe miejsca drabinki strona pokaże jako „TBD” i „ASAP”.',
            itemLabel: (props) => {
              const runda = RUNDY.find((r) => r.value === props.fields.runda.value)?.label ?? 'Mecz';
              // puste pole drużyny = zwycięzca poprzedniej rundy albo TBD
              const a = props.fields.druzynaA.value ?? 'auto';
              const b = props.fields.druzynaB.value ?? 'auto';
              const live = props.fields.naZywo.value ? ' · na żywo' : '';
              return `${runda} ${props.fields.pozycja.value ?? ''}: ${a} – ${b}${live}`;
            },
          },
        ),
        sponsorzy: fields.multiRelationship({ label: 'Sponsorzy', description: 'Najpierw dodaj sponsora w zakładce „Sponsorzy”.', collection: 'sponsorzy' }),
        regulaminPdf: fields.file({ label: 'Pełny regulamin (PDF)', description: 'Z plikiem pod zasadami pojawia się przycisk „Pełny regulamin (PDF)”.', directory: 'public/regulaminy', publicPath: '/regulaminy/' }),
        zasady: fields.markdoc({
          label: 'Najważniejsze zasady',
          description: 'Sekcja „Regulamin” na stronie turnieju. Najlepiej lista punktów; pogrubienie wyróżnia nazwę zasady.',
          options: { ...formatowanie, image: false, blockquote: false, divider: false, code: false },
        }),
      },
    }),

    druzyny: collection({
      label: 'Drużyny',
      slugField: 'nazwa',
      path: 'src/content/druzyny/*',
      format: { data: 'yaml' },
      columns: ['skrot'],
      schema: {
        nazwa: fields.slug({
          name: { label: 'Nazwa', validation: { isRequired: true } },
          slug: { label: 'Identyfikator', description: 'Nie zmieniaj po dodaniu drużyny do turnieju, bo zniknie z drabinki.' },
        }),
        skrot: fields.text({ label: 'Skrót', description: '2–4 znaki, np. „NPT”.', validation: { length: { max: 4 } } }),
        logo: obraz('druzyny', 'Logo', 'Kwadrat 512×512, SVG lub PNG z przezroczystym tłem, wersja jasna (czytelna na czerni). Brak = inicjały drużyny.'),
      },
    }),

    sponsorzy: collection({
      label: 'Sponsorzy',
      slugField: 'nazwa',
      path: 'src/content/sponsorzy/*',
      format: { data: 'yaml' },
      columns: ['poziom'],
      schema: {
        nazwa: fields.slug({ name: { label: 'Nazwa', validation: { isRequired: true } }, slug: { label: 'Identyfikator' } }),
        logo: obraz('sponsorzy', 'Logo', 'SVG lub PNG z przezroczystym tłem, jasna wersja.', true),
        poziom: fields.select({
          label: 'Poziom',
          description: 'Sponsor główny dostaje duże pole (2×2). Na turniej przypada jeden sponsor główny.',
          options: [
            { label: 'Sponsor główny', value: 'glowny' },
            { label: 'Partner', value: 'partner' },
          ],
          defaultValue: 'partner',
        }),
        www: fields.url({ label: 'Strona www', description: 'Z adresem kafelek sponsora staje się linkiem.' }),
      },
    }),

    wpisy: collection({
      label: 'Aktualności',
      slugField: 'tytul',
      path: 'src/content/wpisy/*',
      format: { contentField: 'tresc' },
      entryLayout: 'content',
      columns: ['data', 'kategoria'],
      previewUrl: '/aktualnosci/{slug}',
      schema: {
        tytul: fields.slug({
          name: { label: 'Tytuł', validation: { isRequired: true } },
          slug: { label: 'Adres (slug)', description: 'Końcówka adresu: /aktualnosci/<slug>. Nie zmieniaj po publikacji.' },
        }),
        data: fields.date({ label: 'Data publikacji', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
        kategoria: fields.select({
          label: 'Kategoria',
          options: [
            { label: 'Ogłoszenie', value: 'ogloszenie' },
            { label: 'Relacja', value: 'relacja' },
            { label: 'Poradnik', value: 'poradnik' },
          ],
          defaultValue: 'ogloszenie',
        }),
        okladka: obraz('wpisy', 'Okładka (16:9)', '1600×900, WebP lub JPG. Grafika ciemna lub monochromatyczna.', true),
        opisOkladki: fields.text({ label: 'Opis okładki (alt)', description: 'Jedno zdanie dla czytników ekranu.' }),
        zajawka: fields.text({ label: 'Zajawka', description: 'Maks. ok. 160 znaków. Widać ją na liście wpisów, pod tytułem wpisu i w wyszukiwarkach.', multiline: true, validation: { isRequired: true, length: { max: 220 } } }),
        tresc: fields.markdoc({
          label: 'Treść',
          options: {
            ...formatowanie,
            image: { directory: 'src/assets/wpisy', publicPath: '../../assets/wpisy/' },
          },
          components: {
            przycisk: block({
              label: 'Przycisk',
              description: 'Biały przycisk pod akapitem, np. „Napisz zgłoszenie”.',
              // podgląd bloku w edytorze: od razu widać, czy przycisk jest uzupełniony
              ContentView: ({ value }) =>
                createElement(
                  'span',
                  null,
                  value.tekst
                    ? `„${value.tekst}” → ${value.cel === 'link' ? value.adres || 'brak adresu strony' : 'e-mail do ACS'}`
                    : 'Pusty przycisk: kliknij „Edit” i wpisz tekst. Bez tekstu nie pojawi się na stronie.',
                ),
              schema: {
                tekst: fields.text({ label: 'Tekst przycisku', validation: { isRequired: true } }),
                cel: fields.select({
                  label: 'Dokąd prowadzi',
                  options: [
                    { label: 'E-mail do ACS (adres z Ustawień)', value: 'email' },
                    { label: 'Adres strony', value: 'link' },
                  ],
                  defaultValue: 'email',
                }),
                temat: fields.text({ label: 'Temat wiadomości', description: 'Tylko dla e-maila, np. „Zgłoszenie”.' }),
                adres: fields.text({ label: 'Adres strony', description: 'Tylko dla adresu strony, np. /turnieje albo https://…' }),
              },
            }),
          },
        }),
      },
    }),
  },

  singletons: {
    teksty: singleton({
      label: 'Teksty stron',
      path: 'src/content/strony/teksty',
      format: { data: 'yaml' },
      schema: {
        glowna: fields.object(
          {
            etykieta: fields.text({ label: 'Etykieta nad tytułem', defaultValue: 'Turnieje Counter-Strike 2' }),
            tytul: fields.text({ label: 'Tytuł', defaultValue: 'Altana Championship Series', validation: { isRequired: true } }),
            lead: fields.text({ label: 'Lead', description: 'Jedno zdanie.', multiline: true }),
            kontaktTematy: fields.text({ label: 'Tekst przy adresie e-mail', defaultValue: 'Zgłoszenia drużyn, pytania o turnieje, współpraca.' }),
          },
          { label: 'Strona główna' },
        ),
        turnieje: fields.object({ lead: fields.text({ label: 'Lead', multiline: true }) }, { label: 'Turnieje' }),
        aktualnosci: fields.object({ lead: fields.text({ label: 'Lead', multiline: true }) }, { label: 'Aktualności' }),
        kontakt: fields.object(
          {
            lead: fields.text({ label: 'Lead', multiline: true }),
            wskazowka: fields.text({ label: 'Tekst przy adresie e-mail' }),
            tematy: fields.array(
              fields.object({
                tytul: fields.text({ label: 'Tytuł', validation: { isRequired: true } }),
                temat: fields.text({ label: 'Temat wiadomości', description: 'np. „Zgłoszenie – [turniej] – [drużyna]”' }),
                opis: fields.text({ label: 'Opis', multiline: true }),
                linkEtykieta: fields.text({ label: 'Link: tekst', description: 'Opcjonalny link pod opisem.' }),
                linkAdres: fields.text({ label: 'Link: adres', description: 'np. /aktualnosci/jak-zglosic-druzyne' }),
              }),
              { label: 'Tematy („W czym pomożemy”)', itemLabel: (props) => props.fields.tytul.value || 'Temat', validation: { length: { max: 3 } } },
            ),
          },
          { label: 'Kontakt' },
        ),
      },
    }),

    oNas: singleton({
      label: 'O nas',
      path: 'src/content/strony/o-nas',
      format: { data: 'yaml' },
      schema: {
        tytul: fields.text({ label: 'Tytuł', defaultValue: 'Altana Championship Series', validation: { isRequired: true } }),
        lead: fields.text({ label: 'Lead', multiline: true }),
        grafika: obraz('strony', 'Grafika (16:9)', '1600×900, ciemna lub monochromatyczna.'),
        opisGrafiki: fields.text({ label: 'Opis grafiki (alt)' }),
        bloki: fields.array(
          fields.object({
            tytul: fields.text({ label: 'Tytuł', validation: { isRequired: true } }),
            tekst: fields.text({ label: 'Tekst', multiline: true }),
          }),
          { label: 'Co robimy (bloki)', itemLabel: (props) => props.fields.tytul.value || 'Blok', validation: { length: { max: 3 } } },
        ),
        liczby: fields.array(
          fields.object({
            wartosc: fields.text({ label: 'Liczba', description: 'Tylko prawdziwe dane, bez zaokrąglania w górę, np. „12” albo „8 000 PLN”.', validation: { isRequired: true } }),
            etykieta: fields.text({ label: 'Etykieta', description: 'np. „Rozegrane turnieje”', validation: { isRequired: true } }),
          }),
          { label: 'ACS w liczbach', description: 'Bez liczb sekcja znika ze strony.', itemLabel: (props) => `${props.fields.wartosc.value} · ${props.fields.etykieta.value}`, validation: { length: { max: 3 } } },
        ),
        historia: fields.text({ label: 'Kim jesteśmy (historia)', description: 'Dwa, trzy akapity. Pusta linia rozdziela akapity.', multiline: true }),
      },
    }),

    ustawienia: singleton({
      label: 'Ustawienia',
      path: 'src/content/strony/ustawienia',
      format: { data: 'yaml' },
      schema: {
        email: fields.text({ label: 'Adres e-mail', description: 'Jedyny kontakt na stronie: blok kontaktu, zgłoszenia drużyn, przyciski w treściach.', validation: { isRequired: true } }),
        logo: obraz('ustawienia', 'Logo ACS', 'SVG, wersja biała. Brak = znak tekstowy „ACS · Altana Championship Series”.'),
        opis: fields.text({ label: 'Opis strony dla wyszukiwarek', description: 'Do 160 znaków. Używany na stronie głównej.', multiline: true, validation: { length: { max: 200 } } }),
        social: fields.array(
          fields.object({
            platforma: fields.select({ label: 'Platforma', options: PLATFORMY.map((p) => ({ label: p, value: p })), defaultValue: 'Discord' }),
            adres: fields.url({ label: 'Adres profilu', description: 'Bez adresu przycisk w stopce jest nieaktywny.' }),
            ikona: obraz('ustawienia', 'Ikona', 'Oficjalna biała ikona z brand kitu platformy. Brak = nazwa platformy.'),
          }),
          { label: 'Media społecznościowe', itemLabel: (props) => props.fields.platforma.value },
        ),
      },
    }),
  },
});
