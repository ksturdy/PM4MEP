import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyRequest } from "fastify";
import helmet from "@fastify/helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  // bodyParser: false stops Nest from registering its own default
  // application/json parser during app.listen() — without this, that
  // registration collides with the raw-body-capturing parser we add below
  // (Fastify throws FST_ERR_CTP_ALREADY_PRESENT for a second parser on the
  // same content type) since ours is added first.
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ trustProxy: true }),
    { bodyParser: false },
  );

  await app.register(helmet);
  app.enableCors({
    origin: (process.env.WEB_APP_ORIGIN ?? "http://localhost:3000").split(","),
    credentials: true,
  });

  // Stripe webhook signature verification needs the exact raw request
  // bytes, but Fastify's default JSON parser fully consumes the body
  // before any route handler runs. Rather than a per-route opt-in plugin,
  // override the default application/json parser once, globally: it still
  // parses JSON exactly as before, it just additionally stashes the raw
  // Buffer on the request for billing.controller.ts's webhook route to
  // read — every other route's req.body is unaffected.
  app.getHttpAdapter().getInstance().addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req: FastifyRequest, body: Buffer, done: (err: Error | null, body?: unknown) => void) => {
      req.rawBody = body;
      try {
        done(null, body.length ? JSON.parse(body.toString("utf8")) : {});
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`pm4mep-api listening on :${port}`);
}

bootstrap();
