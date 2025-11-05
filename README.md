# UX4AI
Interactive demo site (static)

## Local development

```bash
npx --yes serve -l 5173 .
# then open http://localhost:5173/index-final.html
```

## Deploy to GitHub Pages (quick)

See `DEPLOY.md` for details. TL;DR:

```bash
git init && git add . && git commit -m "init"
git branch -M main
git remote add origin https://github.com/<your-username>/ux4ai.git
git push -u origin main
```

Then enable Pages: Settings → Pages → Source: `main` / `(root)`.
