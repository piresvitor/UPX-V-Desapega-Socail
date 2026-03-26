# API Desapega Social

Backend do aplicativo focado em doações e acessibilidade urbana. Desenvolvido com uma arquitetura moderna e escalável, projetado para suportar buscas geoespaciais e regras de negócio com foco em impacto social.

## 🛠 Tecnologias Utilizadas

- **Node.js & TypeScript:** Base sólida e tipada.
- **Fastify:** Framework web de altíssimo desempenho.
- **Drizzle ORM:** Manipulação de banco de dados *type-safe* e moderna.
- **PostgreSQL + PostGIS:** Banco de dados relacional com extensão espacial para cálculos de GPS.
- **Node.js Crypto (AES-256-CBC):** Criptografia nativa de padrão bancário para proteção de dados sensíveis.
- **Socket.io:** Implementação de WebSockets para comunicação em tempo real bidirecional.
- **Firebase Admin SDK:** Integração com os servidores do Google para disparo de Push Notifications e gestão de Storage.
- **Zod:** Validação rigorosa de dados (Schemas e rotas).
- **JWT (JSON Web Token):** Autenticação e proteção de rotas.

---

## ✨ Funcionalidades e Regras de Negócio Implementadas

### 1. Autenticação e Gestão de Usuários
- Cadastro de novos usuários.
- Autenticação de usuários via JWT.
- Rotas protegidas (Apenas usuários logados acessam o sistema).
- Identificação de **Usuários Verificados** (`isVerified`).

### 2. Gestão de Doações (CRUD de Itens)
- **Criação de Itens:** Suporte para cadastro de itens com até 3 imagens (URLs via Firebase Storage).
- **Soft Delete:** Remoção lógica (`deletedAt`) para preservação de histórico e métricas de impacto.
- **Atualização de Dados e Status:** Separação entre a edição completa do item (`PUT`) e a alteração rápida de status (`PATCH`). Validação para que apenas o doador original possa alterar ou apagar seu item.

### 3. Algoritmo de Prioridade Social (RF03)
- **Trava de Exclusividade de 24h:** O sistema possui uma regra de proteção contra atravessadores. Itens recém-cadastrados (com menos de 24h) ficam visíveis exclusivamente para usuários com o selo `isVerified = true`. Usuários comuns recebem status `403 Forbidden` se tentarem acessar a doação por link direto.

### 4. Motor de Busca Geoespacial (RF05)
- O Feed Geral (`GET /items`) possui integração nativa com o **PostGIS** (`ST_DistanceSphere`).
- Quando o aplicativo (React Native) envia a latitude e longitude do usuário, a API automaticamente filtra itens dentro de um raio de 10km e **ordena os resultados por proximidade**, mostrando as doações mais próximas no topo da lista.

### 5. Comunicação em Tempo Real (Arquitetura Híbrida)
- **Prevenção de Duplicatas:** O sistema atua como "porteiro", garantindo que Doador e Beneficiário tenham apenas uma sala de chat única por item.
- **Inbox Inteligente:** A rota de listagem de chats retorna automaticamente os dados da "outra pessoa" da conversa e o último texto enviado.
- **WebSockets (Socket.io):** As mensagens são trafegadas em tempo real via eventos WebSocket e salvas simultaneamente no PostgreSQL para garantir a integridade do histórico (mesmo em quedas de conexão).

### 6. Logística e Frete Solidário
- **Radar de Motoristas:** Utiliza PostGIS para listar solicitações de frete ordenadas pela distância real entre o item e a localização atual do motorista (Freteiro).
- **Role-Based Access Control (RBAC):** Rotas protegidas para garantir que apenas usuários com o papel de `Freteiro` possam ver o radar e aceitar corridas.
- **Prevenção de Condição de Corrida (Race Condition):** Trava no banco de dados para garantir que, se dois motoristas tentarem aceitar a corrida ao mesmo tempo, apenas o primeiro consiga e o item suma do radar.
- **Histórico Duplo:** Rota de histórico inteligente que adapta a resposta dependendo se o usuário logado solicitou o frete (Beneficiário) ou realizou a entrega (Motorista).

### 7. Push Notifications (FCM)
- **Registro de Dispositivos:** Rota para salvar o Token FCM do dispositivo do usuário.
- **Notificações Assíncronas:** Disparo automático de notificações em background quando uma nova mensagem de chat é enviada via WebSocket, engajando usuários offline.

### 8. Verificação de Identidade e Adequação à LGPD
- **Criptografia Padrão Bancário:** Proteção de dados sensíveis (CPF) utilizando o algoritmo `AES-256-CBC`. O dado original nunca é salvo em texto puro no banco.
- **Validação Matemática Avançada:** Bloqueio de CPFs matematicamente inválidos antes de atingirem o banco de dados via schemas customizados no `Zod`.
- **Painel de Administração (RBAC):** Middleware de segurança (`requireAdmin`) garantindo que apenas administradores possam aprovar ou rejeitar documentos de comprovação de renda.
- **Diretrizes LGPD (Privacy by Design):** Integração com o Firebase Storage para destruição automática das fotos de documentos sensíveis imediatamente após a análise do administrador.
- **Máquina de Estados de Solicitação:** Fluxo inteligente que permite o reenvio de documentos em caso de rejeição, bloqueando envios duplicados e spam enquanto a análise estiver pendente.

---

## 📍 Rotas da API (Endpoints HTTP)

Todas as rotas (exceto criação de usuário e login) exigem o envio do token no Header: `Authorization: Bearer <SEU_TOKEN>`

### Usuários e Autenticação
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/users` | Cria um novo usuário |
| `POST` | `/auth` | Realiza login e retorna o Token JWT |
| `GET` | `/users/me` | Retorna o perfil do usuário logado |
| `PATCH`| `/users/fcm-token` | Atualiza o token do dispositivo para Push Notifications |

### Verificação de Perfil (Segurança e LGPD)
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/verifications` | Envia/reenvia documentos e CPF (Criptografado na hora) |
| `PATCH` | `/verifications/:id/analyze` | Aprova/Rejeita pedido, concede selo e destrói imagens (Apenas Admin) |

### Doações (Itens)
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/items` | Cadastra uma nova doação |
| `GET` | `/items` | Feed Geral: Lista os itens com filtros (`category`, `lat`, `lng`, `radius`) |
| `GET` | `/items/:id` | Detalhes de um item (Aplica a Trava de 24h) |
| `PUT` | `/items/:id` | Edita os dados do item (Apenas para o dono) |
| `PATCH` | `/items/:id/status` | Altera o status (`Disponível`, `Reservado`, `Doado`, `Cancelado`) |
| `DELETE` | `/items/:id` | Remove o item da vitrine (Soft Delete) |

### Chats e Comunicação
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/chats` | Inicia uma conversa ou recupera a sala existente (Suporta Doação ou Frete) |
| `GET` | `/chats` | Lista a Caixa de Entrada (Inbox) com todas as conversas do usuário |
| `GET` | `/chats/:roomId/messages`| Carrega o histórico das últimas 50 mensagens de uma sala |

### Frete Solidário (Logística)
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/freights` | O Beneficiário solicita um frete para um item |
| `GET` | `/freights/available` | Radar (PostGIS): Lista fretes próximos. Acesso restrito a Freteiros. |
| `PATCH` | `/freights/:id/accept` | O Freteiro aceita a corrida e define o valor estimado |
| `PATCH` | `/freights/:id/status` | Atualiza o andamento (`Em Trânsito`, `Finalizado`) |
| `GET` | `/freights/me` | Histórico de viagens do Freteiro ou solicitações do Beneficiário |

---

## 🔌 Eventos WebSocket (Socket.io)

O endpoint do WebSocket roda na mesma porta do servidor HTTP (`http://localhost:3333`).

| Direção | Evento | Payload (JSON) | Descrição |
| :--- | :--- | :--- | :--- |
| `Celular -> Servidor` | `join_room` | `roomId` (string) | Conecta o usuário em uma sala específica. |
| `Celular -> Servidor` | `send_message` | `{ roomId, senderId, content }` | Envia uma nova mensagem e salva no banco. |
| `Servidor -> Celular` | `receive_message`| `{ id, senderId, content, createdAt... }` | Emite a mensagem salva para todos na sala. |