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

## ✨ Funcionalidades Já Desenvolvidas

### 🛡️ Autenticação e Segurança
* **Onboarding:** Fluxo de apresentação do app para novos usuários.
* **Login & Registro:** Telas conectadas à API para geração de Token JWT.
* **AuthContext (O Porteiro):** Contexto global que protege as rotas. Usuários deslogados não acessam o feed; usuários logados não conseguem voltar para a tela de login.

### 🏠 Feed de Doações (HomeScreen)
* **Geolocalização Automática:** Solicita permissão de GPS nativa e busca a posição atual do usuário (com Fallback para Sorocaba-SP em caso de erro no emulador).
* **Integração Espacial (PostGIS):** Envia as coordenadas para a API e recebe itens ordenados por proximidade.
* **Filtros Dinâmicos:** Barra de busca, chips horizontais de categorias e seletor de raio de distância (KM).
* **Pull-to-Refresh:** Atualização manual do feed arrastando a tela para baixo.

### 🔍 Detalhes da Doação (ItemDetailsScreen)
* **Trava de Prioridade Social (24h):** Lógica que bloqueia o botão de "Solicitar" caso o item seja novo, e o usuário atual não seja verificado (e não seja o dono).
* **Mapa de Privacidade:** Renderiza um `react-native-maps` focado na coordenada do item, desenhando um **círculo de 700 metros** de raio para proteger a casa do doador.
* **Painel do Doador:** Se o usuário logado for o dono do item, a tela exibe controles exclusivos.

### ⚙️ Gestão de Doações (CRUD do Doador)
* **Edição (PUT):** Tela para atualizar Título, Descrição e Categoria sem perder imagens ou coordenadas originais.
* **Status Dinâmico (PATCH):** Menu interativo que permite trocar o status do item entre Disponível, Reservado, Doado ou Cancelado.
* **Remoção (DELETE):** Confirmação em dois passos para fazer o soft-delete do item.

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

