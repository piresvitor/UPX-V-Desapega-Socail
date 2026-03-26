# Desapega Social - Conectando Generosidade e Necessidade

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
* **ODS 12:** Consumo e Produção Responsáveis

## 🛠️ Stack Tecnológica
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
