# Wikimedia QR Generator

Small AGPL-licensed browser service for generating QR codes for Wikimedia pages, campaign links, event pages, and tools.

The QR code is generated locally in the browser. The service has no runtime dependencies, no backend, and no tracking.

## Features

- Create QR codes for URL, text, email, SMS, WhatsApp, and WiFi payloads.
- Start from ready presets for articles, Commons files, Wikidata items, and campaign links.
- Save, reopen, import, and export custom QR designs from the header toolbar.
- Add an optional center mark from Wikimedia-only logo presets.
- Export QR codes as SVG or PNG with a separate preview size and export resolution.
- Adjust error correction, module shape, quiet zone, solid or gradient color, size, and colors.
- Uses the same compact app shell, control density, and Wikimedia logo approach as the sibling `logo-gen` tool.
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

Wikimedia logo presets are local SVG copies of Wikimedia movement marks sourced from Wikimedia Commons and shared with the sibling `logo-gen` workflow:

- `Wikimedia-logo.svg`
- `Wikipedia-logo-v2.svg`
- `Commons-logo.svg`
- `Wikidata-logo.svg`
- `Wikisource-logo.svg`
- `Wiktionary-logo-v2.svg`
- `MediaWiki-2020-icon.svg`

Use of Wikimedia marks remains subject to Wikimedia trademark policy.
