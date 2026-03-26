import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { items } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

// Validamos para aceitar APENAS os status permitidos pelo nosso sistema
const patchStatusSchema = z.object({
  status: z.enum(['Disponível', 'Reservado', 'Doado', 'Cancelado'] as const, {
    message: "O status deve ser: 'Disponível', 'Reservado', 'Doado' ou 'Cancelado'."
  })
});

export const updateItemStatusRoute: FastifyPluginAsyncZod = async (server) => {
  server.patch('/items/:id/status', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Items'],
      summary: 'Atualizar Status do Item',
      description: 'Modifica rapidamente o status de uma doação. Apenas o doador pode realizar esta ação.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      params: z.object({
        id: z.string().uuid('O ID do item deve ser um UUID válido')
      }),
      body: patchStatusSchema,
      response: {
        200: z.object({ 
          message: z.string(),
          newStatus: z.string()
        }),
        403: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { status } = request.body;
      const userId = request.user.sub;

      // Busca o item para validar a existência e a posse
      const item = await db.query.items.findFirst({
        where: and(
          eq(items.id, id),
          isNull(items.deletedAt)
        )
      });

      if (!item) {
        return reply.status(404).send({ message: 'Item não encontrado ou já foi removido.' });
      }

      // Trava de Segurança: Apenas o dono pode alterar o status
      if (item.donorId !== userId) {
        return reply.status(403).send({ message: 'Você não tem permissão para alterar o status deste item.' });
      }

      // Atualiza apenas o campo status no banco de dados
      await db.update(items)
        .set({ status })
        .where(eq(items.id, id));

      return reply.status(200).send({ 
        message: `Status atualizado com sucesso para '${status}'!`,
        newStatus: status
      });

    } catch (error) {
      console.error('Erro ao atualizar o status do item:', error);
      return reply.status(500).send({ message: 'Erro interno ao tentar atualizar o status.' });
    }
  });
};