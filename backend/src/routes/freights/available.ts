
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { items, freightRequests, users } from '../../database/schema'; // <-- Adicionamos users aqui
import { authenticateToken } from '../../middleware/auth';

export const availableFreightsRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/freights/available', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Fretes'],
      summary: 'Radar de Fretes Disponíveis',
      description: 'Retorna a lista de fretes pendentes. Acesso exclusivo para Freteiros.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      querystring: z.object({
        lat: z.coerce.number({ message: 'Latitude deve ser um número' }),
        lng: z.coerce.number({ message: 'Longitude deve ser um número' }),
        radius: z.coerce.number().default(20), // Busca num raio de 20km por padrão
      }),
      response: {
        200: z.array(z.object({
          freightId: z.uuid(),
          createdAt: z.date(),
          distanceKm: z.number(),
          item: z.object({
            id: z.uuid(),
            title: z.string(),
            imageUrls: z.array(z.string()).nullable().optional(),
            latitude: z.string(),
            longitude: z.string()
          })
        })),
        403: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { lat, lng, radius } = request.query;
      const userId = request.user.sub; // Pega o ID de quem está tentando ver o radar

      // TRAVA DE ACESSO: Verifica o papel (role) do usuário no banco de dados
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { role: true } // Trazemos apenas a coluna role para economizar memória
      });

      // Se não for Freteiro
      if (!currentUser || currentUser.role !== 'Freteiro') {
        return reply.status(403).send({ message: 'Acesso negado. Apenas motoristas (Freteiros) podem acessar o radar de entregas.' });
      }

      // Cálculo de rota
      const availableFreights = await db
        .select({
          freightId: freightRequests.id,
          createdAt: freightRequests.createdAt,
          item: {
            id: items.id,
            title: items.title,
            imageUrls: items.imageUrls,
            latitude: items.latitude,
            longitude: items.longitude,
          },
          distanceKm: sql<number>`CAST(ST_DistanceSphere(
            ST_MakePoint(${items.longitude}, ${items.latitude}),
            ST_MakePoint(${lng}, ${lat})
          ) / 1000 AS FLOAT)`
        })
        .from(freightRequests)
        .innerJoin(items, eq(freightRequests.itemId, items.id))
        .where(
          and(
            eq(freightRequests.status, 'Pendente'),
            sql`ST_DistanceSphere(
              ST_MakePoint(${items.longitude}, ${items.latitude}),
              ST_MakePoint(${lng}, ${lat})
            ) <= ${radius * 1000}`
          )
        )
        .orderBy(sql`ST_DistanceSphere(
          ST_MakePoint(${items.longitude}, ${items.latitude}),
          ST_MakePoint(${lng}, ${lat})
        ) ASC`);

      return reply.status(200).send(availableFreights);

    } catch (error) {
      console.error('Erro ao buscar fretes disponíveis:', error);
      return reply.status(500).send({ message: 'Erro interno ao carregar o radar de fretes.' });
    }
  });
};