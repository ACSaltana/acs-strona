import type { ImageMetadata } from 'astro';

// Grafiki wgrane przez panel leżą w src/assets, a w treści jest zapisana ich ścieżka
// (np. "/src/assets/turnieje/acs-winter-cup-3/miniatura.webp").
const pliki = import.meta.glob<ImageMetadata>('/src/assets/**/*.{png,jpg,jpeg,webp,avif,gif,svg}', { eager: true, import: 'default' });

/** Ścieżka z treści → grafika do optymalizacji. Brak pliku daje undefined, a komponent pokaże pole zastępcze. */
export function obraz(sciezka?: string): ImageMetadata | undefined {
  if (!sciezka) return undefined;
  return pliki[sciezka.startsWith('/') ? sciezka : `/${sciezka}`];
}
