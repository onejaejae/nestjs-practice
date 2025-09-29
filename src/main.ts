import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setNestApp } from './setNestApp';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  setNestApp(app);

  const config = new DocumentBuilder()
    .setTitle('NestJS Practice API')
    .setDescription('An API for practicing NestJS concepts')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth('refreshToken')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      requestInterceptor: (req: any) => {
        req.credentials = 'include';
        return req;
      },
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
