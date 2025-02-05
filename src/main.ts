import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.use(cookieParser());
  app.enableCors({
    origin: [
      "chrome-extension://ophadgignfjigkbdcmicnklokjeknnbd",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  });
  const config = new DocumentBuilder()
    .setTitle("Copyyt")
    .setDescription("Copyyt Apis")
    .setVersion("1.0")
    .addBearerAuth() // Add this line for Bearer Authentication
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, documentFactory);
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
