import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/cliente';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  // 1. O Fastify verifica a validade criptográfica do JWT 
  try {
    await request.jwtVerify();
  } catch (error) {
    return reply.status(401).send({ message: 'Token de autorização ausente, inválido ou expirado.' });
  }
  
  // 2. Trava de Segurança: Checar no banco se o usuário foi banido (Soft Delete)
  try {
    const userId = request.user.sub;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { deletedAt: true } 
    });

    if (!user || user.deletedAt !== null) {
      return reply.status(403).send({ 
        message: 'Acesso Negado: A sua conta foi suspensa ou excluída pela moderação.' 
      });
    }
  } catch (error) {
    console.error('Erro ao verificar status do usuário banido:', error);
    return reply.status(500).send({ message: 'Erro interno ao validar a sessão.' });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = request.user.sub;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true } 
    });

    if (!user || user.role !== 'Admin') {
      return reply.status(403).send({ 
        message: 'Acesso Negado: Apenas administradores do Desapega Social podem aprovar documentos.' 
      });
    }
  } catch (error) {
    console.error('Erro ao verificar permissões de Admin:', error);
    return reply.status(500).send({ message: 'Erro interno ao validar permissões.' });
  }
}