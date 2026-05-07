# Marcy Massoterapia

Applicazione gestionale per studio di massoterapia con client React/Vite e server Express per pagamenti Stripe.

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

## Environment

Client Vite: configurare `client/.env` partendo da `client/.env.example`.

Server/Docker: configurare `.env` partendo da `.env.example`, senza committare segreti reali.
