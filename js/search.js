// search.js - Sistema de busca do Sentinela de Dados

/**
 * Gerenciador de busca
 * Responsável por buscar artigos, filtrar resultados e gerenciar histórico de buscas
 */
class SearchManager {
  constructor() {
    this.searchHistory = [];
    this.searchResults = [];
    this.currentQuery = '';
    this.currentFilters = {
      category: 'all',
      dateRange: 'all',
      sortBy: 'relevance'
    };
    this.isSearching = false;
    this.init();
  }

  /**
   * Inicializa o sistema de busca
   */
  init() {
    this.loadSearchHistory();
    this.bindEvents();
  }

  /**
   * Carrega histórico de buscas do localStorage
   */
  loadSearchHistory() {
    try {
      this.searchHistory = JSON.parse(localStorage.getItem('sentinela_search_history') || '[]');
    } catch (error) {
      console.error('Erro ao carregar histórico de buscas:', error);
      this.searchHistory = [];
    }
  }

  /**
   * Salva histórico de buscas no localStorage
   */
  saveSearchHistory() {
    try {
      // Manter apenas as últimas 50 buscas
      if (this.searchHistory.length > 50) {
        this.searchHistory = this.searchHistory.slice(-50);
      }
      localStorage.setItem('sentinela_search_history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('Erro ao salvar histórico de buscas:', error);
    }
  }

  /**
   * Vincula eventos aos elementos de busca
   */
  bindEvents() {
    // Event listeners para campos de busca
    document.addEventListener('input', (e) => {
      if (e.target.id === 'main-search-input' || e.target.id === 'global-search-input') {
        this.handleSearchInput(e.target);
      }
    });

    // Event listeners para formulários de busca
    document.addEventListener('submit', (e) => {
      if (e.target.classList.contains('search-form')) {
        e.preventDefault();
        this.performSearch();
      }
    });

    // Event listeners para filtros
    document.addEventListener('change', (e) => {
      if (e.target.id === 'date-filter' || e.target.id === 'sort-filter') {
        this.updateFilters();
      }
    });

    // Event listeners para sugestões de busca
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('search-suggestion')) {
        this.selectSuggestion(e.target.textContent);
      }
    });
  }

  /**
   * Processa entrada de texto na busca
   */
  handleSearchInput(input) {
    const query = input.value.trim();
    
    if (query.length >= 2) {
      this.showSearchSuggestions(query);
    } else {
      this.hideSearchSuggestions();
    }
  }

  /**
   * Mostra sugestões de busca
   */
  showSearchSuggestions(query) {
    const suggestions = this.generateSuggestions(query);
    const suggestionsContainer = document.getElementById('search-suggestions');
    
    if (!suggestionsContainer || suggestions.length === 0) {
      this.hideSearchSuggestions();
      return;
    }

    const suggestionsHTML = suggestions.map(suggestion => `
      <div class="search-suggestion px-4 py-2 hover:bg-gray-100 cursor-pointer">
        <i class="fas fa-search mr-2 text-gray-400"></i>
        ${this.highlightQuery(suggestion, query)}
      </div>
    `).join('');

    suggestionsContainer.innerHTML = suggestionsHTML;
    suggestionsContainer.classList.remove('hidden');
  }

  /**
   * Esconde sugestões de busca
   */
  hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (suggestionsContainer) {
      suggestionsContainer.classList.add('hidden');
    }
  }

  /**
   * Gera sugestões baseadas na query
   */
  generateSuggestions(query) {
    const suggestions = [
      'inteligência artificial',
      'machine learning',
      'deep learning',
      'LGPD',
      'cibersegurança',
      'big data',
      'data science',
      'blockchain',
      'internet das coisas',
      'computação em nuvem',
      'privacidade de dados',
      'algoritmos',
      'redes neurais',
      'automação',
      'transformação digital'
    ];

    // Filtrar sugestões que contêm a query
    const filtered = suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(query.toLowerCase())
    );

    // Adicionar histórico de buscas relevantes
    const historyMatches = this.searchHistory
      .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
      .map(item => item.query)
      .slice(0, 3);

    return [...new Set([...filtered, ...historyMatches])].slice(0, 8);
  }

  /**
   * Destaca a query na sugestão
   */
  highlightQuery(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  /**
   * Seleciona uma sugestão
   */
  selectSuggestion(suggestion) {
    const searchInput = document.getElementById('main-search-input') || 
                       document.getElementById('global-search-input');
    
    if (searchInput) {
      searchInput.value = suggestion;
      this.hideSearchSuggestions();
      this.performSearch();
    }
  }

  /**
   * Executa a busca
   */
  async performSearch() {
    const searchInput = document.getElementById('main-search-input') || 
                       document.getElementById('global-search-input');
    
    if (!searchInput) return;

    const query = searchInput.value.trim();
    
    if (!query) {
      this.showErrorMessage('Por favor, digite algo para buscar.');
      return;
    }

    this.currentQuery = query;
    this.isSearching = true;
    
    try {
      // Mostrar estado de carregamento
      this.showLoadingState();
      
      // Adicionar ao histórico
      this.addToHistory(query);
      
      // Simular delay de busca
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Executar busca
      const results = await this.searchArticles(query);
      
      // Aplicar filtros
      this.searchResults = this.applyFilters(results);
      
      // Mostrar resultados
      this.displayResults();
      
      // Registrar busca para analytics
      this.trackSearch(query, this.searchResults.length);
      
    } catch (error) {
      console.error('Erro na busca:', error);
      this.showErrorMessage('Erro ao realizar busca. Tente novamente.');
    } finally {
      this.isSearching = false;
      this.hideLoadingState();
    }
  }

  /**
   * Busca artigos baseado na query
   */
  async searchArticles(query) {
    // Simular busca em artigos (em produção seria uma chamada para API)
    const articles = await this.loadAllArticles();
    const queryLower = query.toLowerCase();
    
    return articles.filter(article => {
      const titleMatch = article.title.toLowerCase().includes(queryLower);
      const contentMatch = article.content.toLowerCase().includes(queryLower);
      const categoryMatch = article.category.toLowerCase().includes(queryLower);
      const tagsMatch = article.tags.some(tag => tag.toLowerCase().includes(queryLower));
      
      return titleMatch || contentMatch || categoryMatch || tagsMatch;
    }).map(article => ({
      ...article,
      relevanceScore: this.calculateRelevance(article, query)
    }));
  }

  /**
   * Carrega todos os artigos disponíveis
   */
  async loadAllArticles() {
    // Simular carregamento de artigos do localStorage ou API
    try {
      const articles = JSON.parse(localStorage.getItem('sentinela_articles') || '[]');
      return articles.length > 0 ? articles : this.getDefaultArticles();
    } catch (error) {
      console.error('Erro ao carregar artigos:', error);
      return this.getDefaultArticles();
    }
  }

  /**
   * Retorna artigos padrão para demonstração
   */
  getDefaultArticles() {
    return [
      {
        id: '1',
        title: 'O Futuro da Inteligência Artificial no Brasil',
        content: 'A inteligência artificial está transformando diversos setores da economia brasileira...',
        category: 'ia',
        author: 'João Silva',
        publishedAt: '2024-01-15T10:00:00Z',
        tags: ['ia', 'brasil', 'tecnologia', 'futuro'],
        likes: 45,
        views: 1250
      },
      {
        id: '2',
        title: 'LGPD: Como Proteger Dados Pessoais na Era Digital',
        content: 'A Lei Geral de Proteção de Dados trouxe mudanças significativas...',
        category: 'legislacao',
        author: 'Maria Santos',
        publishedAt: '2024-01-10T14:30:00Z',
        tags: ['lgpd', 'privacidade', 'dados', 'legislacao'],
        likes: 32,
        views: 890
      },
      {
        id: '3',
        title: 'Cibersegurança: Principais Ameaças de 2024',
        content: 'As ameaças cibernéticas evoluem constantemente...',
        category: 'ciberseguranca',
        author: 'Carlos Oliveira',
        publishedAt: '2024-01-05T09:15:00Z',
        tags: ['ciberseguranca', 'ameacas', 'seguranca', '2024'],
        likes: 67,
        views: 1580
      }
    ];
  }

  /**
   * Calcula relevância do artigo para a query
   */
  calculateRelevance(article, query) {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Pontuação por correspondência no título (peso maior)
    if (article.title.toLowerCase().includes(queryLower)) {
      score += 10;
    }
    
    // Pontuação por correspondência na categoria
    if (article.category.toLowerCase().includes(queryLower)) {
      score += 5;
    }
    
    // Pontuação por correspondência nas tags
    article.tags.forEach(tag => {
      if (tag.toLowerCase().includes(queryLower)) {
        score += 3;
      }
    });
    
    // Pontuação por correspondência no conteúdo
    const contentMatches = (article.content.toLowerCase().match(new RegExp(queryLower, 'g')) || []).length;
    score += contentMatches;
    
    // Bonificação por popularidade
    score += (article.likes || 0) * 0.1;
    score += (article.views || 0) * 0.01;
    
    return score;
  }

  /**
   * Aplica filtros aos resultados
   */
  applyFilters(results) {
    let filtered = [...results];
    
    // Filtro por categoria
    if (this.currentFilters.category !== 'all') {
      filtered = filtered.filter(article => article.category === this.currentFilters.category);
    }
    
    // Filtro por data
    if (this.currentFilters.dateRange !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (this.currentFilters.dateRange) {
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
      
      if (cutoffDate) {
        filtered = filtered.filter(article => new Date(article.publishedAt) >= cutoffDate);
      }
    }
    
    // Ordenação
    switch (this.currentFilters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'relevance':
      default:
        filtered.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        break;
    }
    
    return filtered;
  }

  /**
   * Exibe os resultados da busca
   */
  displayResults() {
    this.hidePopularSearches();
    this.showSearchResults();
    this.updateResultsInfo();
    this.renderResultsList();
  }

  /**
   * Esconde buscas populares
   */
  hidePopularSearches() {
    const popularSearches = document.getElementById('popular-searches');
    if (popularSearches) {
      popularSearches.classList.add('hidden');
    }
  }

  /**
   * Mostra container de resultados
   */
  showSearchResults() {
    const resultsContainer = document.getElementById('search-results-container');
    const noResults = document.getElementById('no-results');
    
    if (this.searchResults.length > 0) {
      if (resultsContainer) resultsContainer.classList.remove('hidden');
      if (noResults) noResults.classList.add('hidden');
    } else {
      if (resultsContainer) resultsContainer.classList.add('hidden');
      if (noResults) noResults.classList.remove('hidden');
    }
  }

  /**
   * Atualiza informações dos resultados
   */
  updateResultsInfo() {
    const resultsInfo = document.getElementById('results-info');
    const searchTime = document.getElementById('search-time');
    
    if (resultsInfo) {
      const count = this.searchResults.length;
      resultsInfo.textContent = `Encontrados ${count} resultado${count !== 1 ? 's' : ''} para "${this.currentQuery}"`;
    }
    
    if (searchTime) {
      searchTime.textContent = '(0.3s)'; // Simular tempo de busca
    }
  }

  /**
   * Renderiza lista de resultados
   */
  renderResultsList() {
    const resultsList = document.getElementById('results-list');
    const resultsGrid = document.getElementById('results-grid');
    
    if (!resultsList) return;
    
    const resultsHTML = this.searchResults.map(article => this.renderSearchResult(article)).join('');
    
    resultsList.innerHTML = resultsHTML;
    if (resultsGrid) {
      resultsGrid.innerHTML = this.searchResults.map(article => this.renderSearchResultCard(article)).join('');
    }
  }

  /**
   * Renderiza um resultado de busca (formato lista)
   */
  renderSearchResult(article) {
    const timeAgo = this.getTimeAgo(article.publishedAt);
    const excerpt = this.generateExcerpt(article.content, this.currentQuery);
    
    return `
      <div class="search-result bg-white rounded-lg p-6 border border-gray-200">
        <div class="flex justify-between items-start mb-3">
          <span class="badge badge-${this.getCategoryColor(article.category)} text-xs">
            ${this.getCategoryName(article.category)}
          </span>
          <span class="text-sm text-gray-500">${timeAgo}</span>
        </div>
        
        <h3 class="text-xl font-bold text-gray-800 mb-2 hover:text-primary">
          <a href="article.html?id=${article.id}">
            ${this.highlightQuery(article.title, this.currentQuery)}
          </a>
        </h3>
        
        <p class="text-gray-600 mb-4 line-clamp-3">
          ${excerpt}
        </p>
        
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4 text-sm text-gray-500">
            <span>
              <i class="fas fa-user mr-1"></i>
              ${article.author}
            </span>
            <span>
              <i class="fas fa-heart mr-1"></i>
              ${article.likes || 0}
            </span>
            <span>
              <i class="fas fa-eye mr-1"></i>
              ${article.views || 0}
            </span>
          </div>
          
          <a href="article.html?id=${article.id}" class="text-primary hover:text-blue-800 font-medium">
            Ler mais <i class="fas fa-arrow-right ml-1"></i>
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza um resultado de busca (formato card)
   */
  renderSearchResultCard(article) {
    const timeAgo = this.getTimeAgo(article.publishedAt);
    
    return `
      <div class="article-card">
        <div class="article-card-content">
          <span class="article-card-category">${this.getCategoryName(article.category)}</span>
          <h3 class="article-card-title">
            <a href="article.html?id=${article.id}">
              ${this.highlightQuery(article.title, this.currentQuery)}
            </a>
          </h3>
          <p class="article-card-excerpt">
            ${this.generateExcerpt(article.content, this.currentQuery)}
          </p>
          <div class="article-card-meta">
            <span class="article-card-date">
              <i class="fas fa-clock mr-1"></i>
              ${timeAgo}
            </span>
            <div class="article-card-stats">
              <span><i class="fas fa-heart mr-1"></i>${article.likes || 0}</span>
              <span><i class="fas fa-eye mr-1"></i>${article.views || 0}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Gera excerpt destacando a query
   */
  generateExcerpt(content, query) {
    const maxLength = 150;
    const queryIndex = content.toLowerCase().indexOf(query.toLowerCase());
    
    let excerpt;
    if (queryIndex !== -1) {
      const start = Math.max(0, queryIndex - 50);
      const end = Math.min(content.length, start + maxLength);
      excerpt = content.substring(start, end);
      if (start > 0) excerpt = '...' + excerpt;
      if (end < content.length) excerpt = excerpt + '...';
    } else {
      excerpt = content.substring(0, maxLength);
      if (content.length > maxLength) excerpt += '...';
    }
    
    return this.highlightQuery(excerpt, query);
  }

  /**
   * Adiciona busca ao histórico
   */
  addToHistory(query) {
    const existingIndex = this.searchHistory.findIndex(item => item.query === query);
    
    if (existingIndex !== -1) {
      // Atualizar timestamp se já existe
      this.searchHistory[existingIndex].timestamp = new Date().toISOString();
      this.searchHistory[existingIndex].count++;
    } else {
      // Adicionar nova busca
      this.searchHistory.push({
        query: query,
        timestamp: new Date().toISOString(),
        count: 1
      });
    }
    
    this.saveSearchHistory();
  }

  /**
   * Registra busca para analytics
   */
  trackSearch(query, resultsCount) {
    try {
      const searches = JSON.parse(localStorage.getItem('sentinela_search_analytics') || '[]');
      
      const searchEvent = {
        id: Date.now().toString(),
        query: query,
        resultsCount: resultsCount,
        filters: { ...this.currentFilters },
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        referrer: document.referrer
      };
      
      searches.push(searchEvent);
      
      // Manter apenas as últimas 1000 buscas
      if (searches.length > 1000) {
        searches.splice(0, searches.length - 1000);
      }
      
      localStorage.setItem('sentinela_search_analytics', JSON.stringify(searches));
    } catch (error) {
      console.error('Erro ao registrar busca:', error);
    }
  }

  /**
   * Atualiza filtros de busca
   */
  updateFilters() {
    const dateFilter = document.getElementById('date-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    if (dateFilter) this.currentFilters.dateRange = dateFilter.value;
    if (sortFilter) this.currentFilters.sortBy = sortFilter.value;
    
    // Reaplicar filtros se há resultados
    if (this.searchResults.length > 0) {
      this.searchResults = this.applyFilters(this.searchResults);
      this.renderResultsList();
      this.updateResultsInfo();
    }
  }

  /**
   * Mostra estado de carregamento
   */
  showLoadingState() {
    const loadingElement = document.getElementById('loading-results');
    if (loadingElement) {
      loadingElement.classList.remove('hidden');
    }
  }

  /**
   * Esconde estado de carregamento
   */
  hideLoadingState() {
    const loadingElement = document.getElementById('loading-results');
    if (loadingElement) {
      loadingElement.classList.add('hidden');
    }
  }

  /**
   * Obtém nome da categoria
   */
  getCategoryName(category) {
    const categories = {
      'ia': 'Inteligência Artificial',
      'bigdata': 'Big Data',
      'ciberseguranca': 'Cibersegurança',
      'legislacao': 'Legislação',
      'humor': 'Humor'
    };
    return categories[category] || category;
  }

  /**
   * Obtém cor da categoria
   */
  getCategoryColor(category) {
    const colors = {
      'ia': 'primary',
      'bigdata': 'secondary',
      'ciberseguranca': 'error',
      'legislacao': 'warning',
      'humor': 'accent'
    };
    return colors[category] || 'primary';
  }

  /**
   * Calcula tempo decorrido
   */
  getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'agora mesmo';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
    
    return date.toLocaleDateString('pt-BR');
  }

  /**
   * Mostra mensagem de erro
   */
  showErrorMessage(message) {
    if (typeof authManager !== 'undefined' && authManager.showMessage) {
      authManager.showMessage(message, 'error');
    } else {
      console.error(message);
    }
  }
}

// Instanciar o gerenciador de busca globalmente
const searchManager = new SearchManager();

// Funções globais para compatibilidade
function performSearch() {
  searchManager.performSearch();
}

function searchFor(query) {
  const searchInput = document.getElementById('main-search-input') || 
                     document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.value = query;
    searchManager.performSearch();
  }
}

function showSearchSuggestions(query) {
  searchManager.showSearchSuggestions(query);
}

function toggleSearch() {
  const modal = document.getElementById('search-modal');
  if (modal) {
    if (modal.classList.contains('hidden')) {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      const input = document.getElementById('global-search-input');
      if (input) input.focus();
    } else {
      modal.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }
  }
}

