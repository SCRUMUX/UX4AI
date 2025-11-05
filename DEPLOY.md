# Deploying UX4AI to GitHub Pages

## Prerequisites
- GitHub account and a new repository (e.g. `ux4ai`)
- Git installed locally

## One-time project setup

```bash
# In project root
git init
git add .
git commit -m "Initial commit: UX4AI"
# Add your repo URL
git branch -M main
git remote add origin https://github.com/<your-username>/ux4ai.git
```

## Push to GitHub
```bash
git push -u origin main
```

## Enable GitHub Pages
1. Open your repo on GitHub → Settings → Pages
2. Source: `Deploy from a branch`
3. Branch: `main` and `/ (root)`
4. Save. GitHub will publish to `https://<your-username>.github.io/ux4ai/`

Note: This is a static site, no build step required. The entry is `index-final.html`.

## Optional: Use `/docs` as Pages source
If you prefer Pages to serve from `/docs`, copy or move `index-final.html` and assets under `docs/` and set Pages source to `main /docs`.

## Local preview
```bash
# Using serve (Node)
npx --yes serve -l 5173 .
# Then open http://localhost:5173/index-final.html
```

## FAQ
- Custom domain: configure under Settings → Pages → Custom domain, and add DNS `CNAME`.
- 404 handling: add a `404.html` at root if needed.

