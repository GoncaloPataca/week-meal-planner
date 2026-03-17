# Vite Hello World (deploy to GitHub Pages)

Minimal Vite app that builds to `docs/` so you can serve it with GitHub Pages.

Quick start:

```bash
# install deps
npm install

# run dev server
npm run dev

# build static site into docs/
npm run build
```

To publish on GitHub Pages (serve from `docs/` on `main`):

1. Create a new GitHub repository (e.g. `my-repo`).
2. Add remote and push:

```bash
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

3. Build and commit `docs` (or add `docs` to commits):

```bash
npm run build
git add docs
git commit -m "chore: build site"
git push origin main
```

4. In GitHub, go to Settings → Pages and set Source to `main` branch and `/docs` folder. Save.

Alternative automated deploy (optional):

- Install `gh-pages` and add a `deploy` script:

```bash
npm install --save-dev gh-pages
# in package.json add: "deploy": "gh-pages -d docs"
npm run build
npm run deploy
```
