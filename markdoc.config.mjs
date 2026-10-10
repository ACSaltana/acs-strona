// Jak renderuje się treść sformatowana z CMS (wpisy, zasady turnieju).
import { component, defineMarkdocConfig, nodes } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  nodes: {
    // bez domyślnego opakowania <article>: treść trafia wprost do kontenera strony
    document: { ...nodes.document, render: null },
    // obrazki w treści: WebP w kilku szerokościach zamiast jednego pliku w pełnym rozmiarze
    image: { ...nodes.image, render: component('./src/components/markdoc/Obraz.astro') },
    // nagłówki i kod dostają style tekstu z tokenów (heading-2, body-strong, meta)
    heading: { ...nodes.heading, render: component('./src/components/markdoc/Naglowek.astro') },
    // bez domyślnego transform z Markdoc: treść trafia do komponentu jako atrybut `content`
    code: { render: component('./src/components/markdoc/Kod.astro'), attributes: { content: { type: String, required: true } } },
    link: { ...nodes.link, render: component('./src/components/markdoc/Link.astro') },
  },
  tags: {
    przycisk: {
      render: component('./src/components/markdoc/Przycisk.astro'),
      selfClosing: true,
      // Żaden atrybut nie jest wymagany: panel wstawia pusty blok, a niedokończony przycisk
      // nie może zatrzymać budowania strony. Bez tekstu po prostu się nie wyświetla.
      attributes: {
        tekst: { type: String },
        cel: { type: String, default: 'email' },
        temat: { type: String },
        adres: { type: String },
      },
    },
  },
});
