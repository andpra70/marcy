# Marcy Massoterapia

Applicazione gestionale per studio di massoterapia con client React/Vite e server Express per pagamenti Stripe, login amministratore e stato separato per studio.

## Requisiti

- Node.js 20+
- npm
- Docker con Docker Compose

## Sviluppo Locale

Avvio completo in sviluppo:

```bash
./localrun.sh
```

Il client Vite risponde su `http://localhost:5173`, il server API su `http://localhost:3001`.

Credenziali backoffice demo:

- email: `admin@marcy.local`
- password: `admin`

La top bar consente di passare tra `Area utente` e `Backoffice`. Il backoffice richiede il login amministratore sul backend.

## Build Client

```bash
cd client
npm install
npm run build
```

## Produzione Docker

La build Docker compila il client Vite e lo serve dal server Express nello stesso container.

```bash
docker compose up --build
```

Applicazione: `http://localhost:3001`

## Deploy

Build e push dell'immagine:

```bash
./deploy.sh
```

Variabili configurabili:

- `REGISTRY`, default `docker.io/andpra70`
- `IMAGE_NAME`, default `marcy`
- `TAG`, default `latest`
- `PUSH_IMAGE`, default `true`

## Run Immagine Pubblicata

```bash
./run.sh
```

Variabili configurabili:

- `REGISTRY`, default `docker.io/andpra70`
- `IMAGE_NAME`, default `marcy`
- `TAG`, default `latest`
- `CONTAINER_NAME`, default `marcy-app`
- `HOST_PORT`, default `3001`
- `STRIPE_SECRET_KEY`, chiave server Stripe
- `MARCY_ADMIN_EMAIL`, email amministratore studio
- `MARCY_ADMIN_PASSWORD`, password amministratore studio
- `MARCY_ADMIN_NAME`, nome visualizzato amministratore
- `MARCY_STUDIO_ID`, identificativo studio
- `MARCY_STUDIO_NAME`, nome studio
- `MARCY_STUDIO_TIMEZONE`, timezone studio
- `MARCY_GOOGLE_CALENDAR_ID`, calendario Google associato allo studio
- `MARCY_DATA_PATH`, file JSON server per persistere lo stato degli studi

## Environment

Client Vite: configurare `client/.env` partendo da `client/.env.example`.

Server/Docker: configurare `.env` partendo da `.env.example`, senza committare segreti reali.

Per piu studi e amministratori, configurare `MARCY_STUDIOS_JSON` con un array di studi:

```json
[
  {
    "id": "studio-milano",
    "name": "Studio Milano",
    "timezone": "Europe/Rome",
    "calendarId": "primary",
    "admin": {
      "email": "admin@studio.it",
      "password": "password-locale",
      "name": "Admin Studio"
    }
  }
]
```
