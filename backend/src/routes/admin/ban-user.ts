import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { users } from '../../database/schema';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

export const adminBanUserRoute: FastifyPluginAsyncZod = async (server) => {
  server.patch('/admin/users/:id/ban', {
    onRequest: [authenticateToken, requireAdmin],
    schema: {
      tags: ['Admin'],
      summary: 'Banir ou Restaurar Usuário (Soft Delete)',
      description: 'Aplica um soft delete no usuário, preenchendo a data de deletedAt e impedindo-o de usar a plataforma. Também permite restaurar o acesso.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      params: z.object({
        id: z.uuid({ message: 'ID do usuário inválido.' })
      }),
      body: z.object({
        action: z.enum(['Banir', 'Restaurar'], { message: "A ação deve ser 'Banir' ou 'Restaurar'." })
      }),
      response: {
        200: z.object({ message: z.string() }),
        403: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
        500: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {
    const targetUserId = request.params.id;
    const { action } = request.body;
    const adminId = request.user.sub; 

    // Regra de Ouro: O Admin não pode cometer "seppuku"
    if (targetUserId === adminId) {
      return reply.status(403).send({ error: 'Você não pode banir a si mesmo.' });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, targetUserId)
      });

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }

      // Regra de Ouro 2: Um Admin não pode banir outro Admin 
      if (user.role === 'Admin') {
         return reply.status(403).send({ error: 'Não é permitido banir outro administrador.' });
      }

      // Se for banir, coloca a data de hoje. Se for restaurar, coloca NULL.
      const deletedAtValue = action === 'Banir' ? new Date() : null;

      await db.update(users)
        .set({ deletedAt: deletedAtValue })
        .where(eq(users.id, targetUserId));

      const msg = action === 'Banir' 
        ? 'Usuário banido (soft delete) com sucesso.' 
        : 'Acesso do usuário restaurado com sucesso.';

      return reply.status(200).send({ message: msg });

    } catch (error) {
      console.error('[ADMIN] Erro ao banir usuário:', error);
      return reply.status(500).send({ error: 'Erro interno ao alterar o status do usuário.' });
    }
  });
};