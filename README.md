# Artemis Descent

A short-session arcade reentry game built with Phaser 4, TypeScript, Vite, and Bun.

## Play

```bash
bun install
bun run dev
```

The dev server runs on `http://localhost:8080`.

## Build

```bash
bun run build
```

## Deploy To GitHub Pages

This repo includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.

1. Push the repository to GitHub.
2. In GitHub, open `Settings > Pages`.
3. Set the source to `GitHub Actions`.
4. Push to the `main` branch.

After the workflow finishes, the game will be available at:

`https://<your-github-username>.github.io/artemis-descent/`

If you publish from a different repository name, the URL path changes to match that repository name.

## Controls

- `Left` / `A`: rotate capsule left
- `Right` / `D`: rotate capsule right
- `Space` / `R` / click on the result screen: restart

## Current Loop

Keep the heat shield facing into the airflow while the atmosphere thickens, instability rises, heat builds, and debris crosses the reentry corridor. Survive until altitude reaches zero.
