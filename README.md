# Sentinela de Dados - Blog

## Visão Geral

Este projeto é um blog desenvolvido para a plataforma Sentinela de Dados, focado em artigos sobre Inteligência Artificial, Big Data, Cibersegurança e Legislação. Ele foi projetado para ser dinâmico, com conteúdo gerenciado via Firebase, e inclui funcionalidades como carrossel de artigos, páginas de categoria, busca avançada, newsletter e formulário de contato. O projeto foi recentemente revisado e aprimorado para garantir segurança e funcionalidade, especialmente na proteção da API Key do Firebase e na estabilidade das interações com o backend.

## Funcionalidades

- **Gerenciamento de Conteúdo com Firebase:** Artigos armazenados e gerenciados em uma base de dados Firebase Firestore, permitindo atualização dinâmica do conteúdo do blog.

- **Segurança da API Key:** Implementação de um proxy Flask para proteger a API Key do Firebase, evitando sua exposição direta no frontend e garantindo uma comunicação segura com o banco de dados.

- **Carrossel de Artigos Dinâmico:** Exibição de artigos em destaque na página inicial através de um carrossel interativo, com carregamento dinâmico do conteúdo.

- **Páginas de Categoria:** Artigos organizados por categorias (Inteligência Artificial, Big Data, Cibersegurança, Legislação, Humor), com páginas dedicadas para cada uma, permitindo fácil navegação e filtragem.

- **Funcionalidade de Busca Avançada:** Sistema de busca que permite aos usuários encontrar artigos por palavras-chave, categorias e filtros de data, com sugestões de buscas populares.

- **Sistema de Newsletter:** Formulário de inscrição para newsletter, permitindo que os visitantes recebam atualizações e novos artigos diretamente em seus e-mails. O sistema inclui validação de e-mail e gerenciamento de inscrições.

- **Formulário de Contato:** Um formulário de contato funcional para que os usuários possam enviar mensagens diretamente para os administradores do blog, com validação de dados e notificações.

- **Autenticação de Usuários:** Integração com Firebase Authentication para gerenciamento de usuários (login/logout), essencial para funcionalidades como likes e comentários.

- **Sistema de Likes e Comentários:** Os usuários podem curtir artigos e deixar comentários, promovendo a interação e o engajamento com o conteúdo.

- **Página de Administração (Admin Panel):** Uma interface para administradores inserirem novos artigos, gerenciando o conteúdo do blog de forma centralizada.

- **Design Responsivo:** O layout do blog é totalmente responsivo, adaptando-se a diferentes tamanhos de tela (desktops, tablets e smartphones), garantindo uma experiência de usuário consistente.

## Estrutura do Projeto

O projeto é dividido em duas partes principais: o frontend (HTML, CSS, JavaScript) e o backend (Flask), que atua como um proxy para o Firebase e gerencia as funcionalidades de newsletter e contato.

```
blog_corrigido/
├── index.html              # Página principal do blog
├── article.html            # Página de visualização e leitura de um artigo
├── category.html           # Página de visualização de artigos separados por categoria
├── search.html             # Página de busca de artigos
├── admin.html              # Página de inserção de novos artigos
├── js/
│   ├── firebase-config.js  # Configuração segura do Firebase (usa o proxy)
│   ├── auth.js             # Configuração de autenticação do Firebase
│   ├── articles.js         # Lógica para carregar e exibir artigos na página principal
│   ├── article.js          # Lógica para carregar e exibir um artigo individual
│   ├── category.js         # Lógica para carregar e exibir artigos por categoria
│   ├── search-manager.js   # Lógica para a funcionalidade de busca
│   └── forms.js            # Lógica para os formulários de newsletter e contato
├── img/
│   └── Logo_NoName_NoBg.png # Imagem do banner/logo
└── backend/
    └── blog_api/
        ├── .env            # Variáveis de ambiente para o backend (Firebase Keys, SMTP, etc.)
        ├── src/
        │   ├── main.py     # Aplicação Flask principal e rotas
        │   ├── models/
        │   │   └── user.py # Modelo de usuário (exemplo, pode ser expandido)
        │   ├── routes/
        │   │   ├── firebase_proxy.py # Rota para proxy do Firebase
        │   │   ├── contact.py        # Rota para o formulário de contato
        │   │   ├── newsletter.py     # Rota para o sistema de newsletter
        │   │   └── user.py           # Rota para autenticação de usuário (exemplo)
        │   └── database/
        │       └── app.db            # Banco de dados SQLite (para contatos/newsletter)
        ├── requirements.txt # Dependências Python do backend
        └── data/           # Diretório para armazenar dados (contatos.json, newsletter_subscribers.json)
```

## Instalação e Configuração

Siga os passos abaixo para configurar e rodar o projeto localmente.

### Pré-requisitos

- Python 3.8+

- Node.js e npm (ou yarn)

- Conta Firebase com um projeto configurado (Firestore, Authentication)

### 1. Clonar o Repositório

```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd blog_corrigido
```

### 2. Configurar o Backend (Flask)

Navegue até o diretório do backend:

```bash
cd backend/blog_api
```

Crie um ambiente virtual e instale as dependências:

```bash
python -m venv venv
source venv/bin/activate  # No Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

Crie um arquivo `.env` na raiz do diretório `backend/blog_api` com suas credenciais do Firebase e configurações de e-mail. **Nunca exponha suas chaves diretamente no código fonte!**

```
# Firebase Configuration
FIREBASE_API_KEY="SUA_API_KEY_DO_FIREBASE"
FIREBASE_AUTH_DOMAIN="SEU_PROJETO.firebaseapp.com"
FIREBASE_PROJECT_ID="SEU_PROJECT_ID"
FIREBASE_STORAGE_BUCKET="SEU_PROJETO.appspot.com"
FIREBASE_MESSAGING_SENDER_ID="SEU_MESSAGING_SENDER_ID"
FIREBASE_APP_ID="SEU_APP_ID"

# Email Configuration (Opcional - para formulário de contato e newsletter)
# Use um email e senha de aplicativo se estiver usando Gmail
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT=587
SMTP_USERNAME="seu_email@example.com"
SMTP_PASSWORD="sua_senha_de_aplicativo"
ADMIN_EMAIL="email_do_administrador@example.com"

# Security
SECRET_KEY="UMA_CHAVE_SECRETA_FORTE_E_UNICA"
FLASK_DEBUG=True # Mude para False em produção
```

Inicie o servidor Flask:

```bash
python src/main.py
```

O backend estará rodando em `http://localhost:5001` (ou na porta configurada no `main.py`).

### 3. Configurar o Frontend

No arquivo `js/forms.js`, atualize a `apiBaseUrl` para apontar para o seu backend. Se estiver rodando localmente, mantenha `http://localhost:5001/api`. Para produção, use a URL do seu backend.

```javascript
// js/forms.js
class FormsManager {
  constructor() {
    this.apiBaseUrl = 'http://localhost:5001/api'; // Mude para a URL do seu backend em produção
    // ...
  }
  // ...
}
```

### 4. Configurar Firebase (Console)

1. **Firestore Security Rules:** Configure as regras de segurança do Firestore para permitir leitura e escrita de artigos, comentários e likes de forma segura.

1. **Authentication:** Ative os métodos de autenticação que deseja usar (e.g., Google, Email/Senha).

1. **Domínios Autorizados:** Adicione `http://localhost:8080` (ou a porta que você usar para o frontend local) e o domínio de produção do seu blog à lista de domínios autorizados no Firebase Authentication.

### 5. Rodar o Frontend

Você pode servir os arquivos HTML, CSS e JavaScript usando um servidor HTTP simples. Navegue até a raiz do projeto (`blog_corrigido/`) e execute:

```bash
python -m http.server 8080
```

Abra seu navegador e acesse `http://localhost:8080`.

## Uso

### Adicionar Artigos

Acesse a página `admin.html` (e.g., `http://localhost:8080/admin.html`) para inserir novos artigos no Firebase. Certifique-se de que suas regras de segurança do Firestore permitem a escrita.

### Navegação

- **Página Inicial (****`index.html`****):** Exibe o carrossel de artigos em destaque e categorias.

- **Artigo Individual (****`article.html?id=<ID_DO_ARTIGO>`****):** Visualiza um artigo completo, com seções de likes e comentários.

- **Página de Categoria (****`category.html?cat=<NOME_DA_CATEGORIA>`****):** Lista artigos de uma categoria específica.

- **Página de Busca (****`search.html`****):** Permite buscar artigos por texto e filtros.

### Newsletter e Contato

Os formulários de newsletter e contato estão disponíveis no frontend e enviam dados para o backend Flask, que os processa e armazena (e opcionalmente envia e-mails de notificação).

## Contribuição

Contribuições são bem-vindas! Siga estas diretrizes:

1. Faça um fork do repositório.

1. Crie uma nova branch para sua feature (`git checkout -b feature/MinhaNovaFeature`).

1. Faça suas alterações e commite-as (`git commit -m 'feat: Adiciona nova feature'`).

1. Envie para o repositório original (`git push origin feature/MinhaNovaFeature`).

1. Abra um Pull Request.

## Licença

Este projeto está licenciado sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## Suporte

Para qualquer dúvida ou problema, por favor, abra uma issue no repositório do GitHub ou entre em contato com o administrador do projeto.

---

**Data:** 27 de Junho de 2025
