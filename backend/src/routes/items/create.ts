import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { items } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const createItemRoute: FastifyPluginAsyncZod = async (server) => {
  server.post('/items', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Items'],
      summary: 'Cadastrar Doação',
      description: 'Cria um novo item para doação. A localização é convertida automaticamente para Point (PostGIS).',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      body: z.object({
        title: z.string().min(3).max(100),
        description: z.string().max(500).optional(),
        category: z.string(),
        imageUrls: z.array(z.url()).max(3).optional(),
        latitude: z.number(),
        longitude: z.number(),
      }),
      response: {
        201: z.object({
          message: z.string(),
          itemId: z.string().uuid()
        }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { title, description, category, imageUrls, latitude, longitude } = request.body;
      const donorId = request.user.sub;

      // Inserção no Banco usando a função espacial do PostgreSQL
      const [newItem] = await db.insert(items).values({
        donorId,
        title,
        description,
        category,
        imageUrls,
        status: 'Disponível',
        // PostGIS: Converte Long/Lat em um Geometria de Ponto
        location: sql`ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)`,
      }).returning({ id: items.id });

      return reply.status(201).send({
        message: 'Item cadastrado com sucesso!',
        itemId: newItem.id
      });

    } catch (error) {
      console.error('[ITEMS] Erro ao criar item:', error);
      return reply.status(500).send({ message: 'Erro interno ao cadastrar item.' });
    }
  });
};