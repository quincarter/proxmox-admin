import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { WsAdapter } from "@nestjs/platform-ws";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
  });

  app.setGlobalPrefix("api");

  // Enable raw WebSocket support (used by the SSH terminal gateway at /ws/ssh)
  app.useWebSocketAdapter(new WsAdapter(app));

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS_ORIGIN may be a comma-separated list of allowed origins so that
  // the same image works for local dev (http://localhost:5173), the
  // docker --full stack (http://localhost:5173), and the Caddy HTTPS proxy
  // (https://localhost) without rebuilding.
  const rawOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
  const allowedOrigins = rawOrigin.split(",").map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  await app.listen(port);
  console.log(`Proxmox Admin BFF listening on http://localhost:${port}/api`);
}

bootstrap();
