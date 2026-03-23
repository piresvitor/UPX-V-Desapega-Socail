import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../database/cliente'; 
import { users } from '../../database/schema'; 
import { authenticateToken } from '../../middleware/auth';

export const getMeRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/users/me', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Users'],
      summary: 'Get User',
      description: 'Retorna dados do usuário autenticado a partir do token JWT',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      response: {
        200: z.object({
          id: z.string().uuid(),
          fullName: z.string(),
          email: z.email(), 
          role: z.string(),
          isVerified: z.boolean(), 
        }),
        404: z.object({
          message: z.string()
        }),
        500: z.object({
          message: z.string()
        })
      }
    }
  }, async (request, reply) => {
    try {
      // Pega o ID que foi decodificado pelo nosso middleware
      const userId = request.user.sub;

      // Buscar dados do usuário no banco
      const [user] = await db
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          isVerified: users.isVerified,
          deletedAt: users.deletedAt 
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);


      // Agora o user.deletedAt existe e a verificação funciona
      if (!user || user.deletedAt !== null) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      // Retornamos um objeto novo apenas com os dados permitidos no response 200
      return reply.status(200).send({
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      });

    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      return reply.status(500).send({ message: 'Erro interno do servidor' });
    }
  });
};