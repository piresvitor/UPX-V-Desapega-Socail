import 'dotenv/config';
import { app } from './app';

const PORT = Number(process.env.PORT) || 3333;
const HOST = '0.0.0.0'; 

const start = async () => {
  try {
    const address = await app.listen({ 
      port: PORT, 
      host: HOST 
    });
    
    console.log(`Desapega Social API rodando com sucesso!`);
    console.log(`Escutando em: ${address}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();