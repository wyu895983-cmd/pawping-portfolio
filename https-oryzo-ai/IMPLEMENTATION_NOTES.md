# PawPing Interactive Portfolio

## Current runnable version

The active preview is the static implementation:

- `index.html`
- `styles.css`
- `script.js`
- `assets/`

It opens directly in a browser and uses only PawPing portfolio/PNG assets supplied by the user.

## Next.js migration target

`package.json` contains the requested stack:

- Next.js
- React
- TailwindCSS
- GSAP and `@gsap/react`
- Framer Motion
- Lenis
- Three.js / React Three Fiber / Drei
- lucide-react
- clsx
- tailwind-merge

Install when npm is available:

```bash
npm install
npm run dev
```

## Asset rules

Do not generate new brand visuals. Use:

- `assets/source/` for user-supplied transparent PNG and poster assets.
- `assets/pawping-portfolio.png` for the original full portfolio board.
- `assets/asset-*.png` for portfolio-derived slices used before the new source PNGs were supplied.

## Interaction logic

- Loading reveal: `loader`
- Cursor interaction: `.cursor`
- Text reveal: `splitTextElement()` and `animateTextElement()`
- Scroll reveal: `IntersectionObserver`
- Hero parallax: `mousemove` + scroll offset
- Horizontal drag: `.horizontal-wrap` pointer events
- Modal preview: `[data-modal]`
- Character switch: `dogSources`
