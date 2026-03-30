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

      // O callback permite que o Frontend saiba imediatamente se deu erro ao salvar
      socket.on('send_message', async (data: SendMessagePayload, callback?: (response: any) => void) => {
        const { roomId, senderId, content } = data;

        try {
          // 1. Salva a mensagem no banco (Síncrono e Imediato)
          const [newMessage] = await db.insert(messages).values({
            roomId,
            senderId,
            content,
          }).returning();

          // 2. Emite para todos na sala (Tempo Real)
          app.io.to(roomId).emit('receive_message', newMessage);

          // Avisa ao remetente que a msg foi salva com sucesso
          if (typeof callback === 'function') {
            callback({ success: true, message: newMessage });
          }

          // 3. BACKGROUND JOB: Envia o Push Notification (Fire and Forget)
          processPushNotification(roomId, senderId, content).catch(err => {
             console.error(`[BACKGROUND PUSH ERROR] Sala ${roomId}:`, err);
          });

        } catch (error) {
          console.error('Falha crítica ao salvar mensagem:', error);
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Erro interno ao salvar mensagem.' });
          }
        }
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Usuário desconectado: ${socket.id}`);
      });
      
    });
  });
}

// =========================================================
// FUNÇÃO ASSÍNCRONA PARA BACKGROUND (ISOLADA)
// =========================================================
async function processPushNotification(roomId: string, senderId: string, content: string) {
  const room = await db.query.chatRooms.findFirst({
    where: eq(chatRooms.id, roomId)
  });

  if (!room) return;

  const targetUserId = room.participant1 === senderId ? room.participant2 : room.participant1;

  // Busca concorrente: Pega o Token do alvo e o Nome do remetente ao mesmo tempo!
  const [targetUser, senderUser] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, targetUserId), columns: { id: true, fcmToken: true } }),
    db.query.users.findFirst({ where: eq(users.id, senderId), columns: { fullName: true } })
  ]);

  if (targetUser?.fcmToken && senderUser) {
    try {
      await sendPushNotification(
        targetUser.fcmToken,
        `Nova mensagem de ${senderUser.fullName}`,
        content,
        { roomId: roomId, type: 'CHAT_MESSAGE' }
      );
    } catch (fbError: any) {
      console.error('[FIREBASE PUSH] Falha no disparo:', fbError.message);
      
      // AUTO-LIMPEZA: Se o usuário desinstalou o app, o Firebase avisa. Nós limpamos o token do banco!
      if (fbError.code === 'messaging/invalid-registration-token' || fbError.code === 'messaging/registration-token-not-registered') {
          console.warn(`Limpando FCM Token expirado/inválido para o usuário ${targetUser.id}`);
          await db.update(users).set({ fcmToken: null }).where(eq(users.id, targetUser.id));
      }
    }
  }
}