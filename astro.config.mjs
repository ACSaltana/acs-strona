// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';

// Adres strony: SITE_URL ma pierwszeństwo, potem domena produkcyjna z Vercel, lokalnie localhost.
const site =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:4321');

// @astrojs/vercel 11.0.13: kod funkcji serwerowej importuje stałe z głównego modułu adaptera, a razem z nim
// narzędzia budujące (rolldown, @vercel/routing-utils). rolldown ładuje przy starcie natywną bibliotekę,
// której w funkcji na Vercel nie ma, więc panel /keystatic kończył się błędem FUNCTION_INVOCATION_FAILED.
// Zbudowany kod serwera z tych importów nie korzysta, dlatego podmieniamy je na puste moduły.
// Do usunięcia, gdy adapter przestanie wciągać te zależności do funkcji.
const NARZEDZIA_BUDOWANIA = {
  rolldown: 'export const rolldown = undefined;',
  '@vercel/routing-utils': 'export const getTransformedRoutes = undefined; export const normalizeRoutes = undefined;',
};
const PUSTY = '\0acs-pusty:';
/** @type {import('vite').Plugin} */
const bezNarzedziBudowaniaWFunkcji = {
  name: 'acs:bez-narzedzi-budowania-w-funkcji',
  enforce: 'pre',
  apply: 'build',
  resolveId(id) {
    return id in NARZEDZIA_BUDOWANIA ? PUSTY + id : null;
  },
  load(id) {
    return id.startsWith(PUSTY) ? NARZEDZIA_BUDOWANIA[/** @type {keyof typeof NARZEDZIA_BUDOWANIA} */ (id.slice(PUSTY.length))] : null;
  },
};

export default defineConfig({
  site,
  trailingSlash: 'never',
  adapter: vercel(),
  // Cały CSS (ok. 7 KB po kompresji) jest wstawiany w HTML: bez osobnego żądania blokującego pierwsze malowanie.
  build: { inlineStylesheets: 'always' },
  integrations: [
    markdoc(),
    sitemap(),
    // panel /keystatic (React) i jego API to jedyne trasy obsługiwane przez funkcję serwerową
    react(),
    keystatic(),
  ],
  vite: { plugins: [bezNarzedziBudowaniaWFunkcji] },
  devToolbar: { enabled: false },
});
