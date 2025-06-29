// js/articles.js
// Sistema de gerenciamento de artigos usando proxy Firebase

class ArticlesManager {
  constructor() {
    this.articles = [];
    this.currentPage = 1;
    this.articlesPerPage = 6;
    this.totalArticles = 0;
    this.initialized = false;
    this.carouselInterval = null;
    this.currentSlide = 0;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Aguardar o proxy do Firebase estar pronto
      if (window.firebaseProxy) {
        await window.firebaseProxy.initialize();
        await this.loadArticles();
        this.setupCarousel();
        this.initialized = true;
      } else {
        // Tentar novamente após um tempo
        setTimeout(() => this.initialize(), 1000);
      }
    } catch (error) {
      console.error('Erro ao inicializar ArticlesManager:', error);
      this.showError('Erro ao carregar artigos. Tente recarregar a página.');
    }
  }

  async loadArticles() {
    try {
      const articlesContainer = document.getElementById('articles-container');
      const carouselContainer = document.getElementById('carousel-container');
      
      if (articlesContainer) {
        articlesContainer.innerHTML = '<div class="text-center py-8"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i><p class="mt-2 text-gray-600">Carregando artigos...</p></div>';
      }

      // Buscar artigos via proxy
      if (!window.db) {
        throw new Error('Banco de dados não disponível');
      }

      const querySnapshot = await window.db.collection('articles')
        .orderBy('timestamp', 'desc')
        .get();

      this.articles = [];
      
      if (!querySnapshot.empty) {
        querySnapshot.forEach(doc => {
          const data = doc.data();
          this.articles.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp || new Date().toISOString()
          });
        });
      }

      this.totalArticles = this.articles.length;

      // Renderizar artigos
      if (articlesContainer) {
        this.renderArticles();
      }

      // Renderizar carrossel
      if (carouselContainer) {
        this.renderCarousel();
      }

    } catch (error) {
      console.error('Erro ao carregar artigos:', error);
      
      // Mostrar artigos de exemplo se não conseguir carregar do Firebase
      this.loadSampleArticles();
    }
  }

  loadSampleArticles() {
    // Artigos de exemplo para demonstração
    this.articles = [
      {
        id: 'sample1',
        title: 'O Futuro da Inteligência Artificial',
        slug: 'futuro-inteligencia-artificial',
        category: 'ia',
        excerpt: 'Explorando as tendências e impactos da IA na sociedade moderna.',
        content: 'Conteúdo completo do artigo sobre IA...',
        author: 'Sentinela de Dados',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 dia atrás
        views: 1250,
        likes: 89,
        featured: true,
        imageUrl: 'https://via.placeholder.com/400x250/1e3a8a/ffffff?text=IA'
      },
      {
        id: 'sample2',
        title: 'LGPD: Guia Completo para Empresas',
        slug: 'lgpd-guia-completo-empresas',
        category: 'legislacao',
        excerpt: 'Tudo que sua empresa precisa saber sobre a Lei Geral de Proteção de Dados.',
        content: 'Conteúdo completo do artigo sobre LGPD...',
        author: 'Sentinela de Dados',
        timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 dias atrás
        views: 2100,
        likes: 156,
        featured: true,
        imageUrl: 'https://via.placeholder.com/400x250/065f46/ffffff?text=LGPD'
      },
      {
        id: 'sample3',
        title: 'Cibersegurança em 2025',
        slug: 'ciberseguranca-2025',
        category: 'ciberseguranca',
        excerpt: 'As principais ameaças e tendências de segurança digital.',
        content: 'Conteúdo completo do artigo sobre cibersegurança...',
        author: 'Sentinela de Dados',
        timestamp: new Date(Date.now() - 259200000).toISOString(), // 3 dias atrás
        views: 890,
        likes: 67,
        featured: true,
        imageUrl: 'https://via.placeholder.com/400x250/dc2626/ffffff?text=Cyber'
      }
    ];

    this.totalArticles = this.articles.length;

    const articlesContainer = document.getElementById('articles-container');
    const carouselContainer = document.getElementById('carousel-container');

    if (articlesContainer) {
      this.renderArticles();
    }

    if (carouselContainer) {
      this.renderCarousel();
    }
  }

  renderArticles() {
    const container = document.getElementById('articles-container');
    if (!container) return;

    if (this.articles.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12">
          <i class="fas fa-newspaper text-4xl text-gray-400 mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-600 mb-2">Nenhum artigo encontrado</h3>
          <p class="text-gray-500">Novos artigos serão publicados em breve!</p>
        </div>
      `;
      return;
    }

    // Calcular artigos para a página atual
    const startIndex = (this.currentPage - 1) * this.articlesPerPage;
    const endIndex = startIndex + this.articlesPerPage;
    const articlesForPage = this.articles.slice(startIndex, endIndex);

    // Renderizar artigos
    container.innerHTML = articlesForPage.map(article => `
      <article class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
        <div class="aspect-video bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
          ${article.imageUrl ? 
            `<img src="${article.imageUrl}" alt="${article.title}" class="w-full h-full object-cover">` :
            `<div class="text-white text-center">
              <i class="fas fa-newspaper text-4xl mb-2"></i>
              <p class="text-sm">${this.getCategoryName(article.category)}</p>
            </div>`
          }
        </div>
        
        <div class="p-6">
          <div class="flex items-center mb-3">
            <span class="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1 rounded-full">
              ${this.getCategoryName(article.category)}
            </span>
            <span class="text-gray-500 text-sm ml-3">
              ${this.formatDate(article.timestamp)}
            </span>
          </div>
          
          <h3 class="text-xl font-bold text-gray-800 mb-3 line-clamp-2">
            <a href="article.html?id=${article.id}" class="hover:text-blue-600 transition-colors">
              ${article.title}
            </a>
          </h3>
          
          <p class="text-gray-600 mb-4 line-clamp-3">
            ${article.excerpt}
          </p>
          
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4 text-sm text-gray-500">
              <span><i class="fas fa-eye mr-1"></i>${article.views || 0}</span>
              <span><i class="fas fa-heart mr-1"></i>${article.likes || 0}</span>
            </div>
            
            <a href="article.html?id=${article.id}" 
               class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
              Ler mais
            </a>
          </div>
        </div>
      </article>
    `).join('');

    // Renderizar paginação se necessário
    this.renderPagination();
  }

  renderCarousel() {
    const container = document.getElementById('carousel-container');
    if (!container) return;

    const featuredArticles = this.articles.filter(article => article.featured).slice(0, 3);
    
    if (featuredArticles.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-white">
          <i class="fas fa-newspaper text-4xl mb-4 opacity-50"></i>
          <p class="text-lg opacity-75">Artigos em destaque serão exibidos aqui</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="relative overflow-hidden rounded-lg">
        <div class="carousel-slides flex transition-transform duration-500 ease-in-out" style="transform: translateX(-${this.currentSlide * 100}%)">
          ${featuredArticles.map(article => `
            <div class="carousel-slide w-full flex-shrink-0">
              <div class="relative h-96 bg-gradient-to-r from-blue-600 to-green-600 flex items-center">
                <div class="absolute inset-0 bg-black bg-opacity-40"></div>
                <div class="relative z-10 max-w-4xl mx-auto px-6 text-white">
                  <div class="max-w-2xl">
                    <span class="inline-block bg-accent text-black px-3 py-1 rounded-full text-sm font-semibold mb-4">
                      ${this.getCategoryName(article.category)}
                    </span>
                    <h2 class="text-4xl font-bold mb-4">${article.title}</h2>
                    <p class="text-xl mb-6 opacity-90">${article.excerpt}</p>
                    <a href="article.html?id=${article.id}" 
                       class="inline-block bg-accent hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-lg transition-colors">
                      Ler artigo completo
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
        
        ${featuredArticles.length > 1 ? `
          <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
            ${featuredArticles.map((_, index) => `
              <button onclick="articlesManager.goToSlide(${index})" 
                      class="w-3 h-3 rounded-full transition-colors ${index === this.currentSlide ? 'bg-white' : 'bg-white bg-opacity-50'}">
              </button>
            `).join('')}
          </div>
          
          <button onclick="articlesManager.previousSlide()" 
                  class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-colors">
            <i class="fas fa-chevron-left"></i>
          </button>
          
          <button onclick="articlesManager.nextSlide()" 
                  class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-colors">
            <i class="fas fa-chevron-right"></i>
          </button>
        ` : ''}
      </div>
    `;
  }

  setupCarousel() {
    const featuredArticles = this.articles.filter(article => article.featured);
    
    if (featuredArticles.length > 1) {
      // Auto-play do carrossel
      this.carouselInterval = setInterval(() => {
        this.nextSlide();
      }, 5000);
    }
  }

  nextSlide() {
    const featuredArticles = this.articles.filter(article => article.featured);
    this.currentSlide = (this.currentSlide + 1) % featuredArticles.length;
    this.updateCarouselPosition();
  }

  previousSlide() {
    const featuredArticles = this.articles.filter(article => article.featured);
    this.currentSlide = this.currentSlide === 0 ? featuredArticles.length - 1 : this.currentSlide - 1;
    this.updateCarouselPosition();
  }

  goToSlide(index) {
    this.currentSlide = index;
    this.updateCarouselPosition();
  }

  updateCarouselPosition() {
    const slidesContainer = document.querySelector('.carousel-slides');
    if (slidesContainer) {
      slidesContainer.style.transform = `translateX(-${this.currentSlide * 100}%)`;
    }
    
    // Atualizar indicadores
    const indicators = document.querySelectorAll('.carousel-slides ~ div button');
    indicators.forEach((indicator, index) => {
      if (index === this.currentSlide) {
        indicator.className = indicator.className.replace('bg-white bg-opacity-50', 'bg-white');
      } else {
        indicator.className = indicator.className.replace('bg-white', 'bg-white bg-opacity-50');
      }
    });
  }

  renderPagination() {
    const totalPages = Math.ceil(this.totalArticles / this.articlesPerPage);
    
    if (totalPages <= 1) return;

    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) return;

    let paginationHTML = '<div class="flex justify-center items-center space-x-2 mt-8">';
    
    // Botão anterior
    if (this.currentPage > 1) {
      paginationHTML += `
        <button onclick="articlesManager.goToPage(${this.currentPage - 1})" 
                class="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors">
          <i class="fas fa-chevron-left"></i>
        </button>
      `;
    }
    
    // Números das páginas
    for (let i = 1; i <= totalPages; i++) {
      if (i === this.currentPage) {
        paginationHTML += `
          <button class="px-4 py-2 bg-blue-600 text-white rounded font-medium">
            ${i}
          </button>
        `;
      } else {
        paginationHTML += `
          <button onclick="articlesManager.goToPage(${i})" 
                  class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors">
            ${i}
          </button>
        `;
      }
    }
    
    // Botão próximo
    if (this.currentPage < totalPages) {
      paginationHTML += `
        <button onclick="articlesManager.goToPage(${this.currentPage + 1})" 
                class="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded transition-colors">
          <i class="fas fa-chevron-right"></i>
        </button>
      `;
    }
    
    paginationHTML += '</div>';
    paginationContainer.innerHTML = paginationHTML;
  }

  goToPage(page) {
    this.currentPage = page;
    this.renderArticles();
    
    // Scroll para o topo da seção de artigos
    const articlesSection = document.getElementById('artigos');
    if (articlesSection) {
      articlesSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  getCategoryName(category) {
    const categories = {
      'ia': 'Inteligência Artificial',
      'bigdata': 'Big Data',
      'ciberseguranca': 'Cibersegurança',
      'legislacao': 'Legislação',
      'humor': 'Humor'
    };
    return categories[category] || 'Geral';
  }

  formatDate(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Data inválida';
    }
  }

  showError(message) {
    const errorDiv = document.getElementById('firebase-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
  }

  // Método para recarregar artigos
  async reload() {
    this.initialized = false;
    await this.initialize();
  }
}

// Instância global
const articlesManager = new ArticlesManager();

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => articlesManager.initialize());
} else {
  articlesManager.initialize();
}

// Disponibilizar globalmente
window.articlesManager = articlesManager;

