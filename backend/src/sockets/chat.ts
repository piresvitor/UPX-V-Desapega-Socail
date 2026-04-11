// backend/src/sockets/chat.ts
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

// O senderId foi removido do Payload
interface SendMessagePayload {
  roomId: string;
  content: string;
}

export function setupWebSockets(app: FastifyInstance) {
  app.ready().then(() => {
    
    // =========================================================
    // 🛡️ MIDDLEWARE DE AUTENTICAÇÃO DO SOCKET
    // Intercepta a conexão para decodificar o JWT antes de liberar
    // =========================================================
    app.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Acesso negado: Token ausente'));
        }
        
        // Limpa o prefixo 'Bearer ' caso o frontend tenha enviado
        const cleanToken = token.replace('Bearer ', '');
        
        // Usa a própria instância do Fastify para decodificar o JWT
        const decoded = app.jwt.verify(cleanToken) as { sub: string };
        
        // Salva o ID do usuário com segurança na sessão do Socket
        socket.data.userId = decoded.sub;
        next();
      } catch (err) {
        console.error('❌ Erro de Autenticação no Socket:', err);
        next(new Error('Acesso negado: Token inválido'));
      }
    });

    // =========================================================
    // 🔌 EVENTOS DE CONEXÃO
    // =========================================================
    app.io.on('connection', (socket: Socket) => {
      // Pega o ID que nosso middleware salvou com segurança
      const userId = socket.data.userId; 
      console.log(`✅ Usuário conectado: ${socket.id} (User ID: ${userId})`);

      // CORREÇÃO 1: Extrai o roomId do objeto que o frontend enviou
      socket.on('join_room', (data: { roomId: string }) => {
        const roomId = data.roomId;
        if (roomId) {
          socket.join(roomId);
          console.log(`🚪 Usuário ${userId} entrou na sala: ${roomId}`);
        }
      });

      // CORREÇÃO 2: Usa o userId seguro no lugar do senderId vazio
      socket.on('send_message', async (data: SendMessagePayload, callback?: (response: any) => void) => {
        const { roomId, content } = data;
        const senderId = socket.data.userId; // Extraído do token (100% seguro)

        if (!roomId || !content) return;

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
          console.error('❌ Falha crítica ao salvar mensagem:', error);
          if (typeof callback === 'function') {
            callback({ success: false, error: 'Erro interno ao salvar mensagem.' });
          }
        }
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Usuário desconectado: ${socket.id} (User ID: ${userId})`);
      });
      
    });
  });
}

// =========================================================
// 🚀 FUNÇÃO ASSÍNCRONA PARA BACKGROUND (PUSH FIREBASE)
// =========================================================
async function processPushNotification(roomId: string, senderId: string, content: string) {
  const room = await db.query.chatRooms.findFirst({
    where: eq(chatRooms.id, roomId)
  });

  if (!room) return;

  const targetUserId = room.participant1 === senderId ? room.participant2 : room.participant1;

  // Busca concorrente
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
      
      if (fbError.code === 'messaging/invalid-registration-token' || fbError.code === 'messaging/registration-token-not-registered') {
          console.warn(`Limpando FCM Token expirado/inválido para o usuário ${targetUser.id}`);
          await db.update(users).set({ fcmToken: null }).where(eq(users.id, targetUser.id));
      }
    }
  }
}