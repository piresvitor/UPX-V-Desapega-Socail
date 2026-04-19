import { sql } from 'drizzle-orm';
import { db } from './cliente';
import { 
  users, items, verificationRequests, 
  freightRequests, chatRooms, messages, reviews 
} from './schema';
import { hash } from 'argon2';

async function seed() {
  console.log('🌱 Iniciando Seed...');

  // Limpar banco (Opcional)
  // await db.delete(messages);
  // await db.delete(chatRooms);
  // ...

  const password = await hash('123456');

  // 1. Criar Usuários
  console.log('👤 Criando usuários...');
  const insertedUsers = await db.insert(users).values([
    { fullName: 'Admin Sistema', email: 'admin@teste.com', passwordHash: password, role: 'Admin', isVerified: true },
    { fullName: 'João Freteiro', email: 'freteiro@teste.com', passwordHash: password, role: 'Freteiro', isVerified: true },
    { fullName: 'Doador Generoso', email: 'doador@teste.com', passwordHash: password, role: 'Doador', isVerified: true },
    { fullName: 'Maria Beneficiaria', email: 'maria@teste.com', passwordHash: password, role: 'Beneficiário', isVerified: true },
    { fullName: 'Carlos Silva', email: 'carlos@teste.com', passwordHash: password, role: 'Beneficiário', isVerified: false },
  ]).returning();

  const [admin, driver, donor, recipient1, recipient2] = insertedUsers;

  // 2. Criar Itens (Localizações em Sorocaba)
  console.log('📦 Criando itens...');
  const insertedItems = await db.insert(items).values([
    {
      donorId: donor.id,
      title: 'Sofá 3 Lugares Retrátil',
      description: 'Em bom estado, cor cinza.',
      category: 'Móveis',
      status: 'Disponível',
      // Ponto no Campolim (-47.46, -23.53)
      location: sql`ST_MakePoint(-47.465, -23.538)`,
      imageUrls: ['https://placehold.co/600x400?text=Sofa'],
    },
    {
      donorId: donor.id,
      title: 'Geladeira Antiga Brastemp',
      description: 'Funcionando perfeitamente.',
      category: 'Eletrodomésticos',
      status: 'Disponível',
      // Ponto no Centro (-47.45, -23.50)
      location: sql`ST_MakePoint(-47.459, -23.501)`,
    },
    {
      donorId: donor.id,
      title: 'Cadeira de Rodas Dobrável',
      description: 'Seminovas, pouco uso.',
      category: 'Saúde',
      status: 'Reservado',
      // Ponto no Éden (-47.41, -23.44)
      location: sql`ST_MakePoint(-47.418, -23.442)`,
    }
  ]).returning();

  const [sofa, geladeira, cadeira] = insertedItems;

  // 3. Criar Solicitação de Frete (Para o Sofá)
  console.log('🚚 Criando pedidos de frete...');
  await db.insert(freightRequests).values({
    itemId: sofa.id,
    beneficiaryId: recipient1.id,
    status: 'Pendente',
    // Destino na Vila Hortência
    destinationLocation: sql`ST_MakePoint(-47.445, -23.508)`,
  });

  // 4. Criar Verificações Pendentes para o Admin testar
  console.log('🛡️ Criando verificações...');
  await db.insert(verificationRequests).values({
    userId: recipient2.id,
    encryptedCpf: 'Criptografado_Fake_123',
    identityDocumentUrl: 'https://placehold.co/400?text=RG',
    incomeProofUrl: 'https://placehold.co/400?text=Renda',
    status: 'Analise_Manual',
    ocrConfidence: '65%',
  });

  console.log('✅ Seed finalizado com sucesso!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err);
  process.exit(1);
});