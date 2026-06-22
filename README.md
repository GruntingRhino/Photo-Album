# Field Notes Album

A binder-style photo album site with a bright cream, nature-led scrapbook aesthetic.

## What it does

- Create multiple albums
- Rename albums
- Add photo memory cards with titles and captions
- Delete memory cards
- Save data in two modes:
  - Neon mode when `DATABASE_URL` is configured
  - browser local storage fallback when the API is unavailable

## Project files

- `index.html` — layout
- `styles.css` — binder + paper aesthetic
- `app.js` — front-end state, uploads, persistence fallback
- `api/albums.js` — album CRUD for Neon
- `api/memories.js` — memory CRUD for Neon
- `server.js` — local dev server

## Run locally

1. Copy `.env.example` to `.env`
2. Add your Neon connection string as `DATABASE_URL`
3. Run:

```bash
npm install
DATABASE_URL='your-connection-string' npm start
```

Then open `http://localhost:3000`

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo into Vercel
3. Add `DATABASE_URL` in Vercel Project Settings → Environment Variables
4. Deploy

## Notes

This version stores uploaded images as compressed base64 strings in Postgres for a simple all-in-one pattern. That is fine for a personal photo album or small collections. If you expect lots of large images, the next upgrade would be moving image binaries to object storage and keeping only URLs in Neon.
