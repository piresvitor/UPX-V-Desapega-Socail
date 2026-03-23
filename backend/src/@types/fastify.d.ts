import '@fastify/jwt';

declare module '@fastify/jwt' {
  export interface FastifyJWT {
    user: {
      sub: string; // ID do usuário
      role: 'Doador' | 'Beneficiário' | 'Freteiro' | 'Admin';
    }
  }
}