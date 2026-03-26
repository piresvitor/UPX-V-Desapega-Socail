import { FastifyInstance } from 'fastify';
import { Server, Socket } from 'socket.io'; 
import { eq } from 'drizzle-orm';
import { db } from '../database/cliente';
import { messages, chatRooms, users } from '../database/schema';
import { sendPushNotification } from '../services/firebase';

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
          // Salva a mensagem no banco (Histórico)
          const [newMessage] = await db.insert(messages).values({
            roomId,
            senderId,
            content,
          }).returning();

          console.log(`Nova mensagem na sala ${roomId}: ${content}`);

          // 2. Emite para todos na sala (Tempo Real)
          app.io.to(roomId).emit('receive_message', newMessage);

          // NOTIFICAÇÃO (FIREBASE)
          
          // Descobre quem são as pessoas na sala
          const room = await db.query.chatRooms.findFirst({
            where: eq(chatRooms.id, roomId)
          });

          if (room) {
            // Se eu sou o participante 1, o destinatário é o 2 (e vice-versa)
            const targetUserId = room.participant1 === senderId ? room.participant2 : room.participant1;

            // Busca o token do destinatário e o nome de quem enviou (para aparecer na tela do celular)
            // Usamos Promise.all para fazer as duas buscas no banco ao mesmo tempo
            const [targetUser, senderUser] = await Promise.all([
              db.query.users.findFirst({ where: eq(users.id, targetUserId), columns: { fcmToken: true } }),
              db.query.users.findFirst({ where: eq(users.id, senderId), columns: { fullName: true } })
            ]);

            // Se o destinatário tem um token salvo, manda a notificação!
            if (targetUser?.fcmToken && senderUser) {
              await sendPushNotification(
                targetUser.fcmToken,
                `Nova mensagem de ${senderUser.fullName}`,
                content, // O texto da mensagem que vai aparecer no balãozinho do celular
                { roomId: roomId, type: 'CHAT_MESSAGE' } // Dados extras para o app abrir a tela certa
              );
            }
          }

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