# UniCORE frontend

Install dependencies and run the local frontend:

```sh
npm ci
test -e .env.development.local || cp .env.example .env.development.local
npm run dev
```

Vite serves the app at `http://localhost:5173`. Set `VITE_API_BASE_URL` in
`.env.development.local` to `http://localhost:8080/api/v1` to use the local
backend. For the complete backend, MongoDB, Turnstile, authentication, and PDF
setup, see [the local development guide](../universitybackend-/LOCAL_DEVELOPMENT.md).
