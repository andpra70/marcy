const express = require('express');
const path = require('path');
const cors = require('cors');
const stripeClient = require('stripe');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const port = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? stripeClient(stripeSecretKey) : null;
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
const configuredDataPath = process.env.MARCY_DATA_PATH || path.join(__dirname, 'data', 'studios.json');
const legacyDataPath = path.isAbsolute(configuredDataPath)
  ? configuredDataPath
  : path.resolve(__dirname, '..', configuredDataPath);
const studioDataDir = process.env.MARCY_STUDIO_DATA_DIR
  ? path.resolve(__dirname, '..', process.env.MARCY_STUDIO_DATA_DIR)
  : path.join(__dirname, 'data', 'studios');
const rootStudiosPath = path.join(studioDataDir, 'root-studios.json');
const sessions = new Map();
const rootSessions = new Map();
const studioWriteQueues = new Map();
const apiRoutes = [
  'GET /health',
  'GET /api/routes',
  'POST /api/admin/login',
  'POST /api/root/login',
  'GET /api/root/studios',
  'POST /api/root/studios',
  'PUT /api/root/studios/:studioId',
  'GET /api/studios/:studioId/state',
  'PUT /api/studios/:studioId/state',
  'POST /create-payment-intent',
];

function redactSensitive(value) {
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey.includes('password') || normalizedKey.includes('token') || normalizedKey.includes('secret')) {
        return [key, '[redacted]'];
      }
      return [key, redactSensitive(entryValue)];
    }),
  );
}

function logApi(req, level, message, data = {}) {
  const payload = {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    ...data,
  };
  console[level](`[api] ${message}`, JSON.stringify(redactSensitive(payload)));
}

function readStudioStore() {
  try {
    return JSON.parse(fs.readFileSync(legacyDataPath, 'utf8'));
  } catch {
    return { studios: [] };
  }
}

function readRootStudioStore() {
  try {
    const store = JSON.parse(fs.readFileSync(rootStudiosPath, 'utf8'));
    return {
      studios: Array.isArray(store.studios) ? store.studios.filter(isValidStudioConfig) : [],
    };
  } catch {
    return { studios: [] };
  }
}

function writeRootStudioStore(store) {
  fs.mkdirSync(path.dirname(rootStudiosPath), { recursive: true });
  fs.writeFileSync(rootStudiosPath, JSON.stringify(store, null, 2));
}

function sanitizeFileSegment(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
}

function getStudioStatePath(studioId) {
  return path.join(studioDataDir, `${sanitizeFileSegment(studioId)}.json`);
}

function readStudioStateFile(studioId) {
  try {
    return JSON.parse(fs.readFileSync(getStudioStatePath(studioId), 'utf8')).appModel ?? null;
  } catch {
    return null;
  }
}

async function writeStudioStateFile(studioId, appModel) {
  fs.mkdirSync(studioDataDir, { recursive: true });
  await fs.promises.writeFile(
    getStudioStatePath(studioId),
    JSON.stringify({ studioId, appModel, updatedAt: new Date().toISOString() }, null, 2),
  );
}

function enqueueStudioWrite(studioId, appModel) {
  const previousWrite = studioWriteQueues.get(studioId) ?? Promise.resolve();
  const nextWrite = previousWrite
    .catch(() => {})
    .then(() => writeStudioStateFile(studioId, appModel));

  studioWriteQueues.set(studioId, nextWrite);
  return nextWrite.finally(() => {
    if (studioWriteQueues.get(studioId) === nextWrite) {
      studioWriteQueues.delete(studioId);
    }
  });
}

function isValidStudioConfig(studio) {
  return Boolean(studio?.id && studio?.name && studio?.admin?.email && studio?.admin?.password);
}

function mergeStudios(studios) {
  const mergedStudios = new Map();
  studios.filter(isValidStudioConfig).forEach((studio) => {
    mergedStudios.set(studio.id, studio);
  });
  return Array.from(mergedStudios.values());
}

function defaultConfiguredStudio() {
  return {
    id: process.env.MARCY_STUDIO_ID || 'studio-marcy',
    name: process.env.MARCY_STUDIO_NAME || 'Studio Marcy',
    timezone: process.env.MARCY_STUDIO_TIMEZONE || 'Europe/Rome',
    calendarId: process.env.MARCY_GOOGLE_CALENDAR_ID || 'primary',
    enabled: true,
    subscription: {
      status: 'active',
      yearlyPrice: 50,
      validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
    },
    admin: {
      email: process.env.MARCY_ADMIN_EMAIL || 'admin@marcy.local',
      password: process.env.MARCY_ADMIN_PASSWORD || 'admin',
      name: process.env.MARCY_ADMIN_NAME || 'Amministratore',
    },
  };
}

function configuredStudios() {
  const rootStudios = readRootStudioStore().studios;
  if (process.env.MARCY_STUDIOS_JSON) {
    return mergeStudios([...JSON.parse(process.env.MARCY_STUDIOS_JSON), ...rootStudios]);
  }

  return mergeStudios([defaultConfiguredStudio(), ...rootStudios]);
}

function listConfiguredStudios() {
  return configuredStudios().map((studio) => ({
    ...serializeStudio(studio),
    enabled: studio.enabled !== false,
    subscription: studio.subscription ?? {
      status: 'active',
      yearlyPrice: 50,
      validUntil: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10),
    },
  }));
}

function createRootStudio(values = {}) {
  const store = readRootStudioStore();
  if (!values || typeof values !== 'object') {
    throw new Error('Payload studio non valido');
  }

  const studio = {
    id: sanitizeFileSegment(values.id),
    name: values.name,
    timezone: values.timezone || 'Europe/Rome',
    calendarId: values.calendarId || 'primary',
    enabled: true,
    subscription: {
      status: 'active',
      yearlyPrice: Number(values.yearlyPrice || 50),
      validUntil: values.validUntil,
    },
    admin: {
      email: values.adminEmail,
      password: values.adminPassword,
      name: values.adminName || 'Amministratore',
    },
  };

  if (!studio.id || !studio.name || !studio.admin.email || !studio.admin.password) {
    throw new Error('Dati studio incompleti');
  }

  if (configuredStudios().some((item) => item.id === studio.id || item.admin.email === studio.admin.email)) {
    throw new Error('Studio o amministratore gia esistente');
  }

  store.studios.push(studio);
  writeRootStudioStore(store);
  return studio;
}

function updateRootStudio(studioId, values = {}) {
  if (!values || typeof values !== 'object') {
    throw new Error('Payload aggiornamento studio non valido');
  }
  if (typeof values.enabled !== 'boolean') {
    throw new Error('Campo enabled obbligatorio');
  }

  const store = readRootStudioStore();
  const index = store.studios.findIndex((studio) => studio.id === studioId);
  if (index < 0) {
    const configuredStudio = configuredStudios().find((studio) => studio.id === studioId);
    if (!configuredStudio) throw new Error('Studio non trovato');

    const overrideStudio = {
      ...configuredStudio,
      enabled: values.enabled,
    };
    store.studios.push(overrideStudio);
    writeRootStudioStore(store);
    return overrideStudio;
  }

  store.studios[index] = {
    ...store.studios[index],
    enabled: values.enabled,
  };
  writeRootStudioStore(store);
  return store.studios[index];
}

function getStudioConfigByAdminEmail(email, studioId) {
  return configuredStudios().find((studio) => (
    studio.enabled !== false &&
    studio.admin.email.toLowerCase() === email.toLowerCase() &&
    (!studioId || studio.id === studioId)
  ));
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
  return readStudioStateFile(studioId) ?? readStudioStore().studios.find((studio) => studio.id === studioId)?.appModel ?? null;
}

function savePersistedStudioState(studioId, appModel) {
  return enqueueStudioWrite(studioId, appModel);
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

function requireRootSession(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !rootSessions.has(token)) {
    res.status(401).send({ error: 'Sessione root non valida' });
    return;
  }
  next();
}

app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  const startedAt = Date.now();
  logApi(req, 'info', 'in', {
    body: req.body,
    query: req.query,
  });

  res.on('finish', () => {
    const level = res.statusCode >= 500 ? 'error' : 'info';
    logApi(req, level, 'out', {
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
});
if (isProduction) {
  app.use(express.static(clientDistPath));
}

app.get('/health', (_req, res) => {
  res.send({ status: 'ok' });
});

app.get('/api/routes', (_req, res) => {
  res.send({ routes: apiRoutes });
});

app.post('/api/admin/login', (req, res) => {
  const email = String(req.body.email || '').trim();
  const password = String(req.body.password || '');
  const studioId = String(req.body.studioId || '').trim();
  const studio = getStudioConfigByAdminEmail(email, studioId);

  if (!studio || !matchesSecret(password, studio.admin.password)) {
    res.status(401).send({ error: studioId ? `Credenziali amministratore non valide per ${studioId}` : 'Credenziali amministratore non valide' });
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

app.post('/api/root/login', (req, res) => {
  const username = String(req.body.username || '');
  const password = String(req.body.password || '');
  const expectedUsername = process.env.MARCY_ROOT_USER || 'root';
  const expectedPassword = process.env.MARCY_ROOT_PASSWORD || 'password';

  if (username !== expectedUsername || !matchesSecret(password, expectedPassword)) {
    res.status(401).send({ error: 'Credenziali root non valide' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  rootSessions.set(token, { username });
  res.send({ token, user: { username }, studios: listConfiguredStudios() });
});

app.get('/api/root/studios', requireRootSession, (_req, res) => {
  res.send({ studios: listConfiguredStudios() });
});

app.post('/api/root/studios', requireRootSession, (req, res) => {
  try {
    const studio = createRootStudio(req.body);
    logApi(req, 'info', 'root studio created', {
      studioId: studio.id,
      adminEmail: studio.admin.email,
    });
    res.status(201).send({ studio: serializeStudio(studio), studios: listConfiguredStudios() });
  } catch (error) {
    logApi(req, 'error', 'root studio create failed', {
      error: error.message,
      dataPath: rootStudiosPath,
    });
    res.status(400).send({ error: error.message });
  }
});

app.put('/api/root/studios/:studioId', requireRootSession, (req, res) => {
  try {
    updateRootStudio(req.params.studioId, req.body ?? {});
    logApi(req, 'info', 'root studio updated', {
      studioId: req.params.studioId,
    });
    res.send({ studios: listConfiguredStudios() });
  } catch (error) {
    logApi(req, 'error', 'root studio update failed', {
      studioId: req.params.studioId,
      error: error.message,
      dataPath: rootStudiosPath,
    });
    res.status(400).send({ error: error.message });
  }
});

app.get('/api/studios/:studioId/state', requireAdminSession, (req, res) => {
  const appModel = getPersistedStudioState(req.params.studioId);
  logApi(req, 'info', 'studio state read', {
    studioId: req.params.studioId,
    found: Boolean(appModel),
    dataPath: getStudioStatePath(req.params.studioId),
  });
  res.send({ appModel });
});

app.put('/api/studios/:studioId/state', requireAdminSession, async (req, res) => {
  if (!req.body.appModel || typeof req.body.appModel !== 'object') {
    res.status(400).send({ error: 'Stato studio non valido' });
    return;
  }

  try {
    await savePersistedStudioState(req.params.studioId, {
      ...req.body.appModel,
      studio: req.adminSession.studio,
    });
    logApi(req, 'info', 'studio state saved', {
      studioId: req.params.studioId,
      dataPath: getStudioStatePath(req.params.studioId),
    });
    res.send({ status: 'saved' });
  } catch (error) {
    logApi(req, 'error', 'studio state save failed', {
      studioId: req.params.studioId,
      error: error.message,
      dataPath: getStudioStatePath(req.params.studioId),
    });
    res.status(500).send({ error: `Salvataggio stato studio non riuscito: ${error.message}` });
  }
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

if (isProduction) {
  app.get('*splat', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use((error, req, res, _next) => {
  logApi(req, 'error', 'unhandled error', {
    error: error.message,
    stack: error.stack,
  });
  res.status(500).send({ error: 'Errore interno server' });
});

app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
  console.log(`[api] data paths ${JSON.stringify({ legacyDataPath, studioDataDir, rootStudiosPath })}`);
});
