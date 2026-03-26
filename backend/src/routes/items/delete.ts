import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { items } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const deleteItemRoute: FastifyPluginAsyncZod = async (server) => {
  server.delete('/items/:id', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Items'],
      summary: 'Remover Item (Soft Delete)',
      description: 'Remove um item da plataforma marcando a data de exclusão, mantendo-o no banco para histórico. Apenas o doador pode excluir.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      params: z.object({
        id: z.uuid('O ID do item deve ser um UUID válido')
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
      const { id } = request.params;
      const userId = request.user.sub;

      //Busca o item para validar a existência e a posse
      const item = await db.query.items.findFirst({
        where: and(
          eq(items.id, id),
          isNull(items.deletedAt)
        )
      });

      // Se não achar (ou já tiver sido deletado antes), retorna 404
      if (!item) {
        return reply.status(404).send({ message: 'Item não encontrado ou já foi removido.' });
      }

      // Trava de Segurança: Apenas o dono pode apagar
      if (item.donorId !== userId) {
        return reply.status(403).send({ message: 'Você não tem permissão para excluir este item.' });
      }

      // Aplica o Soft Delete marcando a hora atual
      await db.update(items)
        .set({ deletedAt: new Date() })
        .where(eq(items.id, id));

      return reply.status(200).send({ message: 'Item removido com sucesso da plataforma!' });

    } catch (error) {
      console.error('Erro ao excluir item:', error);
      return reply.status(500).send({ message: 'Erro interno ao tentar remover o item.' });
    }
  });
};