import * as admin from 'firebase-admin';

// Função para inicializar o Firebase apenas uma vez
export function initializeFirebase() {
  if (!admin.apps.length) {
    try {
      // Em produção, as credenciais vêm de variáveis de ambiente.
      // Para desenvolvimento local, ele buscará o arquivo JSON que vamos baixar depois.
      admin.initializeApp({
        credential: admin.credential.applicationDefault(), 
      });
      console.log('Firebase Admin inicializado com sucesso!');
    } catch (error) {
      console.error('Erro ao inicializar o Firebase Admin:', error);
    }
  }
}

// Função utilitária para enviar a notificação
export async function sendPushNotification(token: string, title: string, body: string, data?: any) {
  try {
    const message = {
      notification: { title, body },
      data: data || {}, // Payload invisível para o app abrir a tela certa
      token: token,
    };

    const response = await admin.messaging().send(message);
    console.log('Push Notification enviada com sucesso:', response);
    return true;
  } catch (error) {
    console.error('Erro ao enviar Push Notification:', error);
    return false;
  }
}