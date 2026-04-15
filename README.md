# Adaptly

Simple full-stack roadmap app with auth, MySQL storage, and AI-generated learning roadmaps.

## Stack

- Node.js + Express
- MySQL (`mysql2`)
- Session auth (`express-session`)
- Groq API for roadmap generation
- Vanilla HTML/CSS/JS frontend in `public/`

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Create your env file:

```bash
cp .env.example .env
```

3. Fill in required values in `.env`:

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_PORT`
- `DB_NAME`
- `GROQ_API_KEY`
- `SESSION_SECRET`

4. Start the server:

```bash
npm run dev
```

The app runs on `http://localhost:3000` by default.

## Scripts

- `npm start` - start server
- `npm run dev` - start server (same command for now)

## Project layout

```text
backend/
  server.js
  database.js
  auth.js
  controllers/
  routes/
  services/
public/
  *.html, *.css, *.js
```

## Notes

- Tables are created automatically on startup.
- Static frontend files are served from `public/`.
- API routes are mounted under `/api`, auth routes under `/auth`, and roadmap routes under `/roadmap`.
