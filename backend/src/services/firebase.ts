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

export async function deleteFirebaseFileByUrl(fileUrl: string) {
  try {
    //Extrai o nome do arquivo da URL pública do Firebase Storage
    const regex = /\/o\/(.*?)\?alt=media/;
    const match = fileUrl.match(regex);
    
    if (match && match[1]) {
      //O decodeURIComponent transforma %2F em barras normais, etc.
      const filePath = decodeURIComponent(match[1]); 
      
      //Manda o Firebase Admin deletar o arquivo silenciosamente
      await admin.storage().bucket().file(filePath).delete();
      console.log(`🗑️ Arquivo apagado do Firebase Storage (LGPD): ${filePath}`);
    } else {
      console.log(`⚠️ Não foi possível extrair o caminho do arquivo da URL: ${fileUrl}`);
    }
  } catch (error) {
    // Nós apenas registramos o erro, mas NÃO travamos o sistema se a foto já tiver sumido
    console.error('Erro ao tentar apagar arquivo do Firebase:', error);
  }
}