import 'dotenv/config'; 
import { encryptCpf, decryptCpf } from './crypto'

const originalCpf = '123.456.789-00';
console.log(`\CPF Original: ${originalCpf}`);

try {
  // Testa a Criptografia
  const encrypted = encryptCpf(originalCpf);
  console.log(`CPF Criptografado (O que vai pro banco): \n   ${encrypted}`);

  // Testa a Descriptografia
  const decrypted = decryptCpf(encrypted);
  console.log(`CPF Descriptografado (O que o sistema lê): \n   ${decrypted}`);

  // Validação Final
  if (originalCpf === decrypted) {
    console.log('\nSUCESSO ABSOLUTO! O Cadeado está funcionando perfeitamente!\n');
  } else {
    console.error('\nERRO! Os valores não batem.\n');
  }
} catch (error) {
  console.error('\nFalha no teste:', error);
}