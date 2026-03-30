# 🚀 Desapega Social - Conectando Generosidade e Necessidade

O **Desapega Social** é uma solução de Transformação Digital focada em economia circular e impacto social. Nosso objetivo é facilitar a doação de itens usados (móveis, roupas, equipamentos de acessibilidade e utensílios), garantindo que cheguem primeiro a quem mais precisa.

---

## 💡 A Proposta
Diferente de marketplaces comuns, o Desapega Social utiliza um **sistema de prioridade inteligente** e geolocalização:
* **Exclusividade Social (A Trava de 24h):** Beneficiários verificados (validação de renda via IA/Admin) possuem 24h de exclusividade para solicitar novos itens, impedindo a ação de atravessadores.
* **Acesso Aberto:** Após o período de carência, os itens ficam disponíveis para o público geral, evitando o desperdício (ODS 12).
* **Logística Integrada (Radar PostGIS):** Conexão direta com freteiros locais através de um radar de proximidade para viabilizar a entrega de itens de grande porte.
* **Sistema de Reputação:** Avaliações mútuas (1 a 5 estrelas) para garantir um ambiente seguro e de confiança para todas as partes.

## 🌍 ODS Atendidas (ONU)
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
