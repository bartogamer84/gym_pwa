import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('STRIPE_SECRET_KEY no está definido');
}

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2023-08-16',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (!stripeSecretKey) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en el entorno' });
  }

  const { amount } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const currency = typeof req.body.currency === 'string' ? req.body.currency.toLowerCase() : 'usd';
    const description = typeof req.body.description === 'string' ? req.body.description : 'Pago GymProgress premium';

    const paymentIntent = await stripe.paymentIntents.create({
      amount, // en centavos
      currency,
      description,
      automatic_payment_methods: { enabled: true },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    const message = error?.message || 'Internal server error';
    res.status(500).json({ error: message });
  }
}
