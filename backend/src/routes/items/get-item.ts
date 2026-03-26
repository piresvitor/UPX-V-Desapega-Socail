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
      description: 'Retorna os detalhes completos de um item. Bloqueia o acesso se estiver nas primeiras 24h e o usuário não for verificado.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header required')
      }),
      params: z.object({
        id: z.uuid('O ID do item deve ser um UUID válido')
      }),
      response: {
        200: z.object({
          id: z.uuid(),
          title: z.string(),
          description: z.string().nullable().optional(),
          category: z.string(),
          imageUrls: z.array(z.string()).nullable().optional(),
          status: z.string(),
          latitude: z.string(),
          longitude: z.string(),
          createdAt: z.date(),
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
      const userId = request.user.sub; // Usuário que está tentando ver o item

      // Busca o item no banco de dados
      const item = await db.query.items.findFirst({
        where: and(
          eq(items.id, id),
          isNull(items.deletedAt) // Garante que não foi deletado
        ),
        with: {
          donor: {
            columns: { id: true, fullName: true }
          }
        }
      });

      // Se o item não existir, retorna 404
      if (!item) {
        return reply.status(404).send({ message: 'Item não encontrado ou já foi removido.' });
      }

      // Regra de Negócio: O usuário tem permissão para ver este item agora?
      const [currentUser] = await db.select({ isVerified: users.isVerified })
        .from(users)
        .where(eq(users.id, userId));

      // Calculamos se o item tem menos de 24 horas de vida
      const itemAgeInMs = Date.now() - new Date(item.createdAt).getTime();
      const isUnder24Hours = itemAgeInMs < 24 * 60 * 60 * 1000;

      // Se o item é novo, O usuário NÃO é verificado, e O usuário NÃO é o próprio doador
      if (isUnder24Hours && !currentUser?.isVerified && item.donorId !== userId) {
        return reply.status(403).send({ 
          message: 'Este item está em período de exclusividade (Prioridade Social). Volte mais tarde.',
          code: 'LOCKED_24H' 
        });
      }

      // Se passou em todas as validações de segurança, entrega o item!
      return reply.status(200).send(item);

    } catch (error) {
      console.error('Erro ao buscar detalhes do item:', error);
      return reply.status(500).send({ message: 'Erro interno ao buscar o item' });
    }
  });
};