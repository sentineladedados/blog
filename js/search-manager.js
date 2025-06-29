// js/search-manager.js
// Sistema de busca atualizado para usar Firebase Manager

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
    this.currentView = 'list';
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Aguardar inicialização do Firebase Manager
      if (!window.firebaseManager.isInitialized()) {
        await window.firebaseManager.initialize();
      }

      this.loadSearchHistory();
      this.bindEvents();
      this.loadPopularSearches();
      this.checkUrlQuery();
      
      this.initialized = true;

    } catch (error) {
      console.error('Erro ao inicializar busca:', error);
      this.showError('Erro ao inicializar sistema de busca.');
    }
  }

  checkUrlQuery() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');
    
    if (query) {
      const searchInput = document.getElementById('main-search-input');
      if (searchInput) {
        searchInput.value = query;
        this.performSearch();
      }
    }
  }

  loadSearchHistory() {
    try {
      this.searchHistory = JSON.parse(localStorage.getItem('sentinela_search_history') || '[]');
      this.displayRecentSearches();
    } catch (error) {
      console.error('Erro ao carregar histórico de buscas:', error);
      this.searchHistory = [];
    }
  }

  saveSearchHistory() {
    try {
      if (this.searchHistory.length > 50) {
        this.searchHistory = this.searchHistory.slice(-50);
      }
      localStorage.setItem('sentinela_search_history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.error('Erro ao salvar histórico de buscas:', error);
    }
  }

  bindEvents() {
    // Event listeners para campos de busca
    document.addEventListener('input', (e) => {
      if (e.target.id === 'main-search-input' || e.target.id === 'global-search-input') {
        this.handleSearchInput(e.target);
      }
    });

    // Event listeners para formulários de busca
    document.addEventListener('submit', (e) => {
      if (e.target.id === 'search-form' || e.target.closest('form')) {
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

    // Event listeners para botões de categoria
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('category-filter')) {
        this.filterByCategory(e.target.dataset.category || e.target.textContent.toLowerCase());
      }
      
      if (e.target.classList.contains('search-suggestion')) {
        this.selectSuggestion(e.target.textContent);
      }
    });

    // Enter key para busca
    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && (e.target.id === 'main-search-input' || e.target.id === 'global-search-input')) {
        e.preventDefault();
        this.performSearch();
      }
    });
  }

  handleSearchInput(input) {
    const query = input.value.trim();
    
    if (query.length >= 2) {
      this.showSearchSuggestions(query);
    } else {
      this.hideSearchSuggestions();
    }
  }

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

  hideSearchSuggestions() {
    const suggestionsContainer = document.getElementById('search-suggestions');
    if (suggestionsContainer) {
      suggestionsContainer.classList.add('hidden');
    }
  }

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

    const filtered = suggestions.filter(suggestion => 
      suggestion.toLowerCase().includes(query.toLowerCase())
    );

    const historyMatches = this.searchHistory
      .filter(item => item.query.toLowerCase().includes(query.toLowerCase()))
      .map(item => item.query)
      .slice(0, 3);

    return [...new Set([...filtered, ...historyMatches])].slice(0, 8);
  }

  highlightQuery(text, query) {
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }

  selectSuggestion(suggestion) {
    const searchInput = document.getElementById('main-search-input') || 
                       document.getElementById('global-search-input');
    
    if (searchInput) {
      searchInput.value = suggestion;
      this.hideSearchSuggestions();
      this.performSearch();
    }
  }

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
      this.showLoadingState();
      this.addToHistory(query);
      
      // Buscar via Firebase Manager
      const result = await window.firebaseManager.searchArticles(query, {
        category: this.currentFilters.category
      });
      
      if (result.success) {
        this.searchResults = result.articles;
        this.applyFilters();
        this.displayResults();
      } else {
        this.showNoResults();
      }
      
    } catch (error) {
      console.error('Erro na busca:', error);
      this.showErrorMessage('Erro ao realizar busca. Tente novamente.');
    } finally {
      this.isSearching = false;
      this.hideLoadingState();
    }
  }

  addToHistory(query) {
    const historyItem = {
      query: query,
      timestamp: new Date().toISOString()
    };
    
    // Remover duplicatas
    this.searchHistory = this.searchHistory.filter(item => item.query !== query);
    
    // Adicionar no início
    this.searchHistory.unshift(historyItem);
    
    this.saveSearchHistory();
    this.displayRecentSearches();
  }

  applyFilters() {
    let filtered = [...this.searchResults];
    
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
        filtered = filtered.filter(article => new Date(article.date) >= cutoffDate);
      }
    }
    
    // Ordenação
    switch (this.currentFilters.sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'relevance':
      default:
        filtered.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
        break;
    }
    
    this.searchResults = filtered;
  }

  displayResults() {
    this.hidePopularSearches();
    this.showSearchResults();
    this.updateResultsInfo();
    this.renderResultsList();
  }

  hidePopularSearches() {
    const popularSearches = document.getElementById('popular-searches');
    if (popularSearches) {
      popularSearches.classList.add('hidden');
    }
  }

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

  updateResultsInfo() {
    const resultsInfo = document.getElementById('results-info');
    const searchTime = document.getElementById('search-time');
    
    if (resultsInfo) {
      const count = this.searchResults.length;
      resultsInfo.textContent = `Encontrados ${count} resultado${count !== 1 ? 's' : ''} para "${this.currentQuery}"`;
    }
    
    if (searchTime) {
      searchTime.textContent = '(0.3s)';
    }
  }

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

  renderSearchResult(article) {
    const timeAgo = this.getTimeAgo(article.date);
    const excerpt = this.generateExcerpt(article.content, this.currentQuery);
    const categoryInfo = this.getCategoryInfo(article.category);
    
    return `
      <div class="search-result bg-white rounded-lg p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-300">
        <div class="flex justify-between items-start mb-3">
          <span class="${categoryInfo.bgColor} ${categoryInfo.textColor} text-xs font-semibold px-2.5 py-0.5 rounded">
            ${categoryInfo.name}
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
              <i class="fas fa-eye mr-1"></i>
              ${article.views || 0}
            </span>
            <span>
              <i class="fas fa-comment mr-1"></i>
              ${article.commentsCount || 0}
            </span>
          </div>
          
          <a href="article.html?id=${article.id}" class="${categoryInfo.textColor} hover:opacity-80 font-medium">
            Ler mais <i class="fas fa-arrow-right ml-1"></i>
          </a>
        </div>
      </div>
    `;
  }

  renderSearchResultCard(article) {
    const categoryInfo = this.getCategoryInfo(article.category);
    const formattedDate = this.formatDate(article.date);
    
    return `
      <article class="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300">
        <div class="h-48 ${categoryInfo.bgColor} flex items-center justify-center">
          <i class="fas fa-${article.icon || categoryInfo.icon} text-6xl ${categoryInfo.textColor}"></i>
        </div>
        <div class="p-6">
          <div class="flex items-center mb-3">
            <span class="${categoryInfo.bgColor} ${categoryInfo.textColor} text-xs font-semibold px-2.5 py-0.5 rounded">
              ${categoryInfo.name}
            </span>
            <span class="text-gray-500 text-sm ml-3">${formattedDate}</span>
          </div>
          <h3 class="text-xl font-bold mb-3 text-gray-800 line-clamp-2">
            <a href="article.html?id=${article.id}" class="hover:text-primary transition-colors">
              ${this.highlightQuery(article.title, this.currentQuery)}
            </a>
          </h3>
          <p class="text-gray-600 mb-4 line-clamp-3">${article.excerpt || 'Clique para ler o artigo completo.'}</p>
          <div class="flex items-center justify-between">
            <a href="article.html?id=${article.id}" class="${categoryInfo.textColor} hover:opacity-80 font-medium transition-opacity">
              Ler mais <i class="fas fa-arrow-right ml-1"></i>
            </a>
            <div class="flex space-x-3 text-sm text-gray-500">
              <span><i class="fas fa-eye mr-1"></i> ${article.views || 0}</span>
              <span><i class="fas fa-comment mr-1"></i> ${article.commentsCount || 0}</span>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  getCategoryInfo(category) {
    const categories = {
      'IA': { 
        name: 'Inteligência Artificial',
        bgColor: 'bg-blue-100', 
        textColor: 'text-blue-600',
        icon: 'brain'
      },
      'Big Data': { 
        name: 'Big Data',
        bgColor: 'bg-green-100', 
        textColor: 'text-green-600',
        icon: 'database'
      },
      'Cibersegurança': { 
        name: 'Cibersegurança',
        bgColor: 'bg-red-100', 
        textColor: 'text-red-600',
        icon: 'shield-alt'
      },
      'Legislação': { 
        name: 'Legislação',
        bgColor: 'bg-purple-100', 
        textColor: 'text-purple-600',
        icon: 'balance-scale'
      },
      'Humor': { 
        name: 'Humor',
        bgColor: 'bg-yellow-100', 
        textColor: 'text-yellow-600',
        icon: 'laugh'
      }
    };
    
    return categories[category] || categories['IA'];
  }

  generateExcerpt(content, query) {
    if (!content) return 'Clique para ler o artigo completo.';
    
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const queryIndex = contentLower.indexOf(queryLower);
    
    if (queryIndex !== -1) {
      const start = Math.max(0, queryIndex - 100);
      const end = Math.min(content.length, queryIndex + query.length + 100);
      let excerpt = content.substring(start, end);
      
      if (start > 0) excerpt = '...' + excerpt;
      if (end < content.length) excerpt = excerpt + '...';
      
      return this.highlightQuery(excerpt, query);
    }
    
    return content.substring(0, 200) + (content.length > 200 ? '...' : '');
  }

  getTimeAgo(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'Agora mesmo';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`;
      if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
      
      return this.formatDate(dateString);
    } catch (error) {
      return this.formatDate(dateString);
    }
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

  loadPopularSearches() {
    // Implementar carregamento de buscas populares
    const popularSearches = document.getElementById('popular-searches');
    if (popularSearches) {
      // Manter o HTML existente ou atualizar com dados reais
    }
  }

  displayRecentSearches() {
    const recentSearches = document.getElementById('recent-searches');
    const recentSearchesList = document.getElementById('recent-searches-list');
    
    if (!recentSearchesList || this.searchHistory.length === 0) {
      if (recentSearches) recentSearches.classList.add('hidden');
      return;
    }

    const recentHTML = this.searchHistory.slice(0, 5).map(item => `
      <button onclick="searchFor('${item.query}')" class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors">
        ${item.query}
      </button>
    `).join('');

    recentSearchesList.innerHTML = recentHTML;
    if (recentSearches) recentSearches.classList.remove('hidden');
  }

  filterByCategory(category) {
    this.currentFilters.category = category;
    
    // Atualizar botões de categoria
    document.querySelectorAll('.category-filter').forEach(btn => {
      btn.classList.remove('active', 'bg-primary', 'text-white');
      btn.classList.add('border-gray-300', 'text-gray-700');
    });

    const activeBtn = document.querySelector(`[data-category="${category}"]`) ||
                     Array.from(document.querySelectorAll('.category-filter'))
                       .find(btn => btn.textContent.toLowerCase().includes(category));
    
    if (activeBtn) {
      activeBtn.classList.add('active', 'bg-primary', 'text-white');
      activeBtn.classList.remove('border-gray-300', 'text-gray-700');
    }

    if (this.currentQuery) {
      this.performSearch();
    }
  }

  updateFilters() {
    const dateFilter = document.getElementById('date-filter');
    const sortFilter = document.getElementById('sort-filter');
    
    if (dateFilter) this.currentFilters.dateRange = dateFilter.value;
    if (sortFilter) this.currentFilters.sortBy = sortFilter.value;
    
    if (this.searchResults.length > 0) {
      this.applyFilters();
      this.displayResults();
    }
  }

  toggleResultsView(view) {
    this.currentView = view;
    
    const resultsList = document.getElementById('results-list');
    const resultsGrid = document.getElementById('results-grid');
    const listViewBtn = document.getElementById('list-view-btn');
    const gridViewBtn = document.getElementById('grid-view-btn');

    if (view === 'list') {
      resultsList?.classList.remove('hidden');
      resultsGrid?.classList.add('hidden');
      listViewBtn?.classList.add('bg-primary', 'text-white');
      listViewBtn?.classList.remove('text-gray-600', 'hover:bg-gray-100');
      gridViewBtn?.classList.remove('bg-primary', 'text-white');
      gridViewBtn?.classList.add('text-gray-600', 'hover:bg-gray-100');
    } else {
      resultsList?.classList.add('hidden');
      resultsGrid?.classList.remove('hidden');
      gridViewBtn?.classList.add('bg-primary', 'text-white');
      gridViewBtn?.classList.remove('text-gray-600', 'hover:bg-gray-100');
      listViewBtn?.classList.remove('bg-primary', 'text-white');
      listViewBtn?.classList.add('text-gray-600', 'hover:bg-gray-100');
    }
  }

  showLoadingState() {
    const loadingResults = document.getElementById('loading-results');
    if (loadingResults) loadingResults.classList.remove('hidden');
  }

  hideLoadingState() {
    const loadingResults = document.getElementById('loading-results');
    if (loadingResults) loadingResults.classList.add('hidden');
  }

  showNoResults() {
    const noResults = document.getElementById('no-results');
    const resultsContainer = document.getElementById('search-results-container');
    
    if (noResults) noResults.classList.remove('hidden');
    if (resultsContainer) resultsContainer.classList.add('hidden');
  }

  showErrorMessage(message) {
    // Implementar exibição de mensagem de erro
    console.error(message);
  }

  showError(message) {
    console.error(message);
  }
}

// Instância global
const searchManager = new SearchManager();

// Funções globais para compatibilidade
window.searchFor = (query) => {
  const searchInput = document.getElementById('main-search-input') || 
                     document.getElementById('global-search-input');
  if (searchInput) {
    searchInput.value = query;
    searchManager.performSearch();
  }
};

window.filterByCategory = (category) => searchManager.filterByCategory(category);
window.toggleResultsView = (view) => searchManager.toggleResultsView(view);

// Inicialização automática
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => searchManager.initialize());
} else {
  searchManager.initialize();
}

// Disponibilizar globalmente
window.searchManager = searchManager;

