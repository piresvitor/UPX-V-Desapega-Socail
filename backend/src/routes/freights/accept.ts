import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { freightRequests, users } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

const acceptFreightParamsSchema = z.object({
  id: z.uuid('O ID do frete deve ser um UUID válido'),
});

const acceptFreightBodySchema = z.object({
  estimatedPrice: z.number().positive('O valor do frete deve ser positivo').optional(),
});

export const acceptFreightRoute: FastifyPluginAsyncZod = async (server) => {
  server.patch('/freights/:id/accept', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Fretes'],
      summary: 'Aceitar Solicitação de Frete',
      description: 'O Freteiro aceita a corrida. O status muda para "Aceito" e o item some do radar dos outros motoristas.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      params: acceptFreightParamsSchema,
      body: acceptFreightBodySchema,
      response: {
        200: z.object({ 
          message: z.string(),
          freightId: z.uuid()
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
      const { estimatedPrice } = request.body;
      const userId = request.user.sub;

      // TRAVA DE ACESSO: Verifica se o usuário é Freteiro
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { role: true }
      });

      if (!currentUser || currentUser.role !== 'Freteiro') {
        return reply.status(403).send({ message: 'Apenas motoristas (Freteiros) podem aceitar solicitações de entrega.' });
      }

      // Busca a solicitação de frete
      const freight = await db.query.freightRequests.findFirst({
        where: eq(freightRequests.id, id)
      });

      if (!freight) {
        return reply.status(404).send({ message: 'Solicitação de frete não encontrada.' });
      }

      // TRAVA DE CONCORRÊNCIA: Verifica se outro freteiro já pegou essa corrida
      if (freight.status !== 'Pendente') {
        return reply.status(400).send({ message: 'Esta corrida já foi aceita por outro motorista ou foi cancelada.' });
      }

      // O freteiro não pode aceitar um frete onde ele mesmo é o beneficiário
      if (freight.beneficiaryId === userId) {
        return reply.status(400).send({ message: 'Você não pode aceitar sua própria solicitação de frete.' });
      }

      // Atualiza o banco de dados: Vincula o Freteiro, muda o status e salva o preço
      const [updatedFreight] = await db.update(freightRequests)
        .set({
          freighterId: userId,
          status: 'Aceito',
          estimatedPrice: estimatedPrice ? estimatedPrice.toString() : null // Drizzle Decimal recebe string
        })
        .where(
          // Passamos o status 'Pendente' no where para garantir a atomicidade da transação
          and(
            eq(freightRequests.id, id),
            eq(freightRequests.status, 'Pendente')
          )
        )
        .returning({ id: freightRequests.id });

      if (!updatedFreight) {
        return reply.status(400).send({ message: 'Não foi possível aceitar a corrida. Talvez outro motorista tenha sido mais rápido!' });
      }

      return reply.status(200).send({
        message: 'Corrida aceita com sucesso! Entre em contato com o beneficiário.',
        freightId: updatedFreight.id
      });

    } catch (error) {
      console.error('Erro ao aceitar frete:', error);
      return reply.status(500).send({ message: 'Erro interno ao tentar aceitar a corrida.' });
    }
  });
};