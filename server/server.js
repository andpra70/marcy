const express = require('express');
const path = require('path');
const cors = require('cors');
const stripeClient = require('stripe');

const app = express();
const port = Number(process.env.PORT || 3001);
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? stripeClient(stripeSecretKey) : null;
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');

app.use(express.json());
app.use(cors());
app.use(express.static(clientDistPath));

app.get('/health', (_req, res) => {
  res.send({ status: 'ok' });
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
