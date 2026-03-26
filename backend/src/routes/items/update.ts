import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { items } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

const updateBodySchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  category: z.string().min(2).optional(),
  imageUrls: z.array(z.url()).max(3).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updateItemRoute: FastifyPluginAsyncZod = async (server) => {
  server.put('/items/:id', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Items'],
      summary: 'Editar Item',
      description: 'Edita as informações de um item postado. Apenas o doador original pode realizar esta ação.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      params: z.object({
        id: z.uuid('O ID do item deve ser um UUID válido')
      }),
      body: updateBodySchema,
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
      const updateData = request.body;

      // Se o usuário mandou um body vazio, não fazemos nada
      if (Object.keys(updateData).length === 0) {
        return reply.status(200).send({ message: 'Nenhum dado foi alterado.' });
      }

      //Verifica se o item existe e se pertence ao usuário logado
      const item = await db.query.items.findFirst({
        where: and(
          eq(items.id, id),
          isNull(items.deletedAt)
        )
      });

      if (!item) {
        return reply.status(404).send({ message: 'Item não encontrado ou já foi removido.' });
      }

      if (item.donorId !== userId) {
        return reply.status(403).send({ message: 'Você não tem permissão para editar este item. Apenas o doador original pode modificá-lo.' });
      }

      // Prepara os dados para atualização no formato que o banco espera
      // Precisa converter lat/lng para string se eles vierem no body
      const dataToUpdate: any = { ...updateData };
      if (updateData.latitude !== undefined) {
        dataToUpdate.latitude = updateData.latitude.toString();
      }
      if (updateData.longitude !== undefined) {
        dataToUpdate.longitude = updateData.longitude.toString();
      }

      // 3. Executa o update
      await db.update(items)
        .set(dataToUpdate)
        .where(eq(items.id, id));

      return reply.status(200).send({ message: 'Item atualizado com sucesso!' });

    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      return reply.status(500).send({ message: 'Erro interno ao tentar atualizar o item' });
    }
  });
};


