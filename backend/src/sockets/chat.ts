import { FastifyInstance } from 'fastify';
import { Server, Socket } from 'socket.io'; 
import { db } from '../database/cliente';
import { messages } from '../database/schema';

declare module 'fastify' {
  interface FastifyInstance {
    io: Server;
  }
}

interface SendMessagePayload {
  roomId: string;
  senderId: string;
  content: string;
}

export function setupWebSockets(app: FastifyInstance) {
  app.ready().then(() => {
    
    app.io.on('connection', (socket: Socket) => {
      console.log(`Usuário conectado no Socket: ${socket.id}`);

      socket.on('join_room', (roomId: string) => {
        socket.join(roomId);
        console.log(`Usuário ${socket.id} entrou na sala: ${roomId}`);
      });

      socket.on('send_message', async (data: SendMessagePayload) => {
        const { roomId, senderId, content } = data;

        try {
          const [newMessage] = await db.insert(messages).values({
            roomId,
            senderId,
            content,
          }).returning();

          console.log(`Nova mensagem na sala ${roomId}: ${content}`);

          app.io.to(roomId).emit('receive_message', newMessage);

        } catch (error) {
          console.error('Erro ao salvar a mensagem via socket:', error);
        }
      });

      socket.on('disconnect', () => {
        console.log(`Usuário desconectado: ${socket.id}`);
      });
      
    });
  });
}