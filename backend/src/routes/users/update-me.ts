import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { hash } from 'argon2';
import { db } from '../../database/cliente';
import { users } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

const bodySchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres').optional(),
  email: z.email('Formato de e-mail inválido').optional(),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres').optional(),
});

export const updateMeRoute: FastifyPluginAsyncZod = async (server) => {
  server.put('/users/me', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Users'],
      summary: 'Update User',
      description: 'Atualiza dados do perfil do usuário autenticado',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      body: bodySchema,
      response: {
        200: z.object({
          message: z.string(),
          user: z.object({
            id: z.uuid(),
            fullName: z.string(),
            email: z.email(),
            role: z.string(),
          })
        }),
        400: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
        409: z.object({ message: z.string() }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      const userId = request.user.sub;
      const { fullName, email, password } = request.body;

      // Verificar se pelo menos um campo foi fornecido
      if (!fullName && !email && !password) {
        return reply.status(400).send({ 
          message: 'Pelo menos um campo (fullName, email ou password) deve ser fornecido para atualização' 
        });
      }

      // Verificar se o email já existe (se estiver sendo atualizado)
      if (email) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser && existingUser.id !== userId) {
          return reply.status(409).send({ 
            message: 'Este e-mail já está sendo usado por outro usuário' 
          });
        }
      }

      // Preparar dados para atualização
      const updateData: Record<string, any> = {};
      
      if (fullName) updateData.fullName = fullName;
      if (email) updateData.email = email;
      if (password) updateData.passwordHash = await hash(password);

      // Atualizar usuário e retornar os dados novos
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role
        });

      if (!updatedUser) {
        return reply.status(404).send({ message: 'Usuário não encontrado' });
      }

      return reply.status(200).send({
        message: 'Perfil atualizado com sucesso',
        user: updatedUser
      });

    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return reply.status(500).send({ message: 'Erro interno do servidor' });
    }
  });
};