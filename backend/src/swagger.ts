import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication): void {
  const isSwaggerEnabled =
    process.env.SWAGGER_ENABLED?.toLowerCase() !== 'false' &&
    process.env.NODE_ENV !== 'production';

  if (!isSwaggerEnabled) {
    return;
  }

  const docsPath = process.env.SWAGGER_PATH ?? 'api/docs';
  const appVersion = process.env.npm_package_version ?? '0.1.0';
  const appDescription =
    process.env.SWAGGER_DESCRIPTION ??
    'Leave request management API for small companies';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('LeaveApp API')
    .setDescription(appDescription)
    .setVersion(appVersion)
    .addTag('health')
    .addTag('staffs')
    .addTag('leave-requests')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(docsPath, app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
    },
  });
}
