import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { db } from '../database/cliente';
import { verificationRequests, users } from '../database/schema';
import { decryptCpf } from '../utils/crypto';
import { uploadSecureImage } from '../utils/firebaseStorage'; 

const MAX_INCOME_ALLOWED = 1650.00; 

// A FUNÇÃO RECEBE OS BUFFERS (A FOTO NA MEMÓRIA) EM VEZ DE URL
export async function processOcrInBackground(
  requestId: string, 
  userId: string, 
  incomeProofBuffer: Buffer, 
  identityDocumentBuffer: Buffer
) {
  try {
    console.log(`\n[OCR] Iniciando processamento a partir da memória RAM... Pedido: ${requestId}`);

    // ============================================================================
    // PASSO 0: BUSCAR DADOS REAIS DO USUÁRIO PARA ACAREAÇÃO (ANTI-FRAUDE)
    // ============================================================================
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const request = await db.query.verificationRequests.findFirst({ where: eq(verificationRequests.id, requestId) });
    
    if (!user || !request) throw new Error("Usuário ou Pedido não encontrados.");
    
    const realCpf = decryptCpf(request.encryptedCpf); 
    const firstName = user.fullName.split(' ')[0].toUpperCase(); 

    // ============================================================================
    // PASSO 1: PRÉ-PROCESSAMENTO 
    // ============================================================================
    // O Sharp pega a imagem crua da RAM e melhora.
    const processedImageBuffer = await sharp(incomeProofBuffer)
      .resize({ width: 2000, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .threshold(128)
      .toBuffer();

    // ============================================================================
    // PASSO 2: EXTRAÇÃO (Tesseract)
    // ============================================================================
    const worker = await createWorker('por');
    const { data: { text, confidence } } = await worker.recognize(processedImageBuffer);
    await worker.terminate();
    
    const upperText = text.toUpperCase();
    console.log(`[OCR] Leitura concluída. Confiança: ${confidence.toFixed(2)}%`);

    // ============================================================================
    // PASSO 3: VALIDAÇÃO ANTI-FRAUDE E REGRAS DE NEGÓCIO
    // ============================================================================
    let finalStatus: 'Analise_Manual' | 'Aprovado_Auto' | 'Rejeitado' = 'Analise_Manual';
    let extractedIncome: string | null = null;
    let adminMessage: string | null = null;

    // 3.1: O documento pertence a esta pessoa? (Procura o CPF na imagem)
    const cpfsInImage = text.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g);
    
    if (cpfsInImage) {
      const cleanCpfs = cpfsInImage.map(cpf => cpf.replace(/[^\d]/g, ''));
      if (!cleanCpfs.includes(realCpf)) {
        console.log(`[OCR] ALERTA DE FRAUDE: CPF da imagem não bate com o CPF do usuário.`);
        finalStatus = 'Rejeitado';
        adminMessage = 'Documento inválido. O CPF do documento não corresponde ao CPF cadastrado.';
      }
    }

    // 3.2: Só continua a análise se não foi detectada fraude de CPF
    if (finalStatus !== 'Rejeitado') {
      const isCadUnico = upperText.includes('RESUMO DO CADASTRO ÚNICO') || upperText.includes('CADÚNICO');
      const isHolerite = upperText.includes('FOLHA DE PAGAMENTO') || upperText.includes('RECIBO DE SALÁRIO');

      // REGRA DO CADÚNICO
      if (isCadUnico) {
        console.log(`[OCR] Documento identificado como Cadastro Único.`);
        if (upperText.includes(firstName) && confidence > 70) {
          finalStatus = 'Aprovado_Auto';
          adminMessage = 'Aprovado automaticamente via Cadastro Único.';
        } else {
          console.log(`[OCR] Nome não encontrado com clareza no CadÚnico. Enviando para humano.`);
        }
      } 
      
      // REGRA DO HOLERITE
      else if (isHolerite) {
        console.log(`[OCR] Documento identificado como Holerite.`);
        const moneyRegex = /(?:R\$|R \$|RS|R\$ )?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/g;
        const matches = [...text.matchAll(moneyRegex)];

        if (matches.length > 0) {
          const values = matches.map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')));
          const highestValue = Math.max(...values);
          extractedIncome = highestValue.toString();
          console.log(`[OCR] Maior valor encontrado: R$ ${highestValue}`);

          if (highestValue > 0 && highestValue <= MAX_INCOME_ALLOWED && confidence > 70) {
             finalStatus = 'Aprovado_Auto';
             adminMessage = 'Aprovado automaticamente pela IA (Renda compatível).';
          }
        }
      } else {
         console.log(`[OCR] Tipo de documento não reconhecido. Enviando para humano.`);
      }
    }

    // ============================================================================
    // PASSO 4: O COFRE LGPD E SALVAR NO BANCO (Transação)
    // ============================================================================
    
    let finalIdentityUrl = 'descartado_automaticamente_pela_ia';
    let finalIncomeUrl = 'descartado_automaticamente_pela_ia';

    // PRIVACY BY DESIGN: Se for aprovado, os buffers somem. Se for rejeitado/manual, salva no cofre.
    if (finalStatus === 'Analise_Manual' || finalStatus === 'Rejeitado') {
      console.log(`[LGPD] Salvando imagens no cofre seguro para auditoria humana...`);
      finalIdentityUrl = await uploadSecureImage(identityDocumentBuffer, `verifications/${userId}/rg`);
      finalIncomeUrl = await uploadSecureImage(incomeProofBuffer, `verifications/${userId}/renda`);
    } else {
      console.log(`[LGPD] IA aprovou o usuário. Destruindo imagens da memória RAM (Privacy by Design).`);
    }

    await db.transaction(async (tx) => {
      await tx.update(verificationRequests)
        .set({
          extractedIncome: extractedIncome || 'Não lido/Não aplicável',
          ocrConfidence: `${Math.round(confidence)}%`,
          status: finalStatus,
          adminMessage: adminMessage,
          identityDocumentUrl: finalIdentityUrl, 
          incomeProofUrl: finalIncomeUrl,        
          updatedAt: new Date()
        })
        .where(eq(verificationRequests.id, requestId));

      if (finalStatus === 'Aprovado_Auto') {
        await tx.update(users)
          .set({ isVerified: true })
          .where(eq(users.id, userId));
      }
    });

    console.log(`[OCR] Fluxo finalizado. Resultado final: ${finalStatus}\n`);

  } catch (error) {
    console.error(`[OCR] Erro catastrófico ao ler imagem:`, error);
    
    // Se a IA pifar (imagem corrompida, erro de RAM), salva as imagens e joga para humano
    console.log(`[LGPD] Fallback de Segurança: Enviando para o cofre...`);
    const fallbackRgUrl = await uploadSecureImage(identityDocumentBuffer, `verifications/${userId}/rg_fallback`);
    const fallbackRendaUrl = await uploadSecureImage(incomeProofBuffer, `verifications/${userId}/renda_fallback`);

    await db.update(verificationRequests)
      .set({ 
        status: 'Analise_Manual', 
        identityDocumentUrl: fallbackRgUrl,
        incomeProofUrl: fallbackRendaUrl,
        updatedAt: new Date() 
      })
      .where(eq(verificationRequests.id, requestId));
  }
}