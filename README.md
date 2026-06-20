# Wikimedia QR Generator

Small AGPL-licensed browser service for generating QR codes for Wikimedia pages, campaign links, event pages, and tools.

The QR code is generated locally in the browser. The service has no runtime dependencies, no backend, and no tracking.

## Features

- Build canonical URLs for common Wikimedia projects.
- Paste direct HTTPS links when needed.
- Add an optional center mark from Wikimedia-only logo presets.
- Export QR codes as SVG or PNG with a separate preview size and export resolution.
- Adjust error correction, module shape, quiet zone, solid or gradient color, size, and colors.
- Run as a static site on GitHub Pages, Cloudflare Pages, Netlify, or any simple web host.

## Local Development

```sh
npm run dev
```

Open <http://127.0.0.1:5173/>.

Run the checks:

```sh
npm run check
```

## Repository

Intended GitHub repository: `schiste/wikimedia-qr-generator`.

## Deploying On GitHub Pages

This repository includes a GitHub Pages workflow. After pushing `main` to GitHub, enable Pages for GitHub Actions in the repository settings.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE).

This is a community tool and is not an official Wikimedia Foundation service.

Wikimedia logo presets are local SVG copies of Wikimedia movement marks sourced from Wikimedia Commons:

- `Wikimedia-logo.svg`
- `Commons-logo.svg`
- `Wikidata-logo.svg`

Use of Wikimedia marks remains subject to Wikimedia trademark policy.
