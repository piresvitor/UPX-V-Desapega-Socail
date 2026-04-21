[NODE__BADGE]: https://img.shields.io/badge/Node.js-20+-43853D?style=for-the-badge&logo=node.js&logoColor=white
[TYPESCRIPT__BADGE]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[FASTIFY__BADGE]: https://img.shields.io/badge/Fastify-202020?style=for-the-badge&logo=fastify&logoColor=white
[POSTGRESQL__BADGE]: https://img.shields.io/badge/PostgreSQL_PostGIS-316192?style=for-the-badge&logo=postgresql&logoColor=white
[DRIZZLE__BADGE]: https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black
[SOCKETIO__BADGE]: https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white
[FIREBASE__BADGE]: https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black
[ZOD__BADGE]: https://img.shields.io/badge/Zod-3E63DD?style=for-the-badge&logo=zod&logoColor=white

<h1 align="center" style="font-weight: bold;">🤝 Desapega Social: Backend (API REST & Sockets) 📦</h1>

### 🔧 Tecnologias Backend
![node][NODE__BADGE] ![fastify][FASTIFY__BADGE] ![typescript][TYPESCRIPT__BADGE] ![postgresql][POSTGRESQL__BADGE] ![drizzle][DRIZZLE__BADGE] ![socketio][SOCKETIO__BADGE] ![firebase][FIREBASE__BADGE] ![zod][ZOD__BADGE]

<details open="open">
<summary>📑 Sumário</summary>
- [📋 Sobre o Projeto](#-sobre-o-projeto)
  - [🎯 Objetivos](#-objetivos)
  - [✨ Funcionalidades Principais](#-funcionalidades-principais)
- [🏗️ Arquitetura do Sistema](#-arquitetura-do-sistema)
- [📁 Estrutura do Projeto](#-estrutura-do-projeto)
- [🚀 Como Executar o Projeto](#-como-executar-o-projeto)
- [🔧 Configuração de Variáveis de Ambiente](#-configuração-de-variáveis-de-ambiente)
- [📍 Endpoints da API](#-endpoints-da-api)
- [👥 Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
</details>

## 📋 Sobre o Projeto

O Backend do Desapega Social é o cérebro da plataforma que concentra toda a lógica de roteamento em HTTP rápido, processamento pesado em geolocalização e persistência dos perfis de doadores e freteiros solidários do ecossistema. Ele foi construído focado no mais altíssimo rigor e segurança aplicáveis p/ proteger as interações em banco, aplicando conceitos diretos de Soft Delete, Middlewares RBAC escalonáveis e validações com Schemas utilizando Zod nativos.

### 🎯 Objetivos
Fornecer um ambiente REST de altíssimo teor operacional de latência mínima atrelado paralelamente a um túnel interativo e bidirecional em WebSockets visando gerenciar o ambiente P2P fluido dos agentes de logística (freteiro) e das exibições com os beneficiadores.

### ✨ Funcionalidades Principais
- Controle via Middleware e Guards Autenticados com tokens compactados segurados em assinaturas (`@fastify/jwt`).
- Módulo assíncrono interno p/ processamento mecânico visual (OCR) gerido pela biblioteca neuro-adaptável (`tesseract.js`) para extração assertiva de comprovação em contracheques/documentos do usuário.
- Comunicação de mídia de ponta gerenciada seguramente injetada ao Firebase Admin SDK e Firebase Storage.

## 🏗️ Arquitetura do Sistema

A infraestrutura inteira opera alinhada com as melhores práticas de event-loop empregadas num node server orquestrado rigorosamente no **Fastify**. Nenhuma etapa em andamento aceita sujeitas injetando ao pool caso os requests divirjam tipologicamente ou não compactuem com as validações de input em runtime, orquestradamente assegurada via uso em Type-Providers nativos para **Zod** (`fastify-type-provider-zod`).

As injeções transacionais assíncronas do banco rodam a todo vigor sendo interpretadas nativamente num modelo robusto utilizando extensamente o ORM das estrelas: **Drizzle ORM** atrelado às conectividades Postgres nativas. É onde a principal mágica e regra primordial habita: dentro desse Schema base a integração da extensão geográfica **PostGIS** é responsável pelos grandes retornos pesados — permitindo ao Drizzle inserir as famosas `raw queries` e instruções diretas de buscas de intersecção georreferenciadas na tabela `ST_DistanceSphere()`. Tudo isto calculando com primazia as distâncias reais de entrega do item à vizinhança exata que demanda de nossa solidariedade no sistema, repassando um mapa numérico veloz para os feeds limitados dos Modais em tempo hábil.

Simultaneamente um pipeline contínuo fica executando as aberturas do TCP, as gerências do escopo de conversas do ecossistema e despachos passivos de logísticas solidárias baseados no servidor **Socket.io**.

## 📁 Estrutura do Projeto

Mantido a risca via boas práticas modernas do isolamento padrão de pastas, dispomos de:
- `/src/controllers`: Lida estritamente com os envios da serialização JSON do *Request* e invoca um *Response/Reply* processado do caso de Uso.
- `/src/database`: Schema minuncioso do banco, abstrações da lógica Drizzle, seeds migratórios manuais e os construtores centrais de `db`.
- `/src/middlewares`: Módulos limitadores de barreira, englobando a segurança RBAC e extração do Provider JWT por Payload.
- `/src/routes`: Abstrações limpas que constroem as árvores declarando cada Endpoint base englobado aos Plugins via Fastify Route instances.
- `/src/services`: Camada rica para instanciar a real lógica do mundo, manipulação dos Buffers OCR de upload e complexidades analíticas do PostGIS limitadas em isolamento limpo.
- `/tests`: Local habitado p/ injeções vitais p/ o Core rodando os Runners puros com `Vitest`.

## 🚀 Como Executar o Projeto

1. É preciso possuir o npm/Node na v20 ou superior.
2. Navegue internamente pra a base e preencha as _envs_ localmente ao invocar `npm install`.
3. Certifique-se de preencher um driver/instância remota de `postgres` válida que processe a flag PostGIS.
4. Execute `npm run db:generate` logo seguido do processo `npm run db:push` afinal orquestrando as migrations com os DB-Types via Drizzle estaticamente.
5. Inicie sua pipeline de testes locais ativando diretamente com a engine local `npm run dev` (A stack tem configurado nativamente a dependência segura do `tsx`).
6. Se necessário, dispare validações integracionais invocando `npm run test`.

## 🔧 Configuração de Variáveis de Ambiente

Baseie-se que no repositório atrelado é imperioso manter exposto localmente no arquivo `.env` referenciando:
- `DATABASE_URL` num formato válido para client PG: `postgresql://user:pass@host:5432/nomedabase`
- `JWT_SECRET` para assinar via SHA.
- Componente String do SDK Cloud Config JSON das credenciais Admin nativas pro Firebase.

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

### 📦 Doações (Itens) e Fretes
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/items` | Cadastra uma nova doação (Converte Lat/Lng em PostGIS Point). |
| `GET` | `/items` | Feed Geral: Distância nativa via PostGIS. |
| `GET` | `/items/:id` | Detalhes de um item (Aplica a Trava de 24h). |
| `PUT` | `/items/:id` | Edita os dados do item. |
| `PATCH`| `/items/:id/status` | Altera o status da doação. |
| `DELETE`| `/items/:id` | Remove o item da vitrine (Soft Delete). |
| `POST` | `/freights` | Solicita um frete com destino final (Lat/Lng). |
| `GET` | `/freights/available` | Radar de fretes ordenados por proximidade (PostGIS). |
| `PATCH`| `/freights/:id/accept` | Freteiro aceita a corrida e envia proposta. |
| `PATCH`| `/freights/:id/status` | Freteiro atualiza andamento (Em Trânsito, Finalizado). |
| `GET` | `/freights/me` | Lista o histórico de fretes do motorista. |

### 💬 Chat e Mensagens
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/chats` | Cria ou recupera uma sala de chat de doação/frete. |
| `GET` | `/chats` | Lista a Inbox do usuário com últimas mensagens. |
| `GET` | `/chats/:roomId/messages` | Carrega o histórico de mensagens da sala. |
| `PATCH`| `/chats/:roomId/read` | Marca as mensagens não lidas como lidas. |

---

## 🔌 Eventos WebSocket (Socket.io)

| Direção | Evento | Payload (JSON) | Descrição |
| :--- | :--- | :--- | :--- |
| `Cliente -> Server` | `join_room` | `{ roomId }` | Conecta o usuário em uma sala específica. |
| `Cliente -> Server` | `send_message` | `{ roomId, content }` | Envia uma nova mensagem e salva no banco. |
| `Server -> Cliente` | `receive_message`| `{ id, senderId, content, createdAt }` | Emite a mensagem salva para todos na sala. |

## 👥 Role-Based Access Control (RBAC)

Controles firmes feitos diretamente via Fastify Middlewares customizados em injeções Pre-Hook:
- Qualquer instanciamento via `@verifyJwt` bloqueia inatamente conexões avulsas aos endpoints privados de alteração de estado no Postgres.
- Regimentos lógicos diretos no Serviço forçam a intercessão de Papéis invalidando, por modelo: Proíbe na interface o `Beneficiário` de cadastrar ordens diretas de despachos de painéis `Freteiro`, ou intermedeia a validação contida no Token quando checado se ele possuí o booleano `isVerified` ativo nas intersecções da regra vital VIP restrita nas submissões recentes.
