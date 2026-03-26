import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { freightRequests } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

const updateFreightStatusParamsSchema = z.object({
  id: z.string().uuid('O ID do frete deve ser um UUID válido'),
});

const updateFreightStatusBodySchema = z.object({
  // Garante que o frontend só mande os status permitidos pelo Enum do banco
  status: z.enum(['Em Trânsito', 'Finalizado']),
});

export const updateFreightStatusRoute: FastifyPluginAsyncZod = async (server) => {
  server.patch('/freights/:id/status', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Fretes'],
      summary: 'Atualizar Status da Corrida',
      description: 'O Freteiro atualiza o andamento da entrega (Em Trânsito ou Finalizado).',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      params: updateFreightStatusParamsSchema,
      body: updateFreightStatusBodySchema,
      response: {
        200: z.object({ 
          message: z.string(),
          newStatus: z.string()
        }),
        400: z.object({ message: z.string() }),
        403: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const { status } = request.body;
      const userId = request.user.sub; // O motorista logado

      //Busca a solicitação de frete
      const freight = await db.query.freightRequests.findFirst({
        where: eq(freightRequests.id, id)
      });

      if (!freight) {
        return reply.status(404).send({ message: 'Solicitação de frete não encontrada.' });
      }

      // Trava de Segurança: Apenas o freteiro dono dessa corrida pode mudar o status
      if (freight.freighterId !== userId) {
        return reply.status(403).send({ message: 'Acesso negado. Apenas o motorista responsável por este frete pode alterar seu status.' });
      }

      // Regra de Negócio: Não permite alterar status de uma corrida já finalizada
      if (freight.status === 'Finalizado') {
        return reply.status(400).send({ message: 'Esta corrida já foi finalizada e não pode ser alterada.' });
      }

      // Atualiza o status no banco de dados
      const [updatedFreight] = await db.update(freightRequests)
        .set({ status })
        .where(eq(freightRequests.id, id))
        .returning({ status: freightRequests.status });

      return reply.status(200).send({
        message: `Status do frete atualizado com sucesso para: ${updatedFreight.status}`,
        newStatus: updatedFreight.status
      });

    } catch (error) {
      console.error('Erro ao atualizar status do frete:', error);
      return reply.status(500).send({ message: 'Erro interno ao tentar atualizar a corrida.' });
    }
  });
};