import type { APIRoute } from 'astro';

// robots.txt z bezwzględnym adresem mapy strony (adres zależy od domeny, na której stoi strona)
export const GET: APIRoute = ({ site }) =>
  new Response(['User-agent: *', 'Allow: /', 'Disallow: /keystatic', 'Disallow: /api/', '', `Sitemap: ${new URL('/sitemap-index.xml', site).href}`, ''].join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
