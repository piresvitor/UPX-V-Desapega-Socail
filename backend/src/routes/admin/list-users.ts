import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { and, ilike, eq, desc, SQL, or } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { users } from '../../database/schema';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

export const listUsersRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/admin/users', {
    // Proteção dupla: precisa estar logado E ser admin
    onRequest: [authenticateToken, requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Listar Usuários (Admin)',
      description: 'Retorna uma lista paginada de usuários com filtros de busca e cargo.',
      querystring: z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(10),
        search: z.string().optional(),
        role: z.enum(['Doador', 'Beneficiário', 'Freteiro', 'Admin']).optional(),
      }),
      response: {
        200: z.array(z.object({
          id: z.uuid(),
          fullName: z.string(),
          email: z.string(),
          role: z.string(),
          isVerified: z.boolean(),
          ratingAverage: z.string(),
          createdAt: z.date(),
          deletedAt: z.date().nullable(),
        })),
        403: z.object({ message: z.string() }),
        500: z.object({ message: z.string() }),
      },
    },
  }, async (request, reply) => {
    try {
      const { page, limit, search, role } = request.query;

      const filters: (SQL<unknown> | undefined)[] = [];

      // Filtro por Nome ou Email (Busca Insensível a Maiúsculas/Minúsculas)
      if (search) {
        filters.push(
          or(
            ilike(users.fullName, `%${search}%`),
            ilike(users.email, `%${search}%`)
          )
        );
      }

      // Filtro por Cargo
      if (role) {
        filters.push(eq(users.role, role));
      }

      const allUsers = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          isVerified: users.isVerified,
          ratingAverage: users.ratingAverage,
          createdAt: users.createdAt,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(and(...filters))
        .limit(limit)
        .offset((page - 1) * limit)
        .orderBy(desc(users.createdAt));

      return reply.status(200).send(allUsers);

    } catch (error) {
      console.error('[LIST_USERS] Erro ao buscar usuários:', error);
      return reply.status(500).send({ message: 'Erro interno ao listar usuários.' });
    }
  });
};