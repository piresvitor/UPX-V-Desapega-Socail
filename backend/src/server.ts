import 'dotenv/config';
import { app } from './app';

const PORT = Number(process.env.PORT) || 3333;
const HOST = '0.0.0.0'; // 

const start = async () => {
  try {
    await app.listen({ 
      port: PORT, 
      host: HOST 
    });
    
    console.log(`
    Servidor Fastify Rodando!
    Porta: ${PORT}
    Local: http://localhost:${PORT}
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();