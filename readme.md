[NODE__BADGE]: https://img.shields.io/badge/Node.js-20+-43853D?style=for-the-badge&logo=node.js&logoColor=white
[TYPESCRIPT__BADGE]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[FASTIFY__BADGE]: https://img.shields.io/badge/Fastify-202020?style=for-the-badge&logo=fastify&logoColor=white
[POSTGRESQL__BADGE]: https://img.shields.io/badge/PostgreSQL_PostGIS-316192?style=for-the-badge&logo=postgresql&logoColor=white
[DRIZZLE__BADGE]: https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black
[SOCKETIO__BADGE]: https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white
[FIREBASE__BADGE]: https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black
[EXPO__BADGE]: https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white
[REACT_NATIVE__BADGE]: https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[REACT_QUERY__BADGE]: https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=react-query&logoColor=white
[ZOD__BADGE]: https://img.shields.io/badge/Zod-3E63DD?style=for-the-badge&logo=zod&logoColor=white

<h1 align="center" style="font-weight: bold;">🤝 Desapega Social: Economia Circular e Impacto 📦</h1>

### 🔧 Backend
![node][NODE__BADGE] ![fastify][FASTIFY__BADGE] ![typescript][TYPESCRIPT__BADGE] ![postgresql][POSTGRESQL__BADGE] ![drizzle][DRIZZLE__BADGE] ![socketio][SOCKETIO__BADGE] ![firebase][FIREBASE__BADGE] ![zod][ZOD__BADGE]

### 📱 Frontend Mobile
![react_native][REACT_NATIVE__BADGE] ![expo][EXPO__BADGE] ![typescript][TYPESCRIPT__BADGE] ![react_query][REACT_QUERY__BADGE] ![socketio][SOCKETIO__BADGE]

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
- [📱 Fluxos do Sistema](#-fluxos-do-sistema)
- [👥 Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
</details>

## 📋 Sobre o Projeto

O **Desapega Social** é uma solução digital focada em economia circular e impacto social. O objetivo central é conectar doadores de itens usados a pessoas em condição de vulnerabilidade, priorizando quem mais precisa e resolvendo o problema logístico com uma rede de freteiros locais, tudo isso gerido por uma arquitetura moderna e escalável.

### 🎯 Objetivos
1. **Erradicar o Desperdício:** Facilitar a doação de itens, de forma que o que não serve mais para um, seja útil para outro.
2. **Priorização Social:** Beneficiários de baixa renda possuem a garantia de exclusividade nas doações por até 24 horas.
3. **Logística Descomplicada:** Integração direta com freteiros locais para facilitar a entrega em logística ponta a ponta.

### ✨ Funcionalidades Principais
- Acesso com Regra de Negócio Inteligente (Priorização p/ usuários em vulnerabilidade verificados).
- Geolocalização de doadores baseada em Raio seguro p/ UX e privacidade via banco de dados (PostGIS).
- Negociação orgânica em Tempo Real pelo App entre usuários (Sockets).
- Verificação Robusta de Documentações extraindo os textos via OCR Interno (Tesseract.js).
- Gerenciamento seguro de imagens do usuário integrado com Push Notifications.

## 🏗️ Arquitetura do Sistema

A arquitetura do Desapega Social engloba um ecossistema full-stack de alta vazão concebido com foco num **"C4 Model descritivo"**:

O **Sistema Frontend (Mobile)** comunica as intenções do usuário através de um App nativamente desenhado usando React Native acoplado do framework **Expo**. O ciclo de vida na web é garantido com as exibições renderizadas em **Expo Router**. A gerência do estado da internet, as requisições atreladas, o processamento de cache e toda a sincronização da visualização para os usuários em telas pesadas ficam geridas pelo robusto **TanStack Query (React Query)**. Além disto a comunicação fluida de texto em tempo real de doadores em salas online acontece de forma segura pelas abstrações do **Socket.io**.

O App delega a verificação real da informação ao **Sistema Backend (API REST)**. Esta é uma rede baseada em microsserviços lógicos gerenciada via Node.js executando em altíssima velocidade pelo ecossistema do servidor **Fastify**. Nenhuma requisição que toca o banco relacional avança ou adentra falha pois todas recebem parse rígido tipado pelo **Zod** garantindo segurança total da entrada do Schema.

A **Camada de Persistência** consolida todo o fluxo logístico nas mãos do **Drizzle ORM** sendo um proxy direto e tipado para as transações de base nativas no **PostgreSQL**. No coração do algoritmo de Feed Solidário e Frete, empregamos pesadamente a extensão matemática de processamento geo referenciado **PostGIS**. Toda vez que calculamos qual item exibir como prioridade no raio daquele beneficiário utilizamos _raw queries_ de interseção e distanciamento global como _ST_DistanceSphere_.

Ao final das aprovações de conta, acionamos um modulo isolado do servidor como "Oráculo" chamando fluxos do **Firebase** validado por tokens do **Firebase-Admin** enquanto aplicamos nossa própria engenharia computacional executando análise minuciosa OCR para extração da Renda via imagens usando Buffer e a poderosa máquina neural **Tesseract.js**.

## 📁 Estrutura do Projeto

O repositório monolítico atrincheirava em duas potências e pipelines separados:
- `backend/`: Código de infraestrutura de servidor Fastify, banco Drizzle e Socket. ([Veja em detalhes no README do Backend](./backend/README.md))
- `mobile/frontend/`: Código do App Expo Router, Zod e Hooks UI. ([Veja em detalhes no README do Frontend](./mobile/frontend/README.md))

## 🚀 Como Executar o Projeto

1. É necessário ter os ecossistemas do Node.js v20+, Docker e as ferramentas do Expo CLI devidamente preparados nas variáveis do S.O.
2. Clone o repositório Desapega Social original no repositório final.
3. Configure as _Containers_ / bancos em rede portando PostgreSQL e PostGIS.
4. Execute individualmente a injestão de pacotes via `npm install` nas raízes do (`/backend`) e simultaneamente no mobile (`/mobile/frontend`).

Consultem sempre os sub-readme's internos para ver a exata instrução e run scripts específicos do módulo acionado!

## 🔧 Configuração de Variáveis de Ambiente

As seguranças principais que devem ser observadas, nos seus respectivos contêineres e sub-pastas, são compostas fundamentalmente por:
- `DATABASE_URL` (Drizzle Client p/ DB).
- Variáveis de Salting do JWT e chaves simétricas (Env secrets).
- Injeções do App Firebase localizadas via Json na rede ou via SDK-Keys expostas nos .envs do Expo `EXPO_PUBLIC_URL_API`.

## 📍 Endpoints da API

Endpoints abstratos categorizados pelo padrão de entidade e recurso servidos nativamente:
* `/users`: O Auth Provider - Login assíncrono, cadastros vitais com tokens e gerência de informações pessoais.
* `/items`: O Feed provider  - Cadastro e Doação, orquestrando as queries ao PostGIS filtrando restritamente o SoftDelete e avaliando cronogramas do prazo restrito de 24 horas inteligente.
* `/freights`: Criações manuais P2P de modais de entrega para o Freteiro acionado via webhook e notificação em Push.
* `/chat`: Os canais virtuais temporários gerando salas ativas com historico paginado unicamente alocados pelo item no banco.

## 📱 Fluxos do Sistema

### 1. Fluxo de Doação (Feed com Trava Inteligente)
- O **Doador** autentica-se e inicia o workflow da câmera e formulário rico em `items/new`.
- A plataforma grava no PostgresSQL a métrica da coordenada aproximada via PostGis da onde está ocorrendo a intenção de doar.
- Se passarem-se as checagens de validações de perfil, Usuários Beneficiários verificados abrem o seu celular numa "Timeline de doados" baseada no raio geográfico delimitado. Todos os bens há < de 24 horas gerados exibem marcação VIP aos recebedores permitidos na região sem intervenção de outros níveis de cadastro comum.
- Um Chat no módulo Expo transita e viabiliza as conversações diretas a cada Match aceito. 

### 2. Fluxo Logístico do Freteiro (Opcional após o Item Doado)
- Uma vez doado o item, percebe-se que as pontas (A - Doador / B - Beneficiário) não suportam a carga logística do elemento (Ex, Um Fogão Usado pesando 50 Kilos).
- Do própro painel do Chat, o botão interativo para "Contratar Entregador da Rede" engatilha a API.
- Ela busca Freteiros credenciados na vizinhança mais próxima. Freteiro X recebe o "Pop Up Digital". Freteiro da um Match na Logística e dirige o Modal final num roteiro finalizando o fluxo.

### 3. Fluxo de Moderação LGPD do Admin
- Quando usuários fornecem o Extrato de Renda e passam pela Automação do OCR mas alguma suspeita trava, ou algum item criado sofre denúncia por imagens ilegais, o processo cai na esteira global atrelada à _DashBoard Visual Do Administrador_.
- Por ela, ocorrem aprovações assíncronas. Os conteúdos inapropriados, contudo, nunca repousarão apagados destrutivamente da plataforma via HARD DELETE, eles sofrem _soft deletes_. Já os documentos mantidos encriptados mantêm a regra blindada por Criptografia de Base com AES para garantia de regulamento de Leis Gerais e Privacidade.

## 👥 Role-Based Access Control (RBAC)

O ecossistema implementa Middleware e Guards condicionais de restrições globais em tempo real:
- **Beneficiário (isVerified : true / false):** Se for `false`, recebe acesso cortado se atentar à resgatar itens VIP < 24h ou utilizar features sensiveis de freteiros.
- **Doador:** Pode listar e gerenciar as doações dele (Soft Delete de anuncio) irrestrito. 
- **Freteiro:** Role enxuta e utilitária que navega em Telas visíveis onde recebem Jobs de Entregas.
- **Admin / ONG:** Acesso pleno onde a autorização revoga papeis ativos, e a JWT processa as rotas de moderação na esteira geral.