# Univassouras Design System

Design system extraido da pagina institucional da Univassouras/FUSVE em 2026-07-29 para uso em frontend de app.

## Arquivos

- `tokens.css`: variaveis CSS globais para cor, tipografia, espaco, raio, sombra, layout e movimento.
- `tokens.json`: os mesmos tokens em formato consumivel por build tools.
- `tokens.ts`: export JavaScript/TypeScript dos tokens.
- `tailwind.preset.cjs`: preset Tailwind opcional.
- `fonts.css`: carregamento opcional do kit Adobe Typekit usado no site.
- `components.css`: primitivas visuais prontas para usar em HTML/React/Vue/etc.
- `preview.html`: pagina local para visualizar o sistema.
- `assets/`: logos e imagens institucionais baixadas do site.
- `reference/`: capturas da pagina original em desktop e mobile.
- `source-notes.md`: origem dos valores e decisoes de adaptacao.

## Uso rapido

Importe os estilos nesta ordem:

```css
@import "./design-system-univassouras/fonts.css";
@import "./design-system-univassouras/tokens.css";
@import "./design-system-univassouras/components.css";
```

Se o app nao puder carregar Adobe Typekit, mantenha `tokens.css`; a pilha de fallback usa `Arial`/sans-serif.

## Tailwind

Em `tailwind.config.cjs`:

```js
module.exports = {
  presets: [require("./design-system-univassouras/tailwind.preset.cjs")],
  content: ["./src/**/*.{js,ts,jsx,tsx,html}"],
};
```

## Direcao visual

O sistema combina uma base institucional sobria com acentos de chamada para acao:

- Bordo profundo como cor primaria de marca.
- Superficies claras para navegacao, formularios e telas operacionais.
- Dourado/amarelo para CTAs importantes.
- Tipografia Museo Sans, com pesos 400, 500, 600 e 700.
- Cantos discretos, sombras leves e grids contidos em `1200px`.

Para aplicacoes, o CTA amarelo foi definido com texto escuro por contraste. O site original usa o amarelo institucional em botoes, mas nem sempre com contraste AA quando combinado com texto branco.

## Preview

Abra `preview.html` no navegador para ver navegacao, botoes, formulario, cards e rodape.
