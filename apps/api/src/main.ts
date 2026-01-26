import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const port = Number(process.env.PORT ?? 4000);
  
  try {
    logger.log(`Starting application on port ${port}...`);
    const app = await NestFactory.create(AppModule, {
      logger: ["error", "warn", "log"],
    });
    
    app.enableCors({
      origin: true,
      credentials: true,
      allowedHeaders: ["content-type", "x-user-id"],
    });
    
    await app.listen(port);
    logger.log(`🚀 Server running on http://localhost:${port}`);
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error("Bootstrap error:", error);
  process.exit(1);
});
