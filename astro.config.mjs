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

// Panel Keystatic działa lokalnie zawsze, a na produkcji dopiero po podaniu projektu Keystatic Cloud.
// Bez tego panel w trybie lokalnym byłby wystawiony publicznie bez logowania.
const isBuild = process.argv.includes('build');
const withKeystatic = !isBuild || Boolean(process.env.PUBLIC_KEYSTATIC_PROJECT);

export default defineConfig({
  site,
  trailingSlash: 'never',
  adapter: vercel(),
  integrations: [
    markdoc(),
    sitemap(),
    ...(withKeystatic ? [react(), keystatic()] : []),
  ],
  devToolbar: { enabled: false },
});
