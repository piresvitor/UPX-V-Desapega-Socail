# 🤝 Desapega Social - Conectando Generosidade e Necessidade

O **Desapega Social** é uma solução digital focada em economia circular e impacto social na cidade de Sorocaba/SP. Nosso objetivo é facilitar a doação de itens usados (móveis, roupas, equipamentos de acessibilidade e utensílios), garantindo que cheguem primeiro a quem mais precisa e resolvendo o gargalo logístico através de uma rede solidária.

---

## 💡 A Proposta e Regras de Negócio
Diferente de marketplaces comuns, o Desapega Social utiliza um **sistema de prioridade inteligente** e arquitetura baseada em geolocalização:

* **Exclusividade Social (A Trava de 24h):** Beneficiários de baixa renda verificados (validação de renda via IA/Admin) possuem 24 horas de exclusividade para visualizar e solicitar novos itens cadastrados, impedindo a ação de atravessadores.
* **Acesso Aberto:** Após o período de carência, os itens ficam disponíveis para o público geral, promovendo a economia circular.
* **Logística Integrada (Radar PostGIS):** Conexão direta com freteiros locais através de um algoritmo que mostra as opções logísticas mais próximas para viabilizar a entrega de itens de grande porte.
* **Sistema de Reputação:** Avaliações mútuas (1 a 5 estrelas) para garantir um ambiente seguro e de confiança para todas as partes.

## 🌍 ODS Atendidas (ONU)
O projeto está diretamente alinhado com os Objetivos de Desenvolvimento Sustentável da ONU:
* **ODS 1:** Erradicação da Pobreza
* **ODS 10:** Redução das Desigualdades
* **ODS 11:** Cidades e Comunidades Sustentáveis
* **ODS 12:** Consumo e Produção Responsáveis

## 🛠️ Stack Tecnológica

A arquitetura do projeto foi desenhada para ser escalável, segura e de alta performance.

**Backend (API REST & WebSockets):**
* **Node.js + Fastify + TypeScript:** Framework de altíssimo desempenho e tipagem estrita de ponta a ponta com **Zod**.
* **Drizzle ORM & PostgreSQL:** Banco de dados relacional.
* **Geolocalização Nativa:** Extensão **PostGIS** para cálculos matemáticos precisos de raio e distância (ST_DistanceSphere).
* **Tempo Real:** Socket.io para chat bidirecional de negociação.
* **Processamento e Segurança:** Inteligência Artificial (OCR Tesseract.js) processada em RAM e criptografia AES-256 para adequação à LGPD.
* **Firebase Admin SDK:** Storage seguro e Push Notifications (Cloud Messaging).

**Frontend (Mobile App):**
* **React Native (Expo):** Desenvolvimento multiplataforma (iOS e Android).
* **Expo Router:** Roteamento de telas nativas baseado em arquivos (File-based routing).
* **TanStack Query:** Gerenciamento de estado de requisições, cache inteligente e revalidação.
* **React Native Maps:** Renderização de mapas nativos focados em privacidade (raios de aproximação em vez de pino exato).

## 👥 Público-Alvo e Papéis (RBAC)
1. **Doador:** Pessoas e empresas com itens em bom estado.
2. **Beneficiário:** Público geral e cidadãos em vulnerabilidade (com selo de prioridade *isVerified*).
3. **Freteiro:** Profissionais autônomos para logística social e geração de renda.
4. **Admin / ONG:** Curadoria da plataforma, moderação e aprovação manual de documentos.

## 📅 Status do Projeto (UPX)
Este ecossistema está sendo desenvolvido como Projeto de Extensão (UPX) do último semestre de **Análise e Desenvolvimento de Sistemas (ADS)** no **Centro Universitário Facens** (Sorocaba-SP).

**Fase Atual:** Integração e Construção do App Mobile.
* ✅ **Documentação e Requisitos:** Concluídos.
* ✅ **Backend (API Core):** CRUDs, PostGIS, Autenticação, Trava de 24h, WebSockets e Firebase Finalizados.
* ✅ **Frontend (UI Core & Maps):** Autenticação, Feed com Filtros Geográficos e CRUD do Doador finalizados.
* ⏳ **Frontend (Funcionalidades Avançadas):** Chat e Fluxo Logístico em andamento.

---

### 📂 Navegação do Repositório
* ⚙️ **`/backend`**: Contém todo o código da API, esquemas do banco de dados (Drizzle) e regras de negócios. [Veja o README do Backend aqui](./backend/README.md).
* 📱 **`/mobile/frontend`**: Contém o aplicativo React Native, Telas e integrações com mapas. [Veja o README do Frontend aqui](./mobile/frontend/README.md).

---
*Desenvolvido com dedicação para transformar a tecnologia em impacto social.*