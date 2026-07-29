# Source Notes

Extraction date: 2026-07-29

Primary source: https://univassouras.edu.br/fusve/

## What was extracted

- Global Elementor kit colors from `post-7.css`.
- Header/menu layout from Elementor template `post-13284.css`.
- Footer layout and background treatment from Elementor template `post-73.css`.
- Mega/dropdown menu sizing from Elementor template `post-471.css`.
- Floating action affordance from Elementor template `post-5395.css`.
- Typeface from Adobe Typekit kit `xsi3ymn.css`.
- Logos and footer images from the public WordPress uploads paths referenced by the page.

## Original token values observed

```css
--e-global-color-primary: #6D1D20;
--e-global-color-secondary: #54595F;
--e-global-color-text: #7A7A7A;
--e-global-color-accent: #25D366;
--e-global-color-929170d: #FFFFFF;
--e-global-color-6dd461c: #AB8D57;
--e-global-color-76a7e93: #7F7774;
--e-global-color-0de98da: #6D1D20BD;
--e-global-color-2b6d5d3: #EE8837;
--e-global-color-91fb617: #FFBA00;
--e-global-color-2177efc: #333333;
--e-global-color-2951581: #8EC648;
--e-global-color-140ae07: #9B3234;
--e-global-color-311498a: #03647D;
--e-global-color-0ebb92e: #1F3C7A;
--e-global-color-57bfbce: #CE8500;
--e-global-color-0537a23: #20507A;
--e-global-color-2b365b3: #AA2E32;
--e-global-color-b1c88cd: #F3F1F2;
```

## Adaptation notes

- Names were converted from Elementor ids to semantic app tokens.
- The site uses `Museo Sans` via Adobe Typekit. `fonts.css` keeps the original kit import, but production use depends on licensing.
- The original yellow CTA is often paired with white text. This package uses dark text on yellow for better contrast in app UI.
- Border radius is intentionally restrained: 0 to 6px, matching the institutional style.
- The page `/fusve/` itself has almost no body content; the strongest reusable design signal is the global header/footer system.

## Public URLs used

- https://univassouras.edu.br/fusve/
- https://use.typekit.net/xsi3ymn.css
- https://univassouras.edu.br/wp-content/uploads/elementor/css/post-7.css
- https://univassouras.edu.br/wp-content/uploads/elementor/css/post-13284.css
- https://univassouras.edu.br/wp-content/uploads/elementor/css/post-73.css
- https://univassouras.edu.br/wp-content/uploads/elementor/css/post-471.css
- https://univassouras.edu.br/wp-content/uploads/2023/10/Marca-Universidade-de-Vassouras-Horizontal.png
- https://univassouras.edu.br/wp-content/uploads/2021/12/logo_bg_footer.jpg
