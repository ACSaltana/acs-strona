// Jak renderuje się treść sformatowana z CMS (wpisy, zasady turnieju).
import { component, defineMarkdocConfig, nodes } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
  nodes: {
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
      attributes: {
        tekst: { type: String, required: true },
        cel: { type: String, default: 'email', matches: ['email', 'link'] },
        temat: { type: String },
        adres: { type: String },
      },
    },
  },
});
