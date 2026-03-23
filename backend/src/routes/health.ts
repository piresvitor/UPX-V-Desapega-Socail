// src/routes/health.ts
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';

export const healthRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/health', {
    schema: {
      tags: ['System'],
      summary: 'Health Check',
      description: 'Verifica o status e o tempo de atividade da API',
      response: {
        200: z.object({
          status: z.string(),
          timestamp: z.string(),
          project: z.string(),
        }),
      },
    },
  }, async (request, reply) => {
    return reply.status(200).send({
      status: 'online',
      timestamp: new Date().toISOString(),
      project: 'UPX 5',
    });
  });
};