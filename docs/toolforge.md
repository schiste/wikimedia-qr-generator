# Toolforge Deployment

This app is static: the browser generates QR codes locally, with no server-side code and no runtime package install.

## Targets

- Webservice target: `https://wikimedia-qr-generator.toolforge.org/`
- Static target: `https://tools-static.wmflabs.org/wikimedia-qr-generator/`

The default deploy path uses the webservice target. It syncs the app into `/data/project/wikimedia-qr-generator/public_html` and installs `toolforge/service.template` as `/data/project/wikimedia-qr-generator/service.template`.

## Deploy

Run a dry run first:

```sh
TOOLFORGE_SSH_KEY=~/.ssh/toolforge npm run deploy:toolforge:dry-run
```

Deploy without restarting the service:

```sh
TOOLFORGE_SSH_KEY=~/.ssh/toolforge npm run deploy:toolforge
```

Deploy and restart or start the webservice:

```sh
TOOLFORGE_SSH_KEY=~/.ssh/toolforge npm run deploy:toolforge:restart
```

If your SSH login is not `schiste`, set it explicitly:

```sh
TOOLFORGE_LOGIN=your-wikitech-login TOOLFORGE_SSH_KEY=~/.ssh/toolforge npm run deploy:toolforge:restart
```

To deploy only to the direct static hosting path:

```sh
TOOLFORGE_TARGET=static TOOLFORGE_SSH_KEY=~/.ssh/toolforge npm run deploy:toolforge
```

## Manual Webservice Commands

If you deploy without `--restart`, start or restart the service from Toolforge:

```sh
ssh -i ~/.ssh/toolforge schiste@login.toolforge.org
become wikimedia-qr-generator
toolforge webservice restart
toolforge webservice status
```

Use `toolforge webservice start` instead of `restart` if the service has not been started before.

## Notes

- Keep private keys and Toolforge credentials outside the repository.
- `robots.txt` is included so Toolforge does not fall back to its default crawler-denying response.
- `/healthz` is included for the HTTP health check configured in `toolforge/service.template`.
