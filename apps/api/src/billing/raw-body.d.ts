// Populated by the content-type parser override in main.ts, read only by
// billing.controller.ts's webhook route to verify the Stripe signature
// against the exact raw bytes (JSON.stringify of the parsed body would not
// byte-for-byte match what Stripe signed).
declare module "fastify" {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}
