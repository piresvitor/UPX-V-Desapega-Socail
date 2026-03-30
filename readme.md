# Desapega Social - Conectando Generosidade e Necessidade

O **Desapega Social** é uma solução de Transformação Digital focada em economia circular e impacto social. Nosso objetivo é facilitar a doação de itens usados (móveis, roupas, equipamentos de acessibilidade e utensílios), garantindo que cheguem primeiro a quem mais precisa.

---

## 💡 A Proposta
Diferente de marketplaces comuns, o Desapega Social utiliza um **sistema de prioridade inteligente** e geolocalização:
* **Exclusividade Social (A Trava de 24h):** Beneficiários verificados (validação de renda via IA/Admin) possuem 24h de exclusividade para solicitar novos itens, impedindo a ação de atravessadores.
* **Acesso Aberto:** Após o período de carência, os itens ficam disponíveis para o público geral, evitando o desperdício (ODS 12).
* **Logística Integrada (Radar PostGIS):** Conexão direta com freteiros locais através de um radar de proximidade para viabilizar a entrega de itens de grande porte.
* **Sistema de Reputação:** Avaliações mútuas (1 a 5 estrelas) para garantir um ambiente seguro e de confiança para todas as partes.
O **Desapega Social** é uma solução digital focada em economia circular e impacto social na cidade de Sorocaba/SP. Nosso objetivo é facilitar a doação de itens usados (móveis, roupas e utensílios), garantindo que cheguem primeiro a quem mais precisa e resolvendo o gargalo logístico através de uma rede solidária.

---

## 💡 A Proposta e Regras de Negócio
Diferente de marketplaces comuns, o Desapega Social utiliza um **sistema de prioridade inteligente** e arquitetura moderna:
* **Exclusividade Social (A Trava de 24h):** Beneficiários de baixa renda verificados possuem 24 horas de exclusividade para visualizar e solicitar novos itens cadastrados.
* **Acesso Aberto:** Após o período de carência, os itens ficam disponíveis para o público geral, promovendo a economia circular e evitando o desperdício.
* **Logística Integrada (Radar PostGIS):** Conexão direta com freteiros locais através de um algoritmo de geolocalização que mostra os fretes mais próximos disponíveis.
* **Comunicação em Tempo Real:** Chat nativo entre Doador/Beneficiário e Beneficiário/Freteiro para alinhar detalhes da doação e transporte.

## 🌍 ODS Atendidas (ONU)
O projeto está diretamente alinhado com os Objetivos de Desenvolvimento Sustentável da ONU:
* **ODS 1:** Erradicação da Pobreza
* **ODS 10:** Redução das Desigualdades
* **ODS 11:** Cidades e Comunidades Sustentáveis
* **ODS 12:** Consumo e Produção Responsáveis

## 🛠️ Stack Tecnológica

**Backend (API REST & WebSockets):**
* **Node.js com Fastify:** Framework web de altíssimo desempenho e baixa latência.
* **Drizzle ORM & Zod:** Tipagem estrita de ponta a ponta e geração automática de Swagger.
* **PostgreSQL + PostGIS:** Banco de dados relacional com extensão espacial para cálculos de GPS e raio de distância.
* **Tesseract.js & Crypto:** Inteligência Artificial (OCR) processada em RAM e criptografia AES-256 para adequação total à LGPD.
* **Socket.io:** Chat em tempo real para negociação de doações e fretes.
* **Firebase Admin SDK:** Storage seguro para moderação de documentos e envio de Push Notifications.

**Frontend (Mobile):**
* **React Native (Expo):** Desenvolvimento multiplataforma (iOS e Android).
* **Zustand / Context API:** Gerenciamento de estado global.
* *(Em fase de desenvolvimento)*

## 👥 Público-Alvo
1. **Doadores:** Pessoas e empresas com itens em bom estado.
2. **Beneficiários:** Público geral e cidadãos em vulnerabilidade (com selo de prioridade verificado).
3. **Freteiros:** Profissionais autônomos para logística social e geração de renda.
4. **Administradores:** Curadoria da plataforma, moderação de usuários e aprovação manual de documentos.

## 📅 Status do Projeto (UPX)
O projeto encontra-se em fase de **Desenvolvimento Ativo (Construção do App Mobile)**, com a API Backend 100% estruturada, documentada e funcional. 

Este ecossistema está sendo desenvolvido como Projeto de Extensão (UPX) último semestre de **Análise e Desenvolvimento de Sistemas (ADS)** no **Centro Universitário Facens**.

---

### 📂 Navegação do Repositório
* 💻 **`/backend`**: Contém todo o código da API, esquemas do banco de dados e regras de negócios. [Veja o README do Backend aqui](./backend/README.md).
A arquitetura do projeto foi desenhada para ser escalável, segura e de alta performance.

### Backend (API)
* **Ecossistema:** Node.js com TypeScript
* **Framework Web:** Fastify (Alta performance)
* **Banco de Dados:** PostgreSQL relacional
* **ORM:** Drizzle ORM (*Type-safe*)
* **Geolocalização:** Extensão **PostGIS** para cálculos de raio e distância (ST_DistanceSphere).
* **Tempo Real:** Socket.io para chat bidirecional e arquitetura orientada a eventos.
* **Notificações:** Firebase Admin SDK (Cloud Messaging) para Push Notifications assíncronas.
* **Segurança:** Autenticação JWT, Role-Based Access Control (RBAC) e validação de schemas com Zod.

### Frontend (Mobile)
* **Framework:** React Native
* **Integrações:** Câmera/Galeria para envio de documentos, WebSockets Client para chat.

## 👥 Público-Alvo e Papéis (RBAC)
1. **Doador:** Pessoas e empresas com itens em bom estado.
2. **Beneficiário:** Público geral e cidadãos em vulnerabilidade (Selo *isVerified* para prioridade).
3. **Freteiro:** Profissionais ou voluntários com veículos aptos para logística social.
4. **Admin / ONG:** Conta de moderação para validar documentos (RG/CadÚnico) e gerenciar a plataforma.

## 📅 Status do Projeto - UPX (Facens)
Este projeto faz parte da disciplina de Projeto de Extensão (UPX) do curso de **Análise e Desenvolvimento de Sistemas (ADS)** no Centro Universitário Facens.

**Fase Atual:** Desenvolvimento Ativo.
* ✅ **Documentação e Requisitos:** Concluídos.
* ✅ **Backend (API Core):** CRUDs, PostGIS, Autenticação, Chat via Sockets, Regras de Logística e Firebase Finalizados.
* ⏳ **Frontend (Mobile):** Em desenvolvimento.
* ⏳ **Integração Backend/Frontend:** Em andamento.

---
*Desenvolvido com dedicação para transformar a tecnologia em impacto social.*
