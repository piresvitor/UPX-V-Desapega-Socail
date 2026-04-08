import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { and, desc, eq, isNull, or, sql, SQL } from 'drizzle-orm'; 
import { db } from '../../database/cliente';
import { items, users } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth'; 

export const listItemsRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/items', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Items'],
      summary: 'Feed de Doações',
      description: 'Lista os itens disponíveis. Usuários não verificados só veem itens após 24h, a menos que sejam os donos.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      querystring: z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(50).default(10),
        category: z.string().optional(),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        radius: z.coerce.number().default(10000), 
      }),
      response: {
        200: z.array(z.object({
          id: z.uuid(), 
          title: z.string(),
          description: z.string().nullable().optional(),
          category: z.string(),
          imageUrls: z.array(z.string()).nullable().optional(),
          status: z.string(),
          latitude: z.string(), 
          longitude: z.string(),
          createdAt: z.coerce.date(), 
          donor: z.object({
            id: z.uuid(),
            fullName: z.string()
          })
        })),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { page, limit, category, lat, lng, radius } = request.query;
      const userId = request.user.sub;

      const filters: (SQL<unknown> | undefined)[] = [
        isNull(items.deletedAt),       
        isNull(users.deletedAt),      
        eq(items.status, 'Disponível') 
      ];

      if (category) {
        filters.push(eq(items.category, category));
      }

      const [currentUser] = await db.select({ isVerified: users.isVerified })
        .from(users)
        .where(eq(users.id, userId));

      if (!currentUser?.isVerified) {
        filters.push(
          or(
            // Regra 1: O item tem mais de 24 horas
            sql`${items.createdAt} <= NOW() - INTERVAL '24 hours'`,
            // Regra 2: O item foi postado pelo usuário que está olhando o feed
            eq(items.donorId, userId)
          )
        );
      }

      // Busca Geoespacial com PostGIS nativo
      if (lat !== undefined && lng !== undefined) {
        filters.push(sql`
          ST_DistanceSphere(
            ${items.location},
            ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)
          ) <= ${radius}
        `);
      }

      let orderLogic: any[] = [desc(items.createdAt)]; 

      if (lat !== undefined && lng !== undefined) {
        orderLogic = [
          sql`ST_DistanceSphere(${items.location}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)) ASC`,
          desc(items.createdAt) 
        ];
      }

      const availableItems = await db.select({
        id: items.id,
        title: items.title,
        description: items.description,
        category: items.category,
        imageUrls: items.imageUrls,
        status: items.status,
        latitude: sql<string>`ST_Y(${items.location}::geometry)::text`,  
        longitude: sql<string>`ST_X(${items.location}::geometry)::text`, 
        createdAt: items.createdAt,
        donor: {
          id: users.id,
          fullName: users.fullName
        }
      })
      .from(items)
      .innerJoin(users, eq(items.donorId, users.id)) 
      .where(and(...filters))
      .limit(limit)
      .offset((page - 1) * limit)
      .orderBy(...orderLogic);

      return reply.status(200).send(availableItems);

    } catch (error) {
      console.error('Erro ao buscar o feed de doações:', error);
      return reply.status(500).send({ message: 'Erro interno ao buscar itens.' });
    }
  });
};