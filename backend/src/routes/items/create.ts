import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { db } from '../../database/cliente';
import { items } from '../../database/schema';
import { authenticateToken } from '../../middleware/auth';

const bodySchema = z.object({
  title: z.string().min(3, 'O título deve ter pelo menos 3 caracteres').max(100, 'O título deve ter no máximo 100 caracteres'),
  description: z.string().optional(),
  category: z.string().min(2, 'A categoria é obrigatória'),
  imageUrls: z.array(z.url('Cada item deve ser uma URL válida'))
    .max(3, 'Você pode enviar no máximo 3 imagens do produto')
    .optional(),
  
  // Usando a sintaxe de 'message' que o seu TypeScript está pedindo
  latitude: z.number({ message: 'A latitude é obrigatória e deve ser um número válido' }),
  longitude: z.number({ message: 'A longitude é obrigatória e deve ser um número válido' }),
});

export const createItemRoute: FastifyPluginAsyncZod = async (server) => {
  server.post('/items', {
    onRequest: [authenticateToken],
    schema: {
      tags: ['Items'],
      summary: 'Create Item',
      description: 'Cadastra um novo item para doação atrelado ao usuário logado.',
      headers: z.object({
        authorization: z.string().regex(/^Bearer .+/, 'Authorization header must be Bearer token')
      }),
      body: bodySchema,
      response: {
        201: z.object({
          message: z.string(),
          item: z.object({
            id: z.string().uuid(),
            title: z.string(),
            category: z.string(),
            status: z.string()
          })
        }),
        500: z.object({ message: z.string() })
      }
    }
  }, async (request, reply) => {
    try {
      // O ID de quem está criando a doação vem direto do token (Segurança extra!)
      const donorId = request.user.sub;
      
      const { title, description, category, imageUrls, latitude, longitude } = request.body;

      // Inserção no banco de dados
      const [newItem] = await db.insert(items).values({
        donorId,
        title,
        description,
        category,
        imageUrls,
        // O Drizzle mapeia 'decimal' do Postgres como string para evitar arredondamentos do JavaScript
        latitude: latitude.toString(), 
        longitude: longitude.toString(),
        // O 'status', 'createdAt' e o 'id' são gerados automaticamente pelos valores default do schema
      }).returning({
        id: items.id,
        title: items.title,
        category: items.category,
        status: items.status
      });

      return reply.status(201).send({
        message: 'Item disponibilizado para doação com sucesso!',
        item: newItem
      });

    } catch (error) {
      console.error('Erro ao cadastrar item:', error);
      return reply.status(500).send({ message: 'Erro interno ao tentar cadastrar o item' });
    }
  });
};