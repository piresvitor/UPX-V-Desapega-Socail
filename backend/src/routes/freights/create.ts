import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, isNull, sql } from 'drizzle-orm'; // IMPORTANTE: Adicionamos o 'sql' aqui
import { db } from '../../database/cliente';
import { items, freightRequests } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

const createFreightBodySchema = z.object({
  itemId: z.string().uuid('O ID do item deve ser um UUID válido'),
  destinationLat: z.number({ message: 'Latitude de destino é obrigatória' }),
  destinationLng: z.number({ message: 'Longitude de destino é obrigatória' }),
});

export const createFreightRoute: FastifyPluginAsyncZod = async (server) => {
  server.post('/freights', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Fretes'],
      summary: 'Solicitar Frete Solidário',
      description: 'Cria um pedido de frete. O usuário logado será o beneficiário e sua localização atual será o destino.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      body: createFreightBodySchema,
      response: {
        201: z.object({ 
          message: z.string(),
          freightId: z.string().uuid()
        }),
        400: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { itemId, destinationLat, destinationLng } = request.body;
      const beneficiaryId = request.user.sub; 

      // Verifica se o item realmente existe e não foi deletado
      const item = await db.query.items.findFirst({
        where: and(
          eq(items.id, itemId),
          isNull(items.deletedAt)
        )
      });

      if (!item) {
        return reply.status(404).send({ message: 'Item não encontrado ou indisponível.' });
      }

      if (item.donorId === beneficiaryId) {
        return reply.status(400).send({ message: 'Você não pode solicitar frete para um item que você mesmo está doando.' });
      }

      // Trava Anti-Spam
      const existingRequest = await db.query.freightRequests.findFirst({
        where: and(
          eq(freightRequests.itemId, itemId),
          eq(freightRequests.beneficiaryId, beneficiaryId),
          eq(freightRequests.status, 'Pendente')
        )
      });

      if (existingRequest) {
        return reply.status(400).send({ message: 'Você já possui uma solicitação de frete pendente para este item.' });
      }

      // =======================================================================
      // A MÁGICA DO POSTGIS: Salvando o destino (Longitude primeiro, depois Latitude)
      // =======================================================================
      const [newFreight] = await db.insert(freightRequests).values({
        itemId: itemId,
        beneficiaryId: beneficiaryId,
        status: 'Pendente',
        destinationLocation: sql`ST_MakePoint(${destinationLng}, ${destinationLat})`
      }).returning({ id: freightRequests.id });

      return reply.status(201).send({
        message: 'Solicitação de frete criada com sucesso! Agora ela está visível para os motoristas parceiros.',
        freightId: newFreight.id
      });

    } catch (error) {
      console.error('Erro ao solicitar frete:', error);
      return reply.status(500).send({ message: 'Erro interno ao tentar criar a solicitação de frete.' });
    }
  });
};