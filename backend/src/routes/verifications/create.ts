import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '../../database/cliente';
import { verificationRequests } from '../../database/schema';
import { encryptCpf } from '../../utils/crypto';
import { processOcrInBackground } from '../../services/ocr';
import { isValidCPF } from '../../utils/validators-cpf'; 
import { authenticateToken } from '../../middleware/auth';

// O Zod  repassa o trabalho para a  função de verificação de CPF
const cpfSchema = z.string().refine(isValidCPF, { message: "CPF inválido." });

export async function createVerificationRoute(app: FastifyInstance) {
  
  app.post('/verifications', { preHandler: [authenticateToken] }, async (request, reply) => {
    const userId = request.user.sub;

    let rawCpf = '';
    let identityDocumentBuffer: Buffer | null = null;
    let incomeProofBuffer: Buffer | null = null;

    // Lendo o formulário Multipart (Arquivos recebidos em pedaços pela rede)
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        if (part.fieldname === 'identityDocument') identityDocumentBuffer = buffer;
        if (part.fieldname === 'incomeProof') incomeProofBuffer = buffer;
      } else {
        if (part.fieldname === 'cpf') rawCpf = part.value as string;
      }
    }

    // Validação de Presença: O usuário mandou tudo?
    if (!rawCpf || !identityDocumentBuffer || !incomeProofBuffer) {
      return reply.status(400).send({ 
        message: 'Formulário incompleto. Envie o CPF, a foto do RG e o Comprovante de Renda.' 
      });
    }

    // Valida o CPF com a função especialista acoplada ao Zod
    const result = cpfSchema.safeParse(rawCpf);
    if (!result.success) {
      return reply.status(400).send({ message: result.error.issues[0].message });
    }

    // Criptografia antes de encostar no banco de dados
    const encryptedCpf = encryptCpf(rawCpf);

    // Verifica se já existe um pedido em andamento (Proteção contra Spam)
    const existingRequest = await db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.userId, userId)
    });

    if (existingRequest) {
      if (existingRequest.status === 'Processando_IA' || existingRequest.status === 'Analise_Manual') {
        return reply.status(400).send({ message: 'Você já possui uma solicitação em análise.' });
      }

      if (existingRequest.status === 'Aprovado_Auto' || existingRequest.status === 'Aprovado_Admin') {
        return reply.status(400).send({ message: 'Seu perfil já está verificado.' });
      }

      // FLUXO DE REENVIO (Se foi rejeitado antes)
      if (existingRequest.status === 'Rejeitado') {
        const [updatedRequest] = await db.update(verificationRequests)
          .set({ status: 'Processando_IA', adminMessage: null, updatedAt: new Date() })
          .where(eq(verificationRequests.id, existingRequest.id))
          .returning({ id: verificationRequests.id });

        // IA processando a imagem direto da memória RAM (O Buffer)
        processOcrInBackground(updatedRequest.id, userId, incomeProofBuffer, identityDocumentBuffer);

        return reply.status(200).send({ 
          message: 'Documentos reenviados! Iniciando análise segura.', 
          requestId: updatedRequest.id 
        });
      }
    }

    // FLUXO DE PRIMEIRA VEZ (Insert)
    const [newRequest] = await db.insert(verificationRequests).values({
      userId,
      encryptedCpf,
      status: 'Processando_IA',
      identityDocumentUrl: 'aguardando...', // Isso será preenchido depois, se necessário
      incomeProofUrl: 'aguardando...',      // Isso será preenchido depois, se necessário
    }).returning({ id: verificationRequests.id });

    // IA processando a imagem direto da memória RAM (O Buffer)
    processOcrInBackground(newRequest.id, userId, incomeProofBuffer, identityDocumentBuffer);

    return reply.status(201).send({ 
      message: 'Documentos recebidos em segurança! Iniciando processamento.', 
      requestId: newRequest.id 
    });
  });
}