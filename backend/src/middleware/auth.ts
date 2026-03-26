import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../database/cliente';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    // O Fastify extrai o token do header, verifica a validade, 
    // decodifica e já joga automaticamente no `request.user`!
    await request.jwtVerify();
    
  } catch (error) {
    return reply.status(401).send({ message: 'Token de autorização ausente, inválido ou expirado.' });
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  try {
    // O authenticateToken roda primeiro, então aqui nós JÁ TEMOS o request.user.sub
    const userId = request.user.sub;

    // Vai no banco confirmar se esse cara é realmente o Chefão
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { role: true } // Trazemos apenas a coluna role para ser super rápido
    });

    // Se o usuário não existir ou o cargo dele não for ADMIN, a porta fecha na cara dele!
    if (!user || user.role !== 'Admin') {
      return reply.status(403).send({ 
        message: 'Acesso Negado: Apenas administradores do Desapega Social podem aprovar documentos.' 
      });
    }

    // Se ele for ADMIN, a função termina silenciosamente e o Fastify deixa a rota continuar
  } catch (error) {
    console.error('Erro ao verificar permissões de Admin:', error);
    return reply.status(500).send({ message: 'Erro interno ao validar permissões.' });
  }
}