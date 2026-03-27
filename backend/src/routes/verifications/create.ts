import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { verificationRequests } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';
import { encryptCpf } from '../../utils/crypto';
import { isValidCPF } from '../../utils/validators-cpf';
import { processOcrInBackground } from '../../services/ocr';

const createVerificationBodySchema = z.object({
  identityDocumentUrl: z.url('A URL do documento de identidade é inválida'),
  incomeProofUrl: z.url('A URL do comprovante de renda é inválida'),
  cpf: z.string()
    .transform(val => val.replace(/[^\d]/g, ''))
    .refine(val => val.length === 11, 'O CPF deve conter exatamente 11 números')
    .refine(val => isValidCPF(val), 'O CPF informado é inválido')
});

export const createVerificationRoute: FastifyPluginAsyncZod = async (server) => {
  server.post('/verifications', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Verificações'],
      summary: 'Enviar ou Reenviar Documentos',
      description: 'Recebe os links e o CPF. Se o usuário tinha um pedido rejeitado, atualiza os dados para nova análise.',
      body: createVerificationBodySchema,
      response: {
        201: z.object({ message: z.string(), requestId: z.uuid() }),
        200: z.object({ message: z.string(), requestId: z.uuid() }),
        400: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const { identityDocumentUrl, incomeProofUrl, cpf } = request.body;
      const userId = request.user.sub; 

      const secureCpf = encryptCpf(cpf);

      // Verifica se já existe um pedido
      const existingRequest = await db.query.verificationRequests.findFirst({
        where: eq(verificationRequests.userId, userId)
      });

      if (existingRequest) {
        if (existingRequest.status === 'Aprovado_Auto' || existingRequest.status === 'Aprovado_Admin') {
          return reply.status(400).send({ message: 'Seu perfil já possui o selo de verificação!' });
        }
        
        if (existingRequest.status === 'Processando_IA' || existingRequest.status === 'Analise_Manual') {
          return reply.status(400).send({ message: 'Você já possui uma solicitação em análise. Aguarde o resultado.' });
        }

        // O FLUXO DE REENVIO (Update)
        if (existingRequest.status === 'Rejeitado') {
          const [updatedRequest] = await db.update(verificationRequests)
            .set({
              encryptedCpf: secureCpf,
              identityDocumentUrl,
              incomeProofUrl,
              status: 'Processando_IA', 
              adminMessage: null, // Limpa a mensagem de rejeição antiga
              updatedAt: new Date()
            })
            .where(eq(verificationRequests.id, existingRequest.id))
            .returning({ id: verificationRequests.id });

          // Aqui é onde chamaremos a função do Tesseract:
          processOcrInBackground(updatedRequest.id, userId, incomeProofUrl);

          return reply.status(200).send({
            message: 'Documentos reenviados com sucesso! Iniciando nova análise.',
            requestId: updatedRequest.id
          });
        }
      }

      // O FLUXO DE PRIMEIRA VEZ (Insert)
      const [newRequest] = await db.insert(verificationRequests).values({
        userId: userId,
        encryptedCpf: secureCpf,
        identityDocumentUrl: identityDocumentUrl,
        incomeProofUrl: incomeProofUrl,
        status: 'Processando_IA' // Prepara para a IA
      }).returning({ id: verificationRequests.id });

      // Aqui também chamaremos a função do Tesseract:
      processOcrInBackground(newRequest.id, userId, incomeProofUrl);

      return reply.status(201).send({
        message: 'Documentos enviados com sucesso! Iniciando processamento.',
        requestId: newRequest.id
      });

    } catch (error) {
      console.error('Erro ao processar solicitação de verificação:', error);
      return reply.status(500).send({ message: 'Erro interno ao tentar processar seus documentos.' });
    }
  });
};