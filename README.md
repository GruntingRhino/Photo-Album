# Albums

A simple photo album app with two main views:

- Browse albums from a single home screen
- Open an album and add memory cards to it

## Storage

- Uses Neon/Postgres when `DATABASE_URL` is set
- Falls back to browser local storage when the API is unavailable

## Run locally

1. Copy `.env.example` to `.env`
2. Add your Neon connection string as `DATABASE_URL`
3. Run:

```bash
npm install
npm start
```

Then open `http://localhost:3000`
