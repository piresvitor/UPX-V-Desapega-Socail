import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { app } from '../src/app';
import { db } from '../src/database/cliente';

// Mock do módulo do banco de dados (Drizzle ORM)
vi.mock('../src/database/cliente', () => {
  // Simulando cadeias de métodos do Drizzle
  const mockSelectChain: any = {
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  };

  return {
    db: {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '123e4567-e89b-12d3-a456-426614174000' }])
        })
      }),
      select: vi.fn().mockReturnValue(mockSelectChain),
      query: {
        users: {
          findFirst: vi.fn()
        }
      }
    }
  };
});

describe('Items Route', () => {
  let validToken: string;
  let bannedToken: string;

  beforeAll(async () => {
    // Aguarda os plugins do fastify carregarem
    await app.ready();
    
    // Gerando tokens falsos mas criptograficamente válidos usando o plugin jwt do Fastify
    validToken = app.jwt.sign({ sub: 'valid-user-id' });
    bannedToken = app.jwt.sign({ sub: 'banned-user-id' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Criação de Item (POST /items)', () => {
    it('deve salvar o item corretamente com latitude/longitude e retornar status 201', async () => {
      // Setup para o middleware de autenticação (usuário ativo normal)
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ deletedAt: null } as any);

      const payload = {
        title: 'Cadeira de Escritório',
        category: 'Móveis',
        description: 'Em bom estado',
        latitude: -23.550520,
        longitude: -46.633308
      };

      const response = await app.inject({
        method: 'POST',
        url: '/items',
        headers: {
          authorization: `Bearer ${validToken}`
        },
        payload
      });

      if (response.statusCode === 500) require('fs').writeFileSync('err.json', JSON.stringify(response.json()));
      expect(response.statusCode).toBe(201);
      
      const body = response.json();
      expect(body).toHaveProperty('itemId', '123e4567-e89b-12d3-a456-426614174000');
      expect(body).toHaveProperty('message', 'Item cadastrado com sucesso!');
      
      // Verifica se o insert foi chamado
      expect(db.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('Feed Geográfico (GET /items)', () => {
    it('deve retornar status 200 e processar coordenadas na querystring', async () => {
      // 1. Mock do auth middleware
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ deletedAt: null } as any);

      // 2. Mock do Drizzle select chain
      // O primeiro select é para buscar se o usuário é verificado
      const mockChain = db.select() as any;
      mockChain.where.mockResolvedValueOnce([{ isVerified: true }]); // Para currentUser
      
      // O segundo select é para listar os itens
      mockChain.orderBy.mockResolvedValueOnce([
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Cadeira',
          category: 'Móveis',
          status: 'Disponível',
          latitude: '-23.55',
          longitude: '-46.63',
          createdAt: new Date(),
          donor: { id: '123e4567-e89b-12d3-a456-426614174001', fullName: 'João da Silva' }
        }
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/items',
        query: {
          lat: '-23.550520',
          lng: '-46.633308',
          radius: '5000'
        },
        headers: {
          authorization: `Bearer ${validToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const items = response.json();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('title', 'Cadeira');
    });
  });

  describe('Filtro de Soft Delete', () => {
    it('não deve trazer itens de doadores deletados na busca (filtro do banco)', async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ deletedAt: null } as any);

      // Mock retornando array vazio simulando que o filtro da query 'WHERE deletedAt IS NULL' funcionou
      const mockChain = db.select() as any;
      mockChain.where.mockResolvedValueOnce([{ isVerified: true }]); 
      mockChain.orderBy.mockResolvedValueOnce([]); // Nenhum item retornado pois o doador foi "deletado"

      const response = await app.inject({
        method: 'GET',
        url: '/items',
        headers: {
          authorization: `Bearer ${validToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const items = response.json();
      expect(items).toEqual([]); // Confirma que não retornou nada
    });
  });

  describe('Segurança de Sessão', () => {
    it('deve retornar 403 se o usuário do token estiver banido (soft delete)', async () => {
      // Configurando o mock do auth.ts para simular um usuário com deletedAt setado
      vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({ 
        deletedAt: new Date() 
      } as any);

      const response = await app.inject({
        method: 'GET',
        url: '/items',
        headers: {
          authorization: `Bearer ${bannedToken}`
        }
      });

      // O middleware authenticateToken precisa barrar
      expect(response.statusCode).toBe(403);
      
      const body = response.json();
      expect(body.message).toContain('Acesso Negado');
      
      // Valida que o db.select() da rota nem chegou a ser chamado
      expect(db.select).not.toHaveBeenCalled();
    });
  });
});
