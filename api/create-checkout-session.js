// api/create-checkout-session.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { items, cliente, telefono, nit, email, direccion, referencia } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    const line_items = items.map(item => ({
      price_data: {
        currency: 'gtq',
        product_data: { name: item.nombre },
        unit_amount: Math.round(Number(item.precio) * 100),
      },
      quantity: item.cantidad,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: email || undefined,
      success_url: 'https://agromax-web.vercel.app/success.html?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://agromax-web.vercel.app/',
      metadata: {
        cliente: (cliente || 'Cliente Web').substring(0, 450),
        telefono: (telefono || '').substring(0, 100),
        nit: (nit || 'CF').substring(0, 50),
        email: (email || '').substring(0, 100),
        direccion: (direccion || '').substring(0, 450),
        referencia: (referencia || '').substring(0, 200),
      },
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creando sesión:', error);
    res.status(500).json({ error: error.message });
  }
};
