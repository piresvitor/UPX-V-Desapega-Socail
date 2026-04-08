import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { items, users } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

export const getItemRoute: FastifyPluginAsyncZod = async (server) => {
  server.get('/items/:id', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Items'],
      summary: 'Detalhes de um Item Específico',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/)
      }),
      params: z.object({
        id: z.uuid()
      }),
      response: {
        200: z.object({
          id: z.uuid(),
          title: z.string(),
          description: z.string().nullable().optional(),
          category: z.string(),
          // Garante que se vier nulo do banco, o Zod aceite
          imageUrls: z.array(z.string()).nullable().optional(),
          status: z.string(),
          // ⬇️ MUDANÇA AQUI: Coerção para aceitar número ou string e converter
          latitude: z.coerce.string(), 
          longitude: z.coerce.string(),
          // ⬇️ MUDANÇA AQUI: Aceita Date ou string (ISO)
          createdAt: z.coerce.date(), 
          donor: z.object({
            id: z.uuid(),
            fullName: z.string()
          })
        }),
        403: z.object({ message: z.string(), code: z.string().optional() }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const userId = request.user.sub;

      const item = await db.query.items.findFirst({
        where: and(
          eq(items.id, id),
          isNull(items.deletedAt)
        ),
        with: {
          donor: {
            columns: { id: true, fullName: true }
          }
        }
      });

      if (!item) {
        return reply.status(404).send({ message: 'Item não encontrado.' });
      }

      // ⬇️ DICA DE OURO: Verifique se o donorId existe no item retornado
      // Se o Drizzle não retornar o donorId no findFirst (dependendo do schema), 
      // a comparação 'item.donorId !== userId' pode falhar.

      const [currentUser] = await db.select({ isVerified: users.isVerified })
        .from(users)
        .where(eq(users.id, userId));

      const itemAgeInMs = Date.now() - new Date(item.createdAt).getTime();
      const isUnder24Hours = itemAgeInMs < 24 * 60 * 60 * 1000;

      if (isUnder24Hours && !currentUser?.isVerified && item.donorId !== userId) {
        return reply.status(403).send({ 
          message: 'Este item está em período de exclusividade.',
          code: 'LOCKED_24H' 
        });
      }


      return reply.status(200).send({
        ...item,
        // Extraímos do objeto 'location' que o Drizzle retornou
        // Convertemos para String para bater com o seu schema Zod
        latitude: String(item.location.y), 
        longitude: String(item.location.x),
        createdAt: item.createdAt,
        donor: item.donor
      });

    } catch (error) {
      console.error('Erro ao buscar detalhes do item:', error);
      return reply.status(500).send({ message: 'Erro interno ao buscar o item' });
    }
  });
};