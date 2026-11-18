# GitHub Pages Deployment Guide

## Overview

`.github/workflows/build-and-deploy.yml` runs checks and builds the static site with GitHub Actions. The build job uses Node.js 20 and the npm cache, installs dependencies, runs Vitest unit tests, builds with Vite (including TypeScript checks), and runs Playwright end-to-end tests with Chromium.

When all checks pass, the workflow uploads `dist/` as a Pages artifact. The deploy job publishes that artifact. The project does not currently define a lint script in `package.json`, so lint is not run.

## Triggers

- Push to `master`: run checks and build, then deploy.
- Pull request targeting `master`: run checks and build only; do not upload the Pages artifact or deploy.

## GitHub repository setup

1. In the repository on GitHub, open **Settings > Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push `.github/workflows/build-and-deploy.yml` to `master`. Confirm the workflow succeeds in the Actions tab and the deployment is published to the `github-pages` environment.

The deploy job has the required `pages: write` and `id-token: write` permissions. The usual URL is `https://<owner>.github.io/<repository>/`. User or organization site repositories use `https://<owner>.github.io/`. A configured custom domain replaces these URLs.

## Build artifact

Vite writes the site to `dist/` with `npm run build`; the workflow publishes its contents:

- `dist/index.html`: application entry point
- `dist/assets/`: bundled JavaScript, CSS, and other assets
- `dist/models/`: model files copied from `public/models/`

The Vite `base: './'` setting keeps asset URLs relative, including when the site is served from a repository subpath.

## Local build and verification

```bash
npm ci
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

Open the URL printed by `npm run preview` (default: `http://localhost:4173`) to inspect the production build. Use `npm run dev` to run the development server instead.

## Troubleshooting

- **Pages returns 404**: Check that the Pages source is **GitHub Actions** and that the workflow for a push to `master` succeeded in the Actions tab.
- **JavaScript or CSS does not load**: Keep Vite's `base` set to `./` and confirm that the artifact contains the contents of `dist/`.
- **The deploy job does not start**: Deployment is limited to pushes to `master`. Pull requests run checks and builds only.
- **Chromium is missing for E2E tests**: Run `npx playwright install --with-deps chromium` in CI or `npx playwright install chromium` locally.
- **A Pages run is waiting**: The `pages` concurrency group prevents overlapping deployments; queued runs proceed after the active run finishes.
