// api/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { items, cliente } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Convertir productos del carrito al formato de Stripe
    const line_items = items.map(item => ({
      price_data: {
        currency: 'gtq', // Quetzales
        product_data: {
          name: item.nombre,
        },
        unit_amount: Math.round(item.precio * 100), // Stripe usa centavos
      },
      quantity: item.cantidad,
    }));

    // Crear la sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: line_items,
      mode: 'payment',
      success_url: 'https://agromax-web.vercel.app/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://agromax-web.vercel.app/',
      metadata: {
        cliente: cliente || 'Cliente Web',
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creando sesión:', error);
    res.status(500).json({ error: error.message });
  }
};
