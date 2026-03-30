import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { verificationRequests, users } from '../../database/schema';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { deleteFirebaseFileByUrl } from '../../services/firebase';

export const analyzeVerificationRoute: FastifyPluginAsyncZod = async (server) => {
  server.patch('/verifications/:id/analyze', {
    onRequest: [authenticateToken, requireAdmin], 
    schema: {
      tags: ['Verifications (LGPD & OCR)'],
      summary: 'Aprovar ou Rejeitar Documentos',
      description: 'Analisa o pedido, dá o selo de verificado e apaga os documentos (LGPD).',
      params: z.object({
        id: z.uuid('ID da solicitação inválido'),
      }),
      body: z.object({
        status: z.enum(['Aprovado_Admin', 'Rejeitado']),
        adminMessage: z.string().optional(), // Motivo em caso de rejeição
      }),
      response: {
        200: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
      }
    }
  }, async (request, reply) => {
    const { id } = request.params;
    const { status, adminMessage } = request.body;

    //Busca a solicitação no banco
    const verification = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, id)
    });

    if (!verification) {
      return reply.status(404).send({ message: 'Solicitação não encontrada.' });
    }

    //Ou faz tudo, ou desfaz tudo se der erro!
    await db.transaction(async (tx) => {
      // Passo A: Atualiza a solicitação com a decisão
      await tx.update(verificationRequests)
        .set({ status, adminMessage, updatedAt: new Date() })
        .where(eq(verificationRequests.id, id));

      // Passo B: Se foi APROVADO, dá o selo para o usuário!
      if (status === 'Aprovado_Admin') {
        await tx.update(users)
          .set({ isVerified: true })
          .where(eq(users.id, verification.userId));
      }
    });

    // ADEQUAÇÃO À LGPD (Apagar os rastros sensíveis em background)
    // Fazemos isso FORA da transação do banco, pois é uma chamada externa (rede).
    // Se o Firebase falhar, o usuário não perde o selo que acabou de ganhar.
    deleteFirebaseFileByUrl(verification.identityDocumentUrl);
    deleteFirebaseFileByUrl(verification.incomeProofUrl);

    return reply.status(200).send({ 
      message: status === 'Aprovado_Admin' 
        ? 'Selo de Verificação concedido com sucesso! Documentos destruídos.' 
        : 'Solicitação rejeitada com sucesso. Documentos destruídos.' 
    });
  });
};