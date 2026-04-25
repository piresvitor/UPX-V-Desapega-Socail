[EXPO__BADGE]: https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white
[REACT_NATIVE__BADGE]: https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[REACT_QUERY__BADGE]: https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=react-query&logoColor=white
[TYPESCRIPT__BADGE]: https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white
[SOCKETIO__BADGE]: https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white

<h1 align="center" style="font-weight: bold;">🤝 Desapega Social: Frontend Mobile (App) 📦</h1>

### 📱 Módulos Core Frontend
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
- [📱 Fluxos do Frontend Mobile](#-fluxos-do-frontend-mobile)
- [👥 Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
</details>


## 📋 Sobre o Projeto

O App Frontend consumido externamente e portado da Desapega Social visa ser a ponte digital unificada do Doador, do Beneficiário cadastrado e do Freteiro Logístico em rota operacional da cidade. Mantido fiel às boas diretrizes de UI Responsivizada atreladas à tolerância a falhas na navegação, todo o design tem o papel de manter o fluxo amigável em um ambiente propício com micro-interações seguras e modais adaptativos, processando dados simultâneos e exibindo os geoprocessos sem burocracia.

### 🎯 Objetivos
Fornecer interações responsivas, fluidez alta nas aberturas nativas do OS como Câmera e Galeria, engajamento nos retornos reais do servidor Socket central sobre negociações ativas entre doadores, ao mesmo tempo resguardando UX nativo na submissão de artefatos complexos sensíveis na esteira documental pro time Admin.

### ✨ Funcionalidades Principais
- Integrações puras interligando Galeria nativa e APIs móveis de Câmera (Device/Image Picker Expo).
- Conexões persistentes e estáveis (Socket.io-client) injetadas inteligentemente atrelando o Background Global State do APP.
- Renderização limpa de feed P2P tolerante com Cache local inteligente.
- Componentes modulares acionáveis para visualização do mapa abstrato React Native Maps com abstração em "Raios focais" virtuais para garantia da Privacidade restrita do Doador.

## 🏗️ Arquitetura do Sistema

Em prol de escalar a longo prazo, freamos na decisão técnica priorizando abordagens robustas: nossa base navega totalmente com as propriedades flexíveis nativas providas pelo **Expo Router** fatiando o conceito tradicional em File-Based Routings visivelmente ágeis. 

O fardo exaustivo global de mutações das requests assíncronas do lado Cliente — bem como gerências unificadores sobre loading states vitais, hooks paralelos com falhas pontuais recuperáveis e o polling em cache para um dashboard super fluido, descarregamos toda essa pressão ao incrível **React Query (TanStack Query)** o qual comunica as requisições atreladas nativamente utilizando os adapters centrais expostos em um Hook interceptor robusto de conexões puras `Axios`. É visível na plataforma a garantia da revalidação invisível sem refresco explícito do usuário, atualizando de imediato a UI visual ao interceder na requisição aprovada da reserva de doação efetuada com sucesso!.

Dentro das negociações, optou-se pela abordagem viva de salas por itens contendo seu pipeline P2P. A comunicação e notificações intrínsecas adotam e mantêm referências diretas dos listeners em RealTime utilizando integralmente o **Socket.io**.  Disparos paralelos entre componentes instanciam as bolhas na tela renderizando a timeline estática assim que um Hook capta no background sem block thread algum (utilizando inclusive componentes modais de Keyboard evitando colisões nativamente acoplados com animações Reanimated p/ micro-experiências fantásticas.) 

## 📁 Estrutura do Projeto

Os contêineres vitais do Client mobile concentram logicamente seus esforços na divisão clássica:
- `app/`: Árvores raiz do Roteamento nativo e layouts de navegação tabulada expostas no Expo (Módulos dinâmicos, telas `_layout.tsx`, interceptadores `(auth)`, fluxos de chat pontual com IDs `[id].tsx`).
- `components/`: Bibliotecas internas visuais de Cards sociais da aba Home, Modals logísticos com status paralelos, Botões atômicos e Modos visuais para isolar Views extensas.
- `hooks/`: Os Queries limpos injetando lógica TanStack pura que assinam a consumação isolada em instâncias da API Web baseadas no estado da auth.
- `services/`: A pasta do interceptador vital provendo os Axios instances fixando pontualmente os Tokens gerados na persistência atômica (`AsyncStorage`) para Headers globais Authorization limitando refatorações brutas nas sub-views.
- `constants/`: Dicionários locais p/ cores bases estilizadas (Tokens) p/ o visual unificado (Theming).

## 🚀 Como Executar o Projeto

1. Instalar de fábrica o ecossistema com os pacotes dependentes ativando o Expo Global em terminal com as devidas CLIs nativas.
2. Navegue fisicamente no diretório raiz do App `/mobile/frontend`.
3. Inicie os bundles pesados das dependências empacotadas rodando `npm install`.
4. Definam no topo a variável base da porta remota onde aponta a resolução Node ativa com IP local apropriável (Substitua explicitamente o formato localhost pelo IPv4 da LAN nas validações Expo Go atreladas via WiFi p/ os módulos HTTP baterem sem restrição e falha no Socket em debug real mobile!).
5. Inicialize em terminais executando flag `npx expo start` ou as sub-comandos `npm run android` e/ou `iOS` conectando dispositivos p/ compilar pontualmente no ar!

## 🔧 Configuração de Variáveis de Ambiente

Alocado no encapsulamento estático das raízes internas os diretórios aturarem preferencialmente configurações injetórias dentro do .env contendo:
- `EXPO_PUBLIC_API_URL` -> Endpoint central p/ o Fastify / API HTTPs (ex: `http://192.168.1.5:3333`).

## 📱 Fluxos do Frontend Mobile

### 1. Hub do Feed Home Solidário
- A Dashboard projeta-se em pull-to-refresh e FlatLists robustos lendo pontualmente via Tanstack os cards provenientes do filtro de PostGIS geolocados da Node API. 
- Quando um Artefato postado é mais recente que `< 24 Hrs` uma Tag prioritária brilhará no render UI da tela principal acendendo somente em instâncias autenticadas dos Usuários Validamente Verificados.

### 2. Painel Interativo Item Details
- As abstrações `[id]` do expo coletam os artefatos de metadados das imagens via Carrossel Nativo, detalha se o match de Doação segue vivo para os cliques no CTA orgânico, sem divulgar nativamente a exatidão das pontas aos Doados ate interagir p/ chat.

### 3. Workflow de WebSockets do Chat
- Componente altamente complexo englobando KeyboardViews dinâmicos p/ não oprimir visual na tecla digital acoplado em micro-momentos renderizados assim que os dispatches do `Socket.io-client` ocorrem em fundo nos modais de aceito/rejeição e negociações com o Doador e Beneficiário finais de posse das distâncias de retiradas logísticas.

### 4. Dashboards Integrativas do Freteiro Especializado.
- Com modais visuais ocultos no menu dos Beneficiários tradicionais as sub-telas de "Painéis Entregas" saltam nos perfis logísticos onde visualizações interativas regem botões e confirmações P2P via hooks capturando Jobs orgânicos lançados dentro das conversações das outras pontas (Fretes solidários com aprovações por alertas virtuais intercessoras).

## 👥 Role-Based Access Control (RBAC)

No Front-End esse controle é altamente fluido visualmente atrelando ao Auth Hook ativamente:
- As Abas tabulares dinâmicas do Expo Routing alteram-se baseadas ativamente nas leituras seguras processada na resposta primária (User Role Types) no objeto da Storage Token de login.
- Exclusivamente para "Freteiros", os caminhos do `Tabs` abrem visualizadores logísticos; contraponto, o botão de "Validar Cadastro Vulnerável e Documentos" somem. O acesso manual de Rotas sensíveis restringe internamente a visualização com Redirects interligados sem expor os formulários não devidos do negócio global do Desapega.
