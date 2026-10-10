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
  devToolbar: { enabled: false },
});
