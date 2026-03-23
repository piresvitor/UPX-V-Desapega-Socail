import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { verify } from 'argon2';
import { db } from '../../database/cliente'; 
import { users } from '../../database/schema'; 
export const loginRoute: FastifyPluginAsyncZod = async (server) => {
  server.post('/auth/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login',
      description: 'Autentica um usuário e retorna um token JWT.',
      body: z.object({
        email: z.email('Formato de e-mail inválido'), 
        password: z.string(),
      }),
      response: {
        200: z.object({ token: z.string() }),
        400: z.object({ message: z.string() }),
      },
    },
  }, async (request, reply) => {
    const { email, password } = request.body;

    // Busca o usuário
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Se o usuário não existir OU se a coluna deletedAt tiver alguma data
    if (!user || user.deletedAt !== null) {
        return reply.status(400).send({ message: 'Credenciais inválidas' }); 
    }

    // Compara a senha digitada com o hash gerado pelo Argon2
    const doesPasswordsMatch = await verify(user.passwordHash, password);

    if (!doesPasswordsMatch) {
      return reply.status(400).send({ message: 'Credenciais inválidas' });
    }

    // Gera o Token utilizando o plugin oficial do Fastify
    const token = server.jwt.sign({ 
      sub: user.id, 
      role: user.role 
    });

    return reply.status(200).send({ token });
  });
};