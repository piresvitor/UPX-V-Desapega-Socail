import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Se não tiver a chave no .env ou se ela não tiver 32 caracteres,
// o servidor nem liga, evitando corromper os dados no banco.
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
  throw new Error('FATAL ERROR: A variável ENCRYPTION_KEY no .env é obrigatória e deve ter exatamente 32 caracteres.');
}

// Converte a string para um Uint8Array puro (livre de conflitos de tipagem do Buffer)
const key = new Uint8Array(Buffer.from(ENCRYPTION_KEY, 'utf-8'));

export function encryptCpf(cpf: string): string {
  // Gera os bytes e converte imediatamente para Uint8Array
  const ivBuffer = crypto.randomBytes(16);
  const iv = new Uint8Array(ivBuffer);
  
  // Agora o TypeScript aceita a key e o iv sorrindo!
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(cpf, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Convertendo de volta para salvar a string em HEX
  return `${Buffer.from(iv).toString('hex')}:${encrypted}`;
}

export function decryptCpf(encryptedText: string): string {
  try {
    const textParts = encryptedText.split(':');
    
    // Converte a string HEX de volta para Uint8Array
    const ivBuffer = Buffer.from(textParts[0], 'hex');
    const iv = new Uint8Array(ivBuffer);
    
    const encryptedData = textParts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Erro ao descriptografar CPF:', error);
    throw new Error('Falha na descriptografia dos dados sensíveis.');
  }
}