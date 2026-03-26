import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { and, desc, eq, isNull, sql, SQL } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { items, users } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth'; 

export const listItemsRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/items', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Items'],
      summary: 'Feed de Doações',
      description: 'Lista os itens disponíveis. Usuários não verificados só veem itens após 24h. Suporta busca geoespacial por raio e ordena por proximidade.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      querystring: z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(50).default(10),
        category: z.string().optional(),
        lat: z.coerce.number().optional(),
        lng: z.coerce.number().optional(),
        radius: z.coerce.number().default(10000), // Raio padrão: 10km (10000 metros)
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
          createdAt: z.date(),
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

      // Iniciar o array de filtros
      const filters: (SQL<unknown> | undefined)[] = [
        isNull(items.deletedAt), // Ignora itens apagados (Soft Delete)
        eq(items.status, 'Disponível') // Traz apenas o que ainda pode ser doado
      ];

      // Filtro de Categoria
      if (category) {
        filters.push(eq(items.category, category));
      }

      // Trava de 24h para Prioridade Social
      const [currentUser] = await db.select({ isVerified: users.isVerified })
        .from(users)
        .where(eq(users.id, userId));

      if (!currentUser?.isVerified) {
        filters.push(sql`${items.createdAt} <= NOW() - INTERVAL '24 hours'`);
      }

      // Busca Geoespacial: PostGIS ST_DistanceSphere (Apenas itens dentro do raio)
      if (lat !== undefined && lng !== undefined) {
        filters.push(sql`
          ST_DistanceSphere(
            ST_MakePoint(${items.longitude}::numeric, ${items.latitude}::numeric),
            ST_MakePoint(${lng}, ${lat})
          ) <= ${radius}
        `);
      }


      let orderLogic: any[] = [desc(items.createdAt)]; // Padrão: mais recentes primeiro

      // Se o usuário mandou o GPS, priorizamos a distância!
      if (lat !== undefined && lng !== undefined) {
        orderLogic = [
          sql`ST_DistanceSphere(
            ST_MakePoint(${items.longitude}::numeric, ${items.latitude}::numeric),
            ST_MakePoint(${lng}, ${lat})
          ) ASC`, // ASC = Do mais perto (menor distância) para o mais longe
          desc(items.createdAt) // Desempate: Se a distância for igual, mostra o mais novo
        ];
      }

      // Consulta final
      const availableItems = await db.query.items.findMany({
        where: and(...filters),
        limit: limit,
        offset: (page - 1) * limit,
        orderBy: orderLogic,
        with: {
          donor: {
            columns: {
              id: true,
              fullName: true
            }
          }
        }
      });

      return reply.status(200).send(availableItems);

    } catch (error) {
      console.error('Erro ao buscar o feed de doações:', error);
      return reply.status(500).send({ message: 'Erro interno ao buscar itens.' });
    }
  });
};