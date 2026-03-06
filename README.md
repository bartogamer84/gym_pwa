# Gym PWA with Stripe Payments

Esta es una Progressive Web App (PWA) para rutinas de gimnasio, ahora integrada con Stripe para pagos.

## Configuración de Stripe

1. Regístrate en [Stripe](https://stripe.com).
2. Obtén tus claves de API en el dashboard de Stripe (modo test).
3. Configura las variables de entorno en Vercel:
   - `STRIPE_SECRET_KEY`: Tu clave secreta de Stripe.
   - `STRIPE_WEBHOOK_SECRET`: El secreto del webhook (configúralo en Stripe dashboard apuntando a `/api/webhook`).
   - `OPENROUTER_KEY`: Tu clave de OpenRouter (ya existente).

4. En `app.js`, reemplaza `'pk_test_...'` con tu publishable key de Stripe.

## Instalación y Despliegue

1. Instala dependencias: `npm install`
2. Despliega en Vercel: `vercel --prod`

## Uso

- La app permite crear y gestionar rutinas de gimnasio.
- Incluye un chatbot con IA para consejos.
- Ahora tiene integración de pagos con Stripe para funcionalidades premium.

## Tarjetas de Prueba

Usa estas tarjetas para probar:
- 4242 4242 4242 4242 (éxito)
- 4000 0000 0000 0002 (requiere autenticación)

## Notas

- Asegúrate de que el dominio esté verificado en Stripe.
- La PWA requiere HTTPS.
- Los webhooks manejan eventos de pago para confirmar transacciones.