import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';

export async function uploadSecureImage(buffer: Buffer, folder: string): Promise<string> {
  // Puxa o nome do cofre do arquivo .env
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  
  if (!bucketName) {
    throw new Error('ERRO CRÍTICO: A variável FIREBASE_STORAGE_BUCKET não foi definida no .env');
  }

  const bucket = getStorage().bucket(bucketName);
  
  // Cria um nome de arquivo impossível de adivinhar
  const fileName = `${folder}/${randomUUID()}.jpg`;
  const file = bucket.file(fileName);

  // Salva o Buffer direto na nuvem do Google de forma invisível
  await file.save(buffer, {
    metadata: { contentType: 'image/jpeg' }
  });

  // GERA A URL ASSINADA (LGPD)
  // Essa URL tem um token gigante embutido que expira automaticamente em 30 dias.
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 dias
  });

  return signedUrl;
}