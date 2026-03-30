# API Desapega Social

Backend do aplicativo focado em doações e acessibilidade urbana. Desenvolvido com uma arquitetura moderna e escalável, projetado para suportar buscas geoespaciais, Inteligência Artificial (OCR) e regras de negócio com foco absoluto em impacto social e segurança de dados (LGPD).

## 🛠 Tecnologias Utilizadas

- **Node.js & TypeScript:** Base sólida e tipada.
- **Fastify:** Framework web de altíssimo desempenho.
- **Drizzle ORM:** Manipulação de banco de dados *type-safe* e moderna.
- **PostgreSQL + PostGIS:** Banco de dados relacional com extensão espacial para cálculos de GPS.
- **Tesseract.js & Sharp:** Processamento de imagens e Inteligência Artificial (OCR) para leitura automatizada de documentos.
- **Zod & Fastify Type Provider:** Validação rigorosa de dados de entrada/saída e geração automática de documentação Swagger/OpenAPI.
- **Node.js Crypto (AES-256-CBC):** Criptografia nativa de padrão bancário para proteção de dados sensíveis.
- **Socket.io:** Implementação de WebSockets para comunicação em tempo real bidirecional.
- **Firebase Admin SDK:** Integração com os servidores do Google para disparo de Push Notifications e cofre seguro de Storage.
- **JWT (JSON Web Token):** Autenticação, autorização de rotas e RBAC (Role-Based Access Control).

---

## ✨ Funcionalidades e Regras de Negócio Implementadas

### 1. Verificação de Identidade e Inteligência Artificial (LGPD)
- **Privacy by Design (Processamento em RAM):** O upload de documentos (RG, Holerite, CadÚnico) é recebido via *multipart/form-data* e processado diretamente na memória RAM (Buffer). As imagens não transitam pelo disco rígido do servidor.
- **OCR Automático:** A IA (Tesseract) lê os documentos na memória para cruzar o nome e identificar a prova de renda.
- **Máquina de Decisão:** Se a IA aprovar, o usuário recebe o selo de verificado e as **imagens são imediatamente destruídas** da memória. Se a IA ficar em dúvida, engatilha o "Plano B", trancando as fotos no cofre seguro do Firebase (gerando URLs assinadas) e enviando o caso para a fila de Análise Manual do Administrador.
- **Criptografia:** O CPF é validado matematicamente e encriptado via `AES-256-CBC` antes de atingir o banco de dados.

### 2. Sistema de Reputação e Confiança
- **Avaliações (1 a 5 estrelas):** Beneficiários, Doadores e Freteiros podem se avaliar após uma interação.
- **Cálculo Transacional:** A média de estrelas e o total de avaliações do usuário são recalculados no banco de dados através de *Transactions* (ACID), garantindo que a nota do perfil esteja sempre sincronizada com a tabela de *reviews*.
- **Regras Anti-Fraude:** Bloqueio nativo em backend (Unique Index) para impedir autoavaliações e ataques de spam.

### 3. Painel Administrativo (Backoffice)
- **Fila de Trabalho:** Rota exclusiva para listar usuários retidos na malha fina da IA (Aguardando Análise Manual).
- **Moderação de Usuários (O Martelo do Ban):** Implementação de *Soft Delete* (`deletedAt`). Permite que o administrador suspenda usuários infratores sem quebrar a integridade referencial do banco de dados (preservando o histórico de chats e ocultando as doações do usuário banido).
- **Dashboard de Métricas de Alta Performance:** Rota analítica construída com `Promise.all` e *SQL COUNTs* simultâneos e agrupados, levantando dados vitais da plataforma em milissegundos.

### 4. Algoritmo de Prioridade Social (RF03)
- **Trava de Exclusividade de 24h:** Proteção contra atravessadores. Itens recém-cadastrados (com menos de 24h) ficam visíveis exclusivamente para usuários com o selo `isVerified = true`.

### 5. Motor de Busca Geoespacial (RF05)
- O Feed Geral possui integração nativa com o **PostGIS** (`ST_DistanceSphere` e Índice `GiST`). A API recebe a localização atual do usuário e filtra/ordena as doações mais próximas dentro de um raio configurável com altíssima performance.

### 6. Comunicação em Tempo Real (Arquitetura Híbrida)
- **Prevenção de Duplicatas:** "Porteiro" algorítmico garantindo que Doador e Beneficiário tenham apenas uma sala de chat única por item negociado.
- **WebSockets (Socket.io):** Mensagens trafegadas em tempo real e salvas simultaneamente no PostgreSQL para garantir integridade do histórico.

### 7. Logística e Frete Solidário
- **Radar de Motoristas:** Utiliza PostGIS para listar solicitações de frete ordenadas pela distância real entre a doação e o motorista. Acesso restrito via RBAC (`role: 'Freteiro'`).
- **Prevenção de Condição de Corrida (Race Condition):** Trava no banco de dados para garantir que, se dois motoristas tentarem aceitar a mesma corrida simultaneamente, apenas um consiga.

---

## 📍 Rotas da API (Endpoints HTTP)

> **⚠️ NOTA SOBRE PAGINAÇÃO:** As rotas que retornam listas pesadas exigem os parâmetros `page` e `limit` na URL. Omissão usará os padrões do backend para preservar a memória.
> 
> **⚠️ NOTA SOBRE UPLOADS (LGPD):** A rota de Verificação ignora cargas JSON. O envio deve ser restrito ao cabeçalho `multipart/form-data`, atrelando os arquivos nas chaves `identityDocument` e `incomeProof`. 

*Nota: Todas as rotas (exceto Públicas e Criação de Usuário) exigem o envio do token JWT no Header: `Authorization: Bearer <SEU_TOKEN>`*

### 🌍 Rota Pública e Infraestrutura
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/health` | Healthcheck atestando que a API e o Banco estão saudáveis. |
| `GET` | `/public/statistics` | Retorna as métricas de impacto para prova social. |

### 👤 Usuários, Autenticação e Reputação
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/users` | Cria um novo usuário |
| `POST` | `/auth` | Realiza login e retorna o Token JWT |
| `GET` | `/users/me` | Retorna o perfil do usuário logado |
| `PATCH`| `/users/me` | Atualiza dados do perfil do usuário logado |
| `DELETE`| `/users/me` | Encerra a própria conta (Soft Delete) |
| `GET` | `/users/:id` | Retorna o perfil público de outro usuário |
| `PATCH`| `/users/fcm-token` | Atualiza o token do dispositivo para notificações |
| `POST` | `/reviews` | Avalia um usuário (1 a 5 estrelas). |
| `GET` | `/reviews/:userId` | Lista todas as avaliações que um usuário recebeu |

### 🛡️ Verificação de Perfil (LGPD & OCR)
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/verifications` | Envia documentos e processa OCR em RAM. |
| `GET` | `/verifications/me` | Retorna o status atual do processo de verificação |

### 👑 Painel de Administração
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/admin/dashboard` | Retorna um raio-x completo do banco de dados |
| `GET` | `/admin/users` | Lista paginada de usuários com filtros (Nome, Email, Cargo) |
| `GET` | `/admin/verifications/pending`| Lista a Fila de Trabalho (Aguardando Análise) |
| `PATCH`| `/admin/verifications/:id` | Aprova/Rejeita verificação manualmente |
| `PATCH`| `/admin/users/:id/ban` | Aplica o Martelo do Ban (Soft Delete) |

### 📦 Doações (Itens)
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/items` | Cadastra uma nova doação (Converte Lat/Lng em PostGIS Point). |
| `GET` | `/items` | Feed Geral: Distância nativa via PostGIS. |
| `GET` | `/items/:id` | Detalhes de um item (Aplica a Trava de 24h). |
| `PUT` | `/items/:id` | Edita os dados do item. |
| `PATCH`| `/items/:id/status` | Altera o status da doação. |
| `DELETE`| `/items/:id` | Remove o item da vitrine (Soft Delete). |

---

## 🔌 Eventos WebSocket (Socket.io)

| Direção | Evento | Payload (JSON) | Descrição |
| :--- | :--- | :--- | :--- |
| `Cliente -> Server` | `join_room` | `roomId` (string) | Conecta o usuário em uma sala específica. |
| `Cliente -> Server` | `send_message` | `{ roomId, senderId, content }` | Envia uma nova mensagem e salva no banco. |
| `Server -> Cliente` | `receive_message`| `{ id, senderId, content, createdAt }` | Emite a mensagem salva para todos na sala. |

---

## 🔧 Configuração e Execução

Certifique-se de configurar as seguintes variáveis de ambiente no seu arquivo `.env`:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/desapega_social
JWT_SECRET=sua_chave_secreta_super_segura
PORT=3333

# Chave de Criptografia AES-256 (DEVE ter exatamente 32 caracteres)
ENCRYPTION_KEY="SuaChavedeCriptografiasecure2026"


# Configurações do Firebase (Opcional - Necessário para Upload manual e Push Notifications)
FIREBASE_PROJECT_ID=seu_project_id
FIREBASE_CLIENT_EMAIL=seu_client_email
FIREBASE_PRIVATE_KEY="sua_private_key"
 
 ```

## Documentação Interativa
Quando o servidor estiver rodando em modo de desenvolvimento, a documentação Swagger gerada automaticamente pelo Zod estará disponível em:   
Swagger UI: http://localhost:3333/docs
