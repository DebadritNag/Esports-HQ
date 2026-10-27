import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

/**
 * OpenAPI documentation via @fastify/swagger + swagger-ui, wired to the Zod
 * type provider so route schemas are converted to JSON Schema. The generated
 * document is available at `/docs/json` and the UI at `/docs`.
 */
async function swaggerPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Free Fire Esports HQ API',
        description: 'HTTP API for the Free Fire Esports HQ backend.',
        version: '0.1.0',
      },
      servers: [{ url: '/' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });
}

export default fp(swaggerPlugin, {
  name: 'swagger',
  fastify: '4.x',
});
