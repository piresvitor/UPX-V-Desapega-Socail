import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { verify } from 'argon2';
import { db } from '../../database/cliente';
import { users } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const deleteMeRoute: FastifyPluginAsyncZod = async (server) => {
  server.delete('/users/me', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Users'],
      summary: 'Delete User (Soft Delete)',
      description: 'Desativa a conta do usuário autenticado mediante confirmação de senha.',
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

      //Verificar se o usuário existe e se já não foi deletado
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // Se não existir OU se a coluna deletedAt já estiver preenchida
      if (!existingUser || existingUser.deletedAt !== null) {
        return reply.status(404).send({ message: 'Usuário não encontrado ou já excluído' });
      }

      // Verificar se a senha confere com o hash do banco
      const isPasswordValid = await verify(existingUser.passwordHash, password);
      
      if (!isPasswordValid) {
        return reply.status(403).send({ message: 'Senha incorreta. Não foi possível excluir a conta.' });
      }

      // Aplicar o Soft Delete
      // Em vez de "db.delete()", nós fazemos um update na data de exclusão
      await db
        .update(users)
        .set({ deletedAt: new Date() })
        .where(eq(users.id, userId));

      return reply.status(200).send({ message: 'Sua conta foi desativada com sucesso.' });

    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      return reply.status(500).send({ message: 'Erro interno do servidor' });
    }
  });
};