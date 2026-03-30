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
- **Criptografia Padrão Bancário:** O CPF é validado matematicamente e encriptado via `AES-256-CBC` antes de atingir o banco de dados.

### 2. Sistema de Reputação e Confiança
- **Avaliações (1 a 5 estrelas):** Beneficiários, Doadores e Freteiros podem se avaliar após uma interação.
- **Cálculo Transacional:** A média de estrelas e o total de avaliações do usuário são recalculados no banco de dados através de *Transactions* (ACID), garantindo que a nota do perfil esteja sempre sincronizada com a tabela de *reviews*.
- **Regras Anti-Fraude:** Bloqueio nativo em backend para impedir autoavaliações.

### 3. Painel Administrativo (Backoffice)
- **Fila de Trabalho:** Rota exclusiva para listar usuários retidos na malha fina da IA (Aguardando Análise Manual).
- **Moderação de Usuários (O Martelo do Ban):** Implementação de *Soft Delete* (`deletedAt`). Permite que o administrador suspenda usuários infratores sem quebrar a integridade referencial do banco de dados (preservando o histórico de chats e doações do usuário banido).
- **Dashboard de Métricas de Alta Performance:** Rota analítica construída com `Promise.all` e *SQL COUNTs* simultâneos e agrupados, levantando dados vitais da plataforma em milissegundos sem sobrecarregar a memória do servidor Node.js.

### 4. Algoritmo de Prioridade Social (RF03)
- **Trava de Exclusividade de 24h:** Proteção contra atravessadores. Itens recém-cadastrados (com menos de 24h) ficam visíveis exclusivamente para usuários com o selo `isVerified = true`. Usuários comuns recebem status `403 Forbidden` ao tentarem acesso precoce.

### 5. Motor de Busca Geoespacial (RF05)
- O Feed Geral possui integração nativa com o **PostGIS** (`ST_DistanceSphere`). A API recebe a localização atual do usuário e filtra/ordena as doações mais próximas dentro de um raio configurável (ex: 10km).

### 6. Comunicação em Tempo Real (Arquitetura Híbrida)
- **Prevenção de Duplicatas:** "Porteiro" algorítmico garantindo que Doador e Beneficiário tenham apenas uma sala de chat única por item negociado.
- **WebSockets (Socket.io):** Mensagens trafegadas em tempo real e salvas simultaneamente no PostgreSQL para garantir integridade do histórico em caso de quedas de rede do cliente.

### 7. Logística e Frete Solidário
- **Radar de Motoristas:** Utiliza PostGIS para listar solicitações de frete ordenadas pela distância real entre a doação e o motorista. Acesso restrito via RBAC (`role: 'Freteiro'`).
- **Prevenção de Condição de Corrida (Race Condition):** Trava no banco de dados para garantir que, se dois motoristas tentarem aceitar a mesma corrida simultaneamente, apenas o primeiro consiga confirmar a transação.

### 8. Push Notifications (FCM)
- **Notificações Assíncronas:** Disparo automático de notificações em background quando uma nova mensagem de chat é enviada via WebSocket, engajando usuários offline.

---

## 📍 Rotas da API (Endpoints HTTP)

*Nota: Todas as rotas (exceto Públicas, Criação de Usuário e Login) exigem o envio do token JWT no Header: `Authorization: Bearer <SEU_TOKEN>`*

### 🌍 Rota Pública (Landing Page)
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/public/statistics` | Retorna as métricas de impacto (Total de usuários, doações e fretes) para prova social. |

### 👤 Usuários, Autenticação e Reputação
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/users` | Cria um novo usuário |
| `POST` | `/auth` | Realiza login e retorna o Token JWT |
| `GET` | `/users/me` | Retorna o perfil do usuário logado (com média de reputação) |
| `GET` | `/users/:id` | Retorna o perfil público de outro usuário |
| `PATCH`| `/users/fcm-token` | Atualiza o token do dispositivo para Push Notifications |
| `POST` | `/reviews` | Avalia um usuário (1 a 5 estrelas) |
| `GET` | `/reviews/:userId` | Lista todas as avaliações que um usuário recebeu |

### 🛡️ Verificação de Perfil (LGPD & OCR)
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/verifications` | Envia/reenvia documentos via multipart form-data. Processa OCR em RAM. |
| `GET` | `/verifications/me` | Retorna o status atual do processo de verificação do usuário logado |

### 👑 Painel de Administração
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/admin/dashboard` | Retorna um raio-x completo do banco de dados otimizado via SQL COUNT |
| `GET` | `/admin/verifications/pending`| Lista a Fila de Trabalho (Aguardando Análise Manual) com links do Firebase |
| `PATCH`| `/admin/verifications/:id` | Aprova/Rejeita verificação de perfil manualmente, concedendo o selo `isVerified` |
| `PATCH`| `/admin/users/:id/ban` | Aplica ou remove um *Soft Delete* no usuário (Suspensão) |

### 📦 Doações (Itens)
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/items` | Cadastra uma nova doação (suporta múltiplas imagens) |
| `GET` | `/items` | Feed Geral: Lista os itens com filtros via PostGIS (`lat`, `lng`, `radius`) |
| `GET` | `/items/:id` | Detalhes de um item (Aplica a Trava de 24h para não-verificados) |
| `PUT` | `/items/:id` | Edita os dados do item (Apenas para o dono) |
| `PATCH`| `/items/:id/status` | Altera o status (`Disponível`, `Reservado`, `Doado`, `Cancelado`) |
| `DELETE`| `/items/:id` | Remove o item da vitrine (Soft Delete) |

### 💬 Chats e Comunicação
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/chats` | Inicia uma conversa ou recupera a sala existente (Suporta Doação ou Frete) |
| `GET` | `/chats` | Lista a Caixa de Entrada (Inbox) com a última mensagem e dados do remetente |
| `GET` | `/chats/:roomId/messages`| Carrega o histórico de mensagens de uma sala |

### 🚚 Frete Solidário (Logística)
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/freights` | Beneficiário solicita um frete para um item |
| `GET` | `/freights/available` | Radar (PostGIS): Lista fretes próximos. Acesso exclusivo a Freteiros. |
| `PATCH`| `/freights/:id/accept` | Freteiro aceita a corrida e define o valor estimado |
| `PATCH`| `/freights/:id/status` | Atualiza o andamento (`Em Trânsito`, `Finalizado`) |
| `GET` | `/freights/me` | Histórico de viagens do Freteiro ou solicitações do Beneficiário |

---

## 🔌 Eventos WebSocket (Socket.io)

O endpoint do WebSocket roda na mesma porta do servidor HTTP.

| Direção | Evento | Payload (JSON) | Descrição |
| :--- | :--- | :--- | :--- |
| `Celular -> Servidor` | `join_room` | `roomId` (string) | Conecta o usuário em uma sala específica. |
| `Celular -> Servidor` | `send_message` | `{ roomId, senderId, content }` | Envia uma nova mensagem e salva no banco. |
| `Servidor -> Celular` | `receive_message`| `{ id, senderId, content, createdAt... }` | Emite a mensagem salva para todos na sala. |