import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
import { eq } from 'drizzle-orm';
import { db } from '../database/cliente';
import { verificationRequests, users } from '../database/schema';
import { decryptCpf } from '../utils/crypto';

const MAX_INCOME_ALLOWED = 1650.00; 

export async function processOcrInBackground(requestId: string, userId: string, imageUrl: string) {
  try {
    console.log(`\n[OCR] Iniciando processamento... Pedido: ${requestId}`);

    // PASSO 0: BUSCAR DADOS REAIS DO USUÁRIO PARA ACARÉAÇÃO (ANTI-FRAUDE)
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const request = await db.query.verificationRequests.findFirst({ where: eq(verificationRequests.id, requestId) });
    
    if (!user || !request) throw new Error("Usuário ou Pedido não encontrados.");
    
    const realCpf = decryptCpf(request.encryptedCpf); // Ex: "12345678909"
    const firstName = user.fullName.split(' ')[0].toUpperCase(); // Pega o primeiro nome

    // PASSO 1: PRÉ-PROCESSAMENTO (Sharp)
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`Servidor recusou a imagem. Status: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) throw new Error(`Não é imagem: ${contentType}`);

    const arrayBuffer = await response.arrayBuffer();
    const processedImageBuffer = await sharp(Buffer.from(arrayBuffer))
      .resize({ width: 2000, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .threshold(128)
      .toBuffer();

    // PASSO 2: EXTRAÇÃO (Tesseract)
    const worker = await createWorker('por');
    const { data: { text, confidence } } = await worker.recognize(processedImageBuffer);
    await worker.terminate();
    
    const upperText = text.toUpperCase();
    console.log(`[OCR] Leitura concluída. Confiança: ${confidence.toFixed(2)}%`);

    // PASSO 3: VALIDAÇÃO ANTI-FRAUDE E REGRAS DE NEGÓCIO
    let finalStatus: 'Analise_Manual' | 'Aprovado_Auto' | 'Rejeitado' = 'Analise_Manual';
    let extractedIncome: string | null = null;
    let adminMessage: string | null = null;

    // O documento pertence a esta pessoa? (Procura o CPF na imagem)
    // Regex procura coisas como 123.456.789-00 ou 12345678900
    const cpfsInImage = text.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g);
    
    if (cpfsInImage) {
      const cleanCpfs = cpfsInImage.map(cpf => cpf.replace(/[^\d]/g, ''));
      if (!cleanCpfs.includes(realCpf)) {
        // FRAUDE DETECTADA: Achou um CPF na imagem, mas não é o do usuário!
        console.log(`🚨 [OCR] ALERTA DE FRAUDE: CPF da imagem não bate com o CPF do usuário.`);
        finalStatus = 'Rejeitado';
        adminMessage = 'Documento inválido. O CPF do documento não corresponde ao CPF cadastrado.';
      }
    }

    // Só continua a análise se não foi detectada fraude de CPF
    if (finalStatus !== 'Rejeitado') {
      const isCadUnico = upperText.includes('RESUMO DO CADASTRO ÚNICO') || upperText.includes('CADÚNICO');
      const isHolerite = upperText.includes('FOLHA DE PAGAMENTO') || upperText.includes('RECIBO DE SALÁRIO');

      // REGRA DO CADÚNICO
      if (isCadUnico) {
        console.log(`[OCR] Documento identificado como Cadastro Único.`);
        // Se a IA encontrou o primeiro nome da pessoa na folha do CadÚnico e leu bem
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

    // PASSO 4: SALVAR NO BANCO (Transação)
    await db.transaction(async (tx) => {
      await tx.update(verificationRequests)
        .set({
          extractedIncome: extractedIncome || 'Não lido/Não aplicável',
          ocrConfidence: `${Math.round(confidence)}%`,
          status: finalStatus,
          adminMessage: adminMessage,
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
    // Em caso de falha de servidor/imagem corrompida, joga pro humano sem punir o usuário
    await db.update(verificationRequests)
      .set({ status: 'Analise_Manual', updatedAt: new Date() })
      .where(eq(verificationRequests.id, requestId));
  }
}