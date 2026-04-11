import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { verify } from 'argon2';
import { db } from '../../database/cliente';
import { users, items } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const deleteMeRoute: FastifyPluginAsyncZod = async (server) => {
  server.delete('/users/me', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Users'],
      summary: 'Delete User (Soft Delete)',
      description: 'Desativa a conta do usuário autenticado e remove automaticamente suas doações.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      body: z.object({
        password: z.string().min(1, 'A senha é obrigatória para excluir a conta')
      }),
      response: {
        200: z.object({ message: z.string() }),
        403: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.sub;
      const { password } = request.body;

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existingUser || existingUser.deletedAt !== null) {
        return reply.status(404).send({ message: 'Usuário não encontrado ou já excluído' });
      }

      const isPasswordValid = await verify(existingUser.passwordHash, password);
      
      if (!isPasswordValid) {
        return reply.status(403).send({ message: 'Senha incorreta. Não foi possível excluir a conta.' });
      }

      const now = new Date();

      await db.transaction(async (tx) => {
        // 1. Soft Delete no Usuário
        await tx.update(users)
          .set({ deletedAt: now })
          .where(eq(users.id, userId));

        // 2. Soft Delete automático em TODOS os itens deste usuário
        await tx.update(items)
          .set({ deletedAt: now })
          .where(eq(items.donorId, userId));
      });

      return reply.status(200).send({ message: 'Sua conta e itens foram desativados com sucesso.' });

    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      return reply.status(500).send({ message: 'Erro interno do servidor' });
    }
  });
};