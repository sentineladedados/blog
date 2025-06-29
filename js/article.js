// js/article.js
// Sistema para carregar e exibir artigo individual

class ArticleManager {
  constructor() {
    this.articleId = null;
    this.article = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Obter ID do artigo da URL
      const urlParams = new URLSearchParams(window.location.search);
      this.articleId = urlParams.get('id');

      if (!this.articleId) {
        this.redirectToHome();
        return;
      }

      // Aguardar inicialização do Firebase Manager
      if (!window.firebaseManager.isInitialized()) {
        await window.firebaseManager.initialize();
      }

      // Carregar o artigo
      await this.loadArticle();
      
      this.initialized = true;

    } catch (error) {
      console.error('Erro ao inicializar página do artigo:', error);
      this.showError('Erro ao carregar a página do artigo.');
    }
  }

  async loadArticle() {
    try {
      this.showLoading();

      // Buscar artigo via API proxy
      const result = await window.firebaseManager.getArticle(this.articleId);

      if (result.success && result.article) {
        this.article = result.article;
        this.renderArticle();
        
        // Atualizar contador de visualizações
        await this.updateViews();
        
        // Carregar likes e comentários
        await this.loadInteractions();
        
      } else {
        this.showNotFound();
      }

    } catch (error) {
      console.error('Erro ao carregar artigo:', error);
      this.showError('Não foi possível carregar o artigo. Tente novamente mais tarde.');
    }
  }

  renderArticle() {
    if (!this.article) return;

    // Atualizar título da página
    document.title = `${this.article.title} | Sentinela de Dados`;

    // Atualizar elementos da página
    this.updateElement('article-title', this.article.title);
    this.updateElement('article-category', this.getCategoryInfo().name);
    this.updateElement('article-date', this.formatDate(this.article.date));
    this.updateElement('article-views', this.article.views || 0);

    // Atualizar categoria com cores
    const categoryElement = document.getElementById('article-category');
    if (categoryElement) {
      const categoryInfo = this.getCategoryInfo();
      categoryElement.className = `${categoryInfo.bgColor} ${categoryInfo.textColor} text-xs font-semibold px-2.5 py-0.5 rounded`;
    }

    // Atualizar conteúdo
    const contentElement = document.getElementById('article-content');
    if (contentElement) {
      contentElement.innerHTML = this.article.content || '<p>Conteúdo não disponível.</p>';
    }

    // Esconder loading
    this.hideLoading();
  }

  async updateViews() {
    try {
      const result = await window.firebaseManager.updateViews(this.articleId);
      
      if (result.success) {
        this.updateElement('article-views', result.views);
      }
    } catch (error) {
      console.error('Erro ao atualizar visualizações:', error);
    }
  }

  async loadInteractions() {
    // Implementar carregamento de likes e comentários
    // Por enquanto, usar valores padrão
    this.updateElement('like-count', this.article.likes || 0);
    this.updateElement('comments-count', this.article.commentsCount || 0);
    this.updateElement('like-count-text', `${this.article.likes || 0} ${(this.article.likes || 0) === 1 ? 'pessoa curtiu' : 'pessoas curtiram'}`);

    // Configurar botão de like
    this.setupLikeButton();
    
    // Configurar formulário de comentários
    this.setupCommentForm();
  }

  setupLikeButton() {
    const likeButton = document.getElementById('like-button');
    if (!likeButton) return;

    likeButton.addEventListener('click', async () => {
      if (!window.authManager.isLoggedIn()) {
        if (confirm('Você precisa fazer login para curtir artigos. Deseja fazer login agora?')) {
          await window.authManager.signInWithGoogle();
        }
        return;
      }

      // Implementar lógica de like
      this.toggleLike();
    });
  }

  setupCommentForm() {
    const submitButton = document.getElementById('submit-comment');
    if (!submitButton) return;

    submitButton.addEventListener('click', async () => {
      if (!window.authManager.isLoggedIn()) {
        if (confirm('Você precisa fazer login para comentar. Deseja fazer login agora?')) {
          await window.authManager.signInWithGoogle();
        }
        return;
      }

      await this.submitComment();
    });
  }

  async toggleLike() {
    const likeIcon = document.getElementById('like-icon');
    const likeCount = document.getElementById('like-count');
    
    if (!likeIcon || !likeCount) return;

    try {
      const isLiked = likeIcon.classList.contains('fas');
      const currentCount = parseInt(likeCount.textContent) || 0;

      if (isLiked) {
        // Remover like
        likeIcon.classList.replace('fas', 'far');
        likeCount.textContent = Math.max(0, currentCount - 1);
      } else {
        // Adicionar like
        likeIcon.classList.replace('far', 'fas');
        likeCount.textContent = currentCount + 1;
      }

      this.updateElement('like-count-text', `${likeCount.textContent} ${likeCount.textContent === '1' ? 'pessoa curtiu' : 'pessoas curtiram'}`);

    } catch (error) {
      console.error('Erro ao processar like:', error);
    }
  }

  async submitComment() {
    const commentInput = document.getElementById('comment-input');
    if (!commentInput) return;

    const content = commentInput.value.trim();
    if (!content) {
      alert('Por favor, escreva um comentário antes de enviar.');
      return;
    }

    try {
      // Simular envio de comentário
      const user = window.authManager.getCurrentUser();
      if (!user) return;

      // Adicionar comentário à interface
      this.addCommentToUI({
        userName: user.displayName,
        userPhoto: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`,
        content: content,
        timestamp: new Date()
      });

      // Limpar campo
      commentInput.value = '';

      // Atualizar contador
      const commentsCount = document.getElementById('comments-count');
      if (commentsCount) {
        commentsCount.textContent = parseInt(commentsCount.textContent) + 1;
      }

    } catch (error) {
      console.error('Erro ao enviar comentário:', error);
      alert('Erro ao enviar comentário. Tente novamente.');
    }
  }

  addCommentToUI(comment) {
    const commentsContainer = document.getElementById('comments-container');
    if (!commentsContainer) return;

    const formattedDate = this.formatDate(comment.timestamp);
    
    const commentElement = document.createElement('div');
    commentElement.className = 'mb-6 pb-6 border-b border-gray-100';
    commentElement.innerHTML = `
      <div class="flex items-start">
        <img src="${comment.userPhoto}" alt="${comment.userName}" 
             class="w-10 h-10 rounded-full mr-3 mt-1">
        <div class="flex-1">
          <div class="flex justify-between items-start">
            <h4 class="font-bold text-gray-800">${comment.userName}</h4>
            <span class="text-sm text-gray-500">${formattedDate}</span>
          </div>
          <p class="text-gray-700 mt-2">${comment.content}</p>
        </div>
      </div>
    `;

    // Inserir no início da lista
    commentsContainer.insertBefore(commentElement, commentsContainer.firstChild);
  }

  getCategoryInfo() {
    const categories = {
      'IA': { 
        name: 'Inteligência Artificial',
        bgColor: 'bg-blue-100', 
        textColor: 'text-blue-600'
      },
      'Big Data': { 
        name: 'Big Data',
        bgColor: 'bg-green-100', 
        textColor: 'text-green-600'
      },
      'Cibersegurança': { 
        name: 'Cibersegurança',
        bgColor: 'bg-red-100', 
        textColor: 'text-red-600'
      },
      'Legislação': { 
        name: 'Legislação',
        bgColor: 'bg-purple-100', 
        textColor: 'text-purple-600'
      },
      'Humor': { 
        name: 'Humor',
        bgColor: 'bg-yellow-100', 
        textColor: 'text-yellow-600'
      }
    };
    
    return categories[this.article?.category] || categories['IA'];
  }

  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }).replace(/ de /g, ' ');
      
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Data inválida';
    }
  }

  updateElement(id, content) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = content;
    }
  }

  showLoading() {
    const contentElement = document.getElementById('article-content');
    if (contentElement) {
      contentElement.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
          <p class="text-gray-600">Carregando artigo...</p>
        </div>
      `;
    }
  }

  hideLoading() {
    // Loading é escondido quando o conteúdo é renderizado
  }

  showError(message) {
    const contentElement = document.getElementById('article-content');
    if (contentElement) {
      contentElement.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">Erro ao carregar artigo</h3>
          <p class="text-gray-600 mb-4">${message}</p>
          <button onclick="location.reload()" class="bg-primary hover:bg-blue-800 text-white font-bold py-2 px-4 rounded">
            Tentar novamente
          </button>
        </div>
      `;
    }
  }

  showNotFound() {
    const contentElement = document.getElementById('article-content');
    if (contentElement) {
      contentElement.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-file-alt text-gray-300 text-6xl mb-6"></i>
          <h3 class="text-2xl font-bold text-gray-600 mb-4">Artigo não encontrado</h3>
          <p class="text-gray-500 mb-6">O artigo que você está procurando não existe ou foi removido.</p>
          <a href="index.html" class="bg-primary hover:bg-blue-800 text-white font-bold py-2 px-6 rounded">
            Voltar ao início
          </a>
        </div>
      `;
    }
  }

  redirectToHome() {
    window.location.href = 'index.html';
  }
}

// Instância global
const articleManager = new ArticleManager();

// Inicialização automática
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => articleManager.initialize());
} else {
  articleManager.initialize();
}

// Disponibilizar globalmente
window.articleManager = articleManager;

