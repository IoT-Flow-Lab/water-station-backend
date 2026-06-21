import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create the Express HTTP web application
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe to validate incoming payloads for both HTTP and MQTT
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Connect the MQTT client as a microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.MQTT,
    options: {
      url: 'mqtt://broker.hivemq.com:1883',
      clean: true,
      subscribeOptions: {
        qos: 1,
      },
    },
  });

  // Start the microservices (MQTT connection and subscription)
  await app.startAllMicroservices();
  logger.log('MQTT Microservice connection established and listening.');

  // Start listening for standard HTTP requests
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`HTTP backend application running on: http://localhost:${port}`);
}
bootstrap();
