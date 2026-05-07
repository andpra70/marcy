const express = require('express');
const path = require('path');
const cors = require('cors');
const stripeClient = require('stripe');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const port = Number(process.env.PORT || 3001);
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? stripeClient(stripeSecretKey) : null;
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const dataPath = process.env.MARCY_DATA_PATH || path.join(__dirname, 'data', 'studios.json');
const sessions = new Map();

function readStudioStore() {
  try {
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch {
    return { studios: [] };
  }
}

function writeStudioStore(store) {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(store, null, 2));
}

function configuredStudios() {
  if (process.env.MARCY_STUDIOS_JSON) {
    return JSON.parse(process.env.MARCY_STUDIOS_JSON);
  }

  return [
    {
      id: process.env.MARCY_STUDIO_ID || 'studio-marcy',
      name: process.env.MARCY_STUDIO_NAME || 'Studio Marcy',
      timezone: process.env.MARCY_STUDIO_TIMEZONE || 'Europe/Rome',
      calendarId: process.env.MARCY_GOOGLE_CALENDAR_ID || 'primary',
      admin: {
        email: process.env.MARCY_ADMIN_EMAIL || 'admin@marcy.local',
        password: process.env.MARCY_ADMIN_PASSWORD || 'admin',
        name: process.env.MARCY_ADMIN_NAME || 'Amministratore',
      },
    },
  ];
}

function getStudioConfigByAdminEmail(email) {
  return configuredStudios().find((studio) => studio.admin.email.toLowerCase() === email.toLowerCase());
}

function matchesSecret(value, expected) {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}

function serializeStudio(studio) {
  return {
    id: studio.id,
    name: studio.name,
    adminEmail: studio.admin.email,
    calendarId: studio.calendarId,
    timezone: studio.timezone,
  };
}

function getPersistedStudioState(studioId) {
  const store = readStudioStore();
  return store.studios.find((studio) => studio.id === studioId)?.appModel ?? null;
}

function savePersistedStudioState(studioId, appModel) {
  const store = readStudioStore();
  const existingIndex = store.studios.findIndex((studio) => studio.id === studioId);
  const nextStudio = {
    id: studioId,
    appModel,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    store.studios[existingIndex] = nextStudio;
  } else {
    store.studios.push(nextStudio);
  }

  writeStudioStore(store);
}

function requireAdminSession(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const session = token ? sessions.get(token) : null;

  if (!session || session.studio.id !== req.params.studioId) {
    res.status(401).send({ error: 'Sessione amministratore non valida' });
    return;
  }

  req.adminSession = session;
  next();
}

app.use(express.json());
app.use(cors());
app.use(express.static(clientDistPath));

app.get('/health', (_req, res) => {
  res.send({ status: 'ok' });
});

app.post('/api/admin/login', (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  const studio = getStudioConfigByAdminEmail(email);

  if (!studio || !matchesSecret(password, studio.admin.password)) {
    res.status(401).send({ error: 'Credenziali amministratore non valide' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    admin: {
      email: studio.admin.email,
      name: studio.admin.name,
    },
    studio: serializeStudio(studio),
  };
  sessions.set(token, session);

  res.send({
    token,
    ...session,
    appModel: getPersistedStudioState(studio.id),
  });
});

app.put('/api/studios/:studioId/state', requireAdminSession, (req, res) => {
  if (!req.body.appModel || typeof req.body.appModel !== 'object') {
    res.status(400).send({ error: 'Stato studio non valido' });
    return;
  }

  savePersistedStudioState(req.params.studioId, {
    ...req.body.appModel,
    studio: req.adminSession.studio,
  });
  res.send({ status: 'saved' });
});

app.post('/create-payment-intent', async (req, res) => {
  const { amount } = req.body;

  if (!stripe) {
    res.status(500).send({ error: 'STRIPE_SECRET_KEY non configurata' });
    return;
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    res.status(400).send({ error: 'Importo non valido' });
    return;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
    });

    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (e) {
    res.status(400).send({ error: e.message });
  }
});

app.get('*splat', (_req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});
