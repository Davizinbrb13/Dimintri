# NexusTI Design System

Identidade visual e tokens compartilhados do NexusTI.

## Marca

- `assets/nexusti-logo.png`: logo horizontal colorido para fundos claros.
- `assets/nexusti-logo-inverted.png`: logo horizontal branco para fundos escuros.
- `assets/nexusti-symbol.png`: simbolo isolado colorido.
- `assets/nexusti-symbol-inverted.png`: simbolo isolado branco.

Preserve a proporcao dos arquivos e mantenha area livre ao redor da marca. A cor principal e o bordo `#800000`; o texto institucional usa o cinza `#333333`.

## Arquivos

- `tokens.css`: variaveis CSS usadas pela aplicacao.
- `tokens.ts`: tokens tipados para projetos TypeScript.
- `tokens.json`: formato neutro para outras plataformas.
- `components.css`: primitives visuais opcionais.
- `tailwind.preset.cjs`: extensao de tema para projetos Tailwind.
- `preview.html`: referencia visual local.

## Uso com CSS

```css
@import "./design-system-nexusti/fonts.css";
@import "./design-system-nexusti/tokens.css";
@import "./design-system-nexusti/components.css";
```

## Uso com Tailwind

```js
module.exports = {
  presets: [require("./design-system-nexusti/tailwind.preset.cjs")],
};
```
