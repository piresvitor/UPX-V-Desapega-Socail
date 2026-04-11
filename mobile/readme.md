# 📱 Desapega Social - Frontend Mobile

Este é o aplicativo mobile do projeto **Desapega Social**, focado em conectar doadores e pessoas que precisam de doações através de geolocalização. Desenvolvido com React Native e Expo.

## 🚀 Tecnologias e Dependências Principais

* **[Expo](https://expo.dev/) & React Native:** Framework principal para desenvolvimento cross-platform (Android/iOS).
* **[Expo Router](https://docs.expo.dev/router/introduction/):** Navegação baseada em arquivos (File-based routing), gerenciando Tabs e Stacks.
* **[TypeScript](https://www.typescriptlang.org/):** Tipagem estática para maior segurança e previsibilidade do código.
* **[TanStack Query (React Query)](https://tanstack.com/query/latest):** Gerenciamento de estado assíncrono, cache inteligente e revalidação das requisições ao Backend.
* **[AsyncStorage](https://react-native-async-storage.github.io/async-storage/):** Armazenamento local persistente para Tokens JWT e status de Onboarding.
* **[Expo Location](https://docs.expo.dev/versions/latest/sdk/location/):** Captura da latitude e longitude do usuário via GPS do dispositivo.
* **[React Native Maps](https://github.com/react-native-maps/react-native-maps):** Renderização de mapas nativos (Google Maps) para exibir a área aproximada de doações.

## 📂 Estrutura de Pastas

O projeto segue a arquitetura baseada em rotas do Expo Router, mantendo serviços e contextos isolados:

```text
mobile/frontend/
├── app/                  # Roteamento baseado em arquivos (Expo Router)
│   ├── (auth)/           # Rotas públicas (Login, Cadastro)
│   ├── (tabs)/           # Rotas protegidas (Bottom Tab Bar: Home, Create, Profile)
│   ├── item/             # Telas de itens dinâmicos ([id].tsx, edit/[id].tsx)
│   ├── user/             # Telas de perfis dinâmicos ([id].tsx Público)
│   ├── _layout.tsx       # Layout Raiz (Providers de Autenticação e TanStack Query)
│   └── onboarding.tsx    # Fluxo de boas-vindas
├── src/                  # Lógica de negócios e configurações
│   ├── contexts/         # Contextos globais (ex: AuthContext)
│   └── services/         # Clientes de API (ex: api.ts com Axios)
├── assets/               # Imagens estáticas, ícones e fontes
├── package.json          # Dependências e scripts do projeto
└── README.md             # Documentação do Frontend
```

## Funcionalidades Já Desenvolvidas

### 🛡️ Autenticação e Segurança
* **Onboarding:** Fluxo de apresentação do app para novos usuários.
* **Login & Registro:** Telas conectadas à API para geração de Token JWT.
* **AuthContext:** Contexto global que protege rotas. Impede acesso de não-logados ao app e impede que logados voltem à tela de login.

### 🏠 Feed de Doações (HomeScreen)
* **Geolocalização Automática:** Solicita permissão de GPS nativa e busca a posição atual do usuário.
* **Integração Espacial (PostGIS):** Envia coordenadas para a API e recebe itens ordenados por proximidade (Raio em KM).
* **Filtros Dinâmicos:** Barra de busca, chips de categorias e revalidação instantânea de dados via pull-to-refresh.

### ➕ Nova Doação (CreateScreen)
* **Captura de Mídia Integrada:** Permite ao usuário tirar até 3 fotos usando a câmera do dispositivo ou selecioná-las diretamente da galeria (expo-image-picker).
* **Upload na Nuvem (Firebase Storage):** Processamento de imagem em Blob e envio direto para o Firebase usando o Client SDK (protegido por variáveis de ambiente .env e fallback). Retorna URLs públicas de alta velocidade (CDN).
* **GPS Embutido:** Coleta silenciosa das coordenadas exatas no momento da publicação (expo-location) com sistema de fallback caso o GPS falhe, garantindo que o usuário não seja travado.
* **Sincronização de Estado:** Após o envio bem-sucedido (POST /items), invalida automaticamente o cache do TanStack Query, atualizando o Feed e o Perfil instantaneamente sem necessidade de recarregar o app.

### 🔍 Detalhes da Doação (ItemDetailsScreen)
* **Trava de Prioridade Social (24h):** Bloqueia a solicitação do item caso seja novo e o usuário não seja verificado (exceto se for o dono).
* **Mapa de Privacidade:** Renderiza um mapa interativo desenhando um círculo de 700 metros de raio, protegendo o endereço exato do doador.
* **Painel do Doador:** Ferramentas exclusivas exibidas apenas para o criador do item.

### ⚙️ Gestão de Doações (CRUD do Doador)
* **Edição (PUT):** Tela inteligente para atualizar textos sem perder dados geográficos ou imagens.
* **Status Dinâmico (PATCH):** Menu nativo interativo para alternar entre "Disponível", "Reservado", "Doado" ou "Cancelado".
* **Remoção (DELETE):** Confirmação segura para exclusão da doação.

### 💬 Chat em Tempo Real e Inbox
* **Comunicação Bi-direcional (WebSockets):** Integração com `socket.io-client` para troca de mensagens instantâneas entre doador e beneficiário sem necessidade de recarregar a tela (Pull-to-Refresh).
* **Gestão de Estado de Conexão:** Feedback visual (Status Dot verde/vermelho) indicando a saúde da conexão do Socket no cabeçalho do chat.
* **Inbox Inteligente (TanStack Query):** Lista de conversas ativas com cache reativo. Apresenta prévia da última mensagem, prefixo "Você:" para mensagens próprias e badge de "Não Lida" (bolinha azul) para mensagens pendentes.
* **Leitura Automática:** Sistema silencioso que atualiza o status de leitura (`readAt`) via PATCH ao abrir a sala de chat, invalidando o cache e atualizando a interface da Inbox em tempo real.
* **Push Notifications (Firebase Cloud Messaging):** Captura nativa do Device Token usando `expo-notifications`. O backend processa o envio de notificações em background de forma concorrente para não travar o fluxo do WebSocket.

### 👤 Gestão de Perfil e Usuários
* **Perfil Pessoal:** Hub com dados do usuário, média de estrelas e selo inteligente de "Autenticado Via IA".
* **Minhas Doações e Avaliações:** Listagens integradas nativamente na aba de perfil para controle rápido.
* **Edição de Perfil:** Modal interativo para alteração de nome e redefinição de senha.
* **Deleção em Cascata (Soft Delete):** Exclusão de conta protegida por senha que, através de uma transação no banco de dados, remove automaticamente todos os itens do usuário da plataforma.
* **Perfil Público:** Tela dedicada para interessados verificarem a reputação e histórico de avaliações de um doador antes do contato.

## 🛠️ Como Executar o Projeto

1.  Instale as dependências:
    ```bash
    npm install
    ```
2.  Inicie o servidor do Expo limpando o cache:
    ```bash
    npx expo start -c
    ```
3.  Pressione `a` para abrir no emulador Android ou leia o QR Code com o app Expo Go no seu celular físico.

