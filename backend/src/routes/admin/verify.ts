import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { verificationRequests, users } from '../../database/schema';
import { authenticateToken, requireAdmin } from '../../middleware/auth';

export const adminVerifyUserRoute: FastifyPluginAsyncZod = async (server) => {
  server.patch('/admin/verifications/:id', {
    //Fastify: Primeiro ele checa o Token, se passar, ele checa se é Admin!
    onRequest: [authenticateToken, requireAdmin], 
    schema: {
      tags: ['Admin'],
      summary: 'Aprovar/Rejeitar Verificação Manual',
      description: 'Permite que um Administrador aprove ou rejeite manualmente um pedido de verificação (LGPD/OCR). Se aprovado, o usuário ganha o selo isVerified.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      params: z.object({
        id: z.uuid({ message: 'ID do pedido inválido.' })
      }),
      body: z.object({
        action: z.enum(['Aprovar', 'Rejeitar'], { message: "A ação deve ser 'Aprovar' ou 'Rejeitar'." }),
        adminMessage: z.string().max(255).optional().nullable() // Opcional (ex: "Foto do RG ilegível")
      }),
      response: {
        200: z.object({ message: z.string() }),
        403: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
        500: z.object({ error: z.string() })
      }
    }
  }, async (request, reply) => {

    const { id: requestId } = request.params;
    const { action, adminMessage } = request.body;

    try {
      // 1. Busca o pedido para saber de qual usuário estamos falando
      const verificationRequest = await db.query.verificationRequests.findFirst({
        where: eq(verificationRequests.id, requestId),
      });

      if (!verificationRequest) {
        return reply.status(404).send({ error: 'Pedido de verificação não encontrado.' });
      }

      if (verificationRequest.status === 'Aprovado_Auto' || verificationRequest.status === 'Aprovado_Admin') {
        return reply.status(403).send({ error: 'Este pedido já foi aprovado anteriormente.' });
      }

      // 2. Abre a Transação para atualizar o pedido E o perfil do usuário juntos
      await db.transaction(async (tx) => {
        const newStatus = action === 'Aprovar' ? 'Aprovado_Admin' : 'Rejeitado';

        // Atualiza o Pedido
        await tx.update(verificationRequests)
          .set({
            status: newStatus,
            adminMessage: adminMessage || null,
            updatedAt: new Date(),
          })
          .where(eq(verificationRequests.id, requestId));

        // Se o Admin aprovou, damos o selo (isVerified = true) para o usuário!
        if (action === 'Aprovar') {
          await tx.update(users)
            .set({ isVerified: true })
            .where(eq(users.id, verificationRequest.userId));
        }
      });

      const msg = action === 'Aprovar' 
        ? 'Usuário aprovado e verificado com sucesso!' 
        : 'Pedido rejeitado e usuário notificado.';

      return reply.status(200).send({ message: msg });

    } catch (error) {
      console.error('[ADMIN] Erro ao processar verificação:', error);
      return reply.status(500).send({ error: 'Erro interno ao processar a decisão do administrador.' });
    }
  });
};