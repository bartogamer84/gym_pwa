import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
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
      payment_method_types: ['card'],
      description,
      automatic_payment_methods: { enabled: true },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}