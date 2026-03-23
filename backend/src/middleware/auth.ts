import { FastifyRequest, FastifyReply } from 'fastify';

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    // O Fastify extrai o token do header, verifica a validade, 
    // decodifica e já joga automaticamente no `request.user`!
    await request.jwtVerify();
    
  } catch (error) {
    return reply.status(401).send({ message: 'Token de autorização ausente, inválido ou expirado.' });
  }
}