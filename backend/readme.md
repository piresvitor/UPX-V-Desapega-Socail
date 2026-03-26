# 🚀 API Desapega Social

Backend do aplicativo focado em doações e acessibilidade urbana. Desenvolvido com uma arquitetura moderna e escalável, projetado para suportar buscas geoespaciais e regras de negócio com foco em impacto social.

## 🛠 Tecnologias Utilizadas

- **Node.js & TypeScript:** Base sólida e tipada.
- **Fastify:** Framework web de altíssimo desempenho.
- **Drizzle ORM:** Manipulação de banco de dados *type-safe* e moderna.
- **PostgreSQL + PostGIS:** Banco de dados relacional com extensão espacial para cálculos de GPS.
- **Zod:** Validação rigorosa de dados (Schemas e rotas).
- **JWT (JSON Web Token):** Autenticação e proteção de rotas.


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

---

## 📍 Rotas da API (Endpoints)

Todas as rotas (exceto criação de usuário e login) exigem o envio do token no Header: `Authorization: Bearer <SEU_TOKEN>`

### Usuários e Autenticação
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/users` | Cria um novo usuário |
| `POST` | `/auth` | Realiza login e retorna o Token JWT |
| `GET` | `/users/me` | Retorna o perfil do usuário logado |

### Doações (Itens)
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `POST` | `/items` | Cadastra uma nova doação |
| `GET` | `/items` | Feed Geral: Lista os itens com filtros (`category`, `lat`, `lng`, `radius`) |
| `GET` | `/items/:id` | Detalhes de um item (Aplica a Trava de 24h) |
| `PUT` | `/items/:id` | Edita os dados do item (Apenas para o dono) |
| `PATCH` | `/items/:id/status` | Altera o status (`Disponível`, `Reservado`, `Doado`, `Cancelado`) |
| `DELETE` | `/items/:id` | Remove o item da vitrine (Soft Delete) |

---