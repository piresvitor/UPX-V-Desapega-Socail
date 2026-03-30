import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../database/cliente'; 
import { users } from '../../database/schema'; 
import { authenticateToken } from '../../middleware/auth';

export const getPublicProfileRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/users/:id', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Users'],
      summary: 'Get Public Profile',
      description: 'Retorna os dados públicos de um usuário pelo ID (para exibir o perfil antes de uma doação/frete).',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      params: z.object({
        id: z.uuid({ message: 'ID do usuário inválido.' })
      }),
      response: {
        200: z.object({
          id: z.string().uuid(),
          fullName: z.string(),
          role: z.string(),
          isVerified: z.boolean(),
          ratingAverage: z.string(),
          ratingCount: z.string()
        }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const targetUserId = request.params.id;

      const [user] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          role: users.role,
          isVerified: users.isVerified,
          ratingAverage: users.ratingAverage, 
          ratingCount: users.ratingCount,     
          deletedAt: users.deletedAt 
        })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (!user || user.deletedAt !== null) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      return reply.status(200).send({
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        isVerified: user.isVerified,
        ratingAverage: user.ratingAverage,
        ratingCount: user.ratingCount
      });

    } catch (error) {
      console.error('Erro ao buscar perfil público do usuário:', error);
      return reply.status(500).send({ message: 'Erro interno do servidor' });
    }
  });
};