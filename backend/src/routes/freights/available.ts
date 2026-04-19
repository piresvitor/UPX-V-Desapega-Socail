import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { items, freightRequests, users } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const availableFreightsRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/freights/available', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Fretes'],
      summary: 'Radar de Fretes Disponíveis',
      description: 'Retorna a lista de fretes pendentes.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      querystring: z.object({
        lat: z.coerce.number({ message: 'Latitude deve ser um número' }),
        lng: z.coerce.number({ message: 'Longitude deve ser um número' }),
        radius: z.coerce.number().default(20),
      }),
      response: {
        200: z.array(z.object({
          freightId: z.string(),
          createdAt: z.any(),
          distanceKm: z.number(),
          item: z.object({
            id: z.string(),
            title: z.string(),
            imageUrls: z.array(z.string()).nullable().optional(),
            // Alterado para number para refletir o dado extraído do banco
            latitude: z.number(), 
            longitude: z.number()
          })
        })),
        403: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { lat, lng, radius } = request.query;
      const userId = request.user.sub; 

      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { role: true } 
      });

      if (!currentUser || currentUser.role !== 'Freteiro') {
        return reply.status(403).send({ message: 'Acesso negado. Apenas motoristas (Freteiros) podem acessar.' });
      }

      // =======================================================================
      // POSTGIS: Extraindo X e Y da coluna geometry(Point)
      // =======================================================================
      const rawFreights = await db
        .select({
          freightId: freightRequests.id,
          createdAt: freightRequests.createdAt,
          itemId: items.id,
          itemTitle: items.title,
          itemImageUrls: items.imageUrls,
          // ST_Y = Latitude | ST_X = Longitude
          itemLat: sql<number>`ST_Y(${items.location})`,
          itemLng: sql<number>`ST_X(${items.location})`,
          
          // Calcula a distância diretamente da coluna 'location' contra o ponto do usuário
          distanceKm: sql<number>`CAST(ST_DistanceSphere(
            ${items.location},
            ST_MakePoint(${lng}, ${lat})
          ) / 1000 AS FLOAT)`
        })
        .from(freightRequests)
        .innerJoin(items, eq(freightRequests.itemId, items.id))
        .where(
          and(
            eq(freightRequests.status, 'Pendente'),
            sql`ST_DistanceSphere(
              ${items.location},
              ST_MakePoint(${lng}, ${lat})
            ) <= ${radius * 1000}`
          )
        )
        .orderBy(sql`ST_DistanceSphere(
          ${items.location},
          ST_MakePoint(${lng}, ${lat})
        ) ASC`);

      const formattedFreights = rawFreights.map(f => ({
        freightId: f.freightId,
        createdAt: f.createdAt,
        distanceKm: f.distanceKm,
        item: {
          id: f.itemId,
          title: f.itemTitle,
          imageUrls: f.itemImageUrls,
          latitude: f.itemLat,
          longitude: f.itemLng
        }
      }));

      return reply.status(200).send(formattedFreights);

    } catch (error) {
      console.error('Erro ao buscar fretes disponíveis:', error);
      return reply.status(500).send({ message: 'Erro interno ao carregar o radar de fretes.' });
    }
  });
};