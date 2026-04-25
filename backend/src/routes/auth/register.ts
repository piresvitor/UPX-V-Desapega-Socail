import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { hash } from 'argon2';
import { eq } from 'drizzle-orm';
import { db } from '../../database/cliente'; 
import { users } from '../../database/schema'; 

export const registerRoute: FastifyPluginAsyncZod = async (server) => {
  server.post('/auth/register', {
    schema: {
      tags: ['Auth'],
      summary: 'Register',
      description: 'Cadastro de novo usuário no Desapega Social',
      body: z.object({
        fullName: z.string().min(3, 'O nome precisa ter pelo menos 3 caracteres'),
        email: z.email('Formato de e-mail inválido'),
        password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres'),
        role: z.enum(['Doador', 'Beneficiário', 'Freteiro', 'Admin']).optional(),
      }),
      response: {
        201: z.object({
          message: z.string(),
        }),
        409: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        })
      },
    },
  }, async (request, reply) => {
    try {
      const { fullName, email, password, role } = request.body;

      // Verificação de usuário existente
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        return reply.status(409).send({ message: 'E-mail já cadastrado na plataforma' });
      }

      // Criação do hash da senha com Argon2
      const passwordHash = await hash(password);

      // Inserção no banco de dados
      await db.insert(users).values({
        fullName,
        email,
        passwordHash,
        role: role ?? 'Beneficiário', 
      });

      return reply.status(201).send({ message: 'Usuário cadastrado com sucesso!' });
      
    } catch (error) {

      console.error("ERRO FATAL NO DB (Register):", error);
      return reply.status(500).send({ message: 'Erro interno ao processar o cadastro' });
    }
  });
};