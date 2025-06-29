// js/category.js
// Sistema para página de categoria

class CategoryManager {
  constructor() {
    this.categorySlug = null;
    this.categoryInfo = null;
    this.articles = [];
    this.filteredArticles = [];
    this.currentView = 'grid';
    this.currentSort = 'newest';
    this.currentTag = 'all';
    this.searchQuery = '';
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Obter categoria da URL
      const urlParams = new URLSearchParams(window.location.search);
      this.categorySlug = urlParams.get('cat');

      if (!this.categorySlug) {
        this.redirectToHome();
        return;
      }

      // Aguardar inicialização do Firebase Manager
      if (!window.firebaseManager.isInitialized()) {
        await window.firebaseManager.initialize();
      }

      // Configurar categoria
      this.setupCategory();
      
      // Carregar artigos
      await this.loadCategoryArticles();
      
      // Configurar event listeners
      this.setupEventListeners();
      
      this.initialized = true;

    } catch (error) {
      console.error('Erro ao inicializar página de categoria:', error);
      this.showError('Erro ao carregar a página de categoria.');
    }
  }

  setupCategory() {
    this.categoryInfo = this.getCategoryInfo(this.categorySlug);
    
    // Atualizar elementos da página
    this.updateElement('category-title', `${this.categoryInfo.name} - Sentinela de Dados`);
    this.updateElement('category-name', this.categoryInfo.name);
    this.updateElement('category-description', this.categoryInfo.description);
    this.updateElement('breadcrumb-category', this.categoryInfo.name);
    this.updateElement('newsletter-category', this.categoryInfo.name.toLowerCase());

    // Atualizar ícone da categoria
    const categoryIcon = document.getElementById('category-icon');
    if (categoryIcon) {
      categoryIcon.className = `w-20 h-20 mx-auto mb-4 ${this.categoryInfo.bgColor} rounded-full flex items-center justify-center text-4xl`;
      categoryIcon.innerHTML = `<i class="fas fa-${this.categoryInfo.icon} ${this.categoryInfo.textColor}"></i>`;
    }

    // Atualizar título da página
    document.title = `${this.categoryInfo.name} - Sentinela de Dados`;
  }

  async loadCategoryArticles() {
    try {
      this.showLoading();

      // Buscar artigos da categoria via API proxy
      const result = await window.firebaseManager.getArticles({ 
        category: this.categoryInfo.firebaseCategory 
      });

      if (result.success) {
        this.articles = result.articles;
        this.filteredArticles = [...this.articles];
        
        // Atualizar contador
        this.updateElement('articles-count', `${this.articles.length} artigos`);
        this.updateElement('results-count', this.articles.length);
        
        // Renderizar artigos
        this.renderArticles();
        
        // Carregar categorias relacionadas
        this.loadRelatedCategories();
        
      } else {
        this.showEmptyState();
      }

    } catch (error) {
      console.error('Erro ao carregar artigos da categoria:', error);
      this.showError('Não foi possível carregar os artigos desta categoria.');
    } finally {
      this.hideLoading();
    }
  }

  setupEventListeners() {
    // Busca
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', this.debounce(() => {
        this.searchQuery = searchInput.value.trim();
        this.filterArticles();
      }, 300));
    }

    // Ordenação
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.sortArticles();
      });
    }

    // Visualização
    const gridViewBtn = document.getElementById('grid-view');
    const listViewBtn = document.getElementById('list-view');
    
    if (gridViewBtn) {
      gridViewBtn.addEventListener('click', () => this.toggleView('grid'));
    }
    
    if (listViewBtn) {
      listViewBtn.addEventListener('click', () => this.toggleView('list'));
    }

    // Filtros de tag
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('filter-button')) {
        const tag = e.target.textContent.trim();
        this.filterByTag(tag);
      }
    });
  }

  filterArticles() {
    this.filteredArticles = this.articles.filter(article => {
      // Filtro por busca
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const titleMatch = article.title.toLowerCase().includes(query);
        const contentMatch = article.content.toLowerCase().includes(query);
        
        if (!titleMatch && !contentMatch) {
          return false;
        }
      }

      // Filtro por tag (implementar se necessário)
      if (this.currentTag !== 'all') {
        // Lógica de filtro por tag
      }

      return true;
    });

    this.sortArticles();
  }

  sortArticles() {
    switch (this.currentSort) {
      case 'newest':
        this.filteredArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'oldest':
        this.filteredArticles.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'popular':
        this.filteredArticles.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'title':
        this.filteredArticles.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    this.renderArticles();
  }

  renderArticles() {
    const gridContainer = document.getElementById('grid-container');
    const listContainer = document.getElementById('list-container');
    const articlesContainer = document.getElementById('articles-container');
    const emptyState = document.getElementById('empty-state');

    if (!gridContainer || !listContainer) return;

    // Atualizar contador de resultados
    this.updateElement('results-count', this.filteredArticles.length);

    if (this.filteredArticles.length === 0) {
      if (articlesContainer) articlesContainer.classList.add('hidden');
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (articlesContainer) articlesContainer.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    // Renderizar em grid
    gridContainer.innerHTML = this.filteredArticles.map(article => 
      this.renderArticleCard(article)
    ).join('');

    // Renderizar em lista
    listContainer.innerHTML = this.filteredArticles.map(article => 
      this.renderArticleList(article)
    ).join('');
  }

  renderArticleCard(article) {
    const formattedDate = this.formatDate(article.date);
    
    return `
      <article class="article-card bg-white rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div class="h-48 ${this.categoryInfo.bgColor} flex items-center justify-center">
          <i class="fas fa-${article.icon || this.categoryInfo.icon} text-6xl ${this.categoryInfo.textColor}"></i>
        </div>
        <div class="p-6">
          <div class="flex items-center mb-3">
            <span class="${this.categoryInfo.bgColor} ${this.categoryInfo.textColor} text-xs font-semibold px-2.5 py-0.5 rounded">
              ${this.categoryInfo.name}
            </span>
            <span class="text-gray-500 text-sm ml-3">${formattedDate}</span>
          </div>
          <h3 class="text-xl font-bold mb-3 text-gray-800 line-clamp-2">
            <a href="article.html?id=${article.id}" class="hover:text-primary transition-colors">
              ${article.title}
            </a>
          </h3>
          <p class="text-gray-600 mb-4 line-clamp-3">${article.excerpt || 'Clique para ler o artigo completo.'}</p>
          <div class="flex items-center justify-between">
            <a href="article.html?id=${article.id}" class="${this.categoryInfo.textColor} hover:opacity-80 font-medium transition-opacity">
              Ler mais <i class="fas fa-arrow-right ml-1"></i>
            </a>
            <div class="flex space-x-3 text-sm text-gray-500">
              <span title="Visualizações">
                <i class="fas fa-eye mr-1"></i> ${article.views || 0}
              </span>
              <span title="Comentários">
                <i class="fas fa-comment mr-1"></i> ${article.commentsCount || 0}
              </span>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  renderArticleList(article) {
    const formattedDate = this.formatDate(article.date);
    
    return `
      <article class="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow duration-300">
        <div class="flex flex-col md:flex-row">
          <div class="md:w-1/4 mb-4 md:mb-0 md:mr-6">
            <div class="h-32 ${this.categoryInfo.bgColor} rounded-lg flex items-center justify-center">
              <i class="fas fa-${article.icon || this.categoryInfo.icon} text-4xl ${this.categoryInfo.textColor}"></i>
            </div>
          </div>
          <div class="md:w-3/4">
            <div class="flex items-center mb-2">
              <span class="${this.categoryInfo.bgColor} ${this.categoryInfo.textColor} text-xs font-semibold px-2.5 py-0.5 rounded">
                ${this.categoryInfo.name}
              </span>
              <span class="text-gray-500 text-sm ml-3">${formattedDate}</span>
            </div>
            <h3 class="text-xl font-bold mb-2 text-gray-800">
              <a href="article.html?id=${article.id}" class="hover:text-primary transition-colors">
                ${article.title}
              </a>
            </h3>
            <p class="text-gray-600 mb-4 line-clamp-2">${article.excerpt || 'Clique para ler o artigo completo.'}</p>
            <div class="flex items-center justify-between">
              <a href="article.html?id=${article.id}" class="${this.categoryInfo.textColor} hover:opacity-80 font-medium transition-opacity">
                Ler mais <i class="fas fa-arrow-right ml-1"></i>
              </a>
              <div class="flex space-x-4 text-sm text-gray-500">
                <span><i class="fas fa-eye mr-1"></i> ${article.views || 0}</span>
                <span><i class="fas fa-comment mr-1"></i> ${article.commentsCount || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  toggleView(view) {
    this.currentView = view;
    
    const gridContainer = document.getElementById('grid-container');
    const listContainer = document.getElementById('list-container');
    const gridViewBtn = document.getElementById('grid-view');
    const listViewBtn = document.getElementById('list-view');

    if (view === 'grid') {
      gridContainer?.classList.remove('hidden');
      listContainer?.classList.add('hidden');
      gridViewBtn?.classList.add('bg-primary', 'text-white');
      gridViewBtn?.classList.remove('text-gray-600', 'hover:bg-gray-100');
      listViewBtn?.classList.remove('bg-primary', 'text-white');
      listViewBtn?.classList.add('text-gray-600', 'hover:bg-gray-100');
    } else {
      gridContainer?.classList.add('hidden');
      listContainer?.classList.remove('hidden');
      listViewBtn?.classList.add('bg-primary', 'text-white');
      listViewBtn?.classList.remove('text-gray-600', 'hover:bg-gray-100');
      gridViewBtn?.classList.remove('bg-primary', 'text-white');
      gridViewBtn?.classList.add('text-gray-600', 'hover:bg-gray-100');
    }
  }

  filterByTag(tag) {
    this.currentTag = tag;
    
    // Atualizar botões de filtro
    document.querySelectorAll('.filter-button').forEach(btn => {
      btn.classList.remove('active', 'bg-primary', 'text-white');
      btn.classList.add('border-gray-300', 'text-gray-700');
    });

    const activeBtn = Array.from(document.querySelectorAll('.filter-button'))
      .find(btn => btn.textContent.trim() === tag);
    
    if (activeBtn) {
      activeBtn.classList.add('active', 'bg-primary', 'text-white');
      activeBtn.classList.remove('border-gray-300', 'text-gray-700');
    }

    this.filterArticles();
  }

  loadRelatedCategories() {
    const relatedContainer = document.getElementById('related-categories');
    if (!relatedContainer) return;

    const allCategories = this.getAllCategories();
    const related = allCategories.filter(cat => cat.slug !== this.categorySlug).slice(0, 4);

    relatedContainer.innerHTML = related.map(category => `
      <a href="category.html?cat=${category.slug}" class="block p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
        <div class="w-12 h-12 ${category.bgColor} rounded-full flex items-center justify-center mb-3 mx-auto">
          <i class="fas fa-${category.icon} ${category.textColor} text-xl"></i>
        </div>
        <h3 class="font-semibold text-gray-800 text-center">${category.name}</h3>
      </a>
    `).join('');
  }

  getCategoryInfo(slug) {
    const categories = {
      'ia': {
        name: 'Inteligência Artificial',
        firebaseCategory: 'IA',
        description: 'Entenda como a IA está transformando nossa sociedade e os debates éticos envolvidos.',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600',
        icon: 'brain',
        slug: 'ia'
      },
      'bigdata': {
        name: 'Big Data',
        firebaseCategory: 'Big Data',
        description: 'Descubra como os dados estão moldando decisões e o que isso significa para sua privacidade.',
        bgColor: 'bg-green-100',
        textColor: 'text-green-600',
        icon: 'database',
        slug: 'bigdata'
      },
      'ciberseguranca': {
        name: 'Cibersegurança',
        firebaseCategory: 'Cibersegurança',
        description: 'Proteja-se online e entenda as ameaças digitais que enfrentamos diariamente.',
        bgColor: 'bg-red-100',
        textColor: 'text-red-600',
        icon: 'shield-alt',
        slug: 'ciberseguranca'
      },
      'legislacao': {
        name: 'Legislação',
        firebaseCategory: 'Legislação',
        description: 'Análises sobre leis como LGPD e PL 2338/2023 e seu impacto na tecnologia.',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-600',
        icon: 'balance-scale',
        slug: 'legislacao'
      },
      'humor': {
        name: 'Humor',
        firebaseCategory: 'Humor',
        description: 'Um pouco de diversão com as situações mais inusitadas da tecnologia.',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-600',
        icon: 'laugh',
        slug: 'humor'
      }
    };

    return categories[slug] || categories['ia'];
  }

  getAllCategories() {
    return [
      this.getCategoryInfo('ia'),
      this.getCategoryInfo('bigdata'),
      this.getCategoryInfo('ciberseguranca'),
      this.getCategoryInfo('legislacao'),
      this.getCategoryInfo('humor')
    ];
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
    const loadingState = document.getElementById('loading-state');
    const articlesContainer = document.getElementById('articles-container');
    
    if (loadingState) loadingState.classList.remove('hidden');
    if (articlesContainer) articlesContainer.classList.add('hidden');
  }

  hideLoading() {
    const loadingState = document.getElementById('loading-state');
    if (loadingState) loadingState.classList.add('hidden');
  }

  showEmptyState() {
    const emptyState = document.getElementById('empty-state');
    const articlesContainer = document.getElementById('articles-container');
    
    if (emptyState) emptyState.classList.remove('hidden');
    if (articlesContainer) articlesContainer.classList.add('hidden');
  }

  showError(message) {
    const articlesContainer = document.getElementById('articles-container');
    if (articlesContainer) {
      articlesContainer.innerHTML = `
        <div class="col-span-full text-center py-12">
          <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-800 mb-2">Erro ao carregar categoria</h3>
          <p class="text-gray-600 mb-4">${message}</p>
          <button onclick="location.reload()" class="bg-primary hover:bg-blue-800 text-white font-bold py-2 px-4 rounded">
            Tentar novamente
          </button>
        </div>
      `;
      articlesContainer.classList.remove('hidden');
    }
  }

  redirectToHome() {
    window.location.href = 'index.html';
  }

  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// Instância global
const categoryManager = new CategoryManager();

// Funções globais para compatibilidade
window.filterByTag = (tag) => categoryManager.filterByTag(tag);
window.toggleView = (view) => categoryManager.toggleView(view);
window.clearFilters = () => {
  categoryManager.searchQuery = '';
  categoryManager.currentTag = 'all';
  categoryManager.currentSort = 'newest';
  
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) sortSelect.value = 'newest';
  
  categoryManager.filterByTag('all');
};

// Inicialização automática
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => categoryManager.initialize());
} else {
  categoryManager.initialize();
}

// Disponibilizar globalmente
window.categoryManager = categoryManager;

