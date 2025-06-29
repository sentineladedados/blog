// js/auth.js
// Sistema de autenticação usando o proxy Firebase

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authContainer = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    this.authContainer = document.getElementById('auth-container');
    
    // Aguardar o proxy do Firebase estar pronto
    if (window.firebaseProxy) {
      await window.firebaseProxy.initialize();
      this.setupAuthListener();
      this.initialized = true;
    } else {
      // Tentar novamente após um tempo
      setTimeout(() => this.initialize(), 1000);
    }
  }

  setupAuthListener() {
    // Escutar mudanças no estado de autenticação
    if (window.auth && window.auth.onAuthStateChanged) {
      window.auth.onAuthStateChanged((user) => {
        this.currentUser = user;
        this.updateAuthUI(user);
      });
    }
  }

  updateAuthUI(user) {
    if (!this.authContainer) return;

    if (user) {
      // Usuário logado
      this.authContainer.innerHTML = `
        <div class="flex items-center space-x-4">
          <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User')}" 
               alt="${user.displayName || 'Usuário'}" 
               class="w-8 h-8 rounded-full">
          <span class="text-white">${user.displayName || 'Usuário'}</span>
          <button onclick="authManager.signOut()" 
                  class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors">
            Sair
          </button>
        </div>
      `;
    } else {
      // Usuário não logado
      this.authContainer.innerHTML = `
        <button onclick="authManager.signIn()" 
                class="bg-accent hover:bg-yellow-600 text-white px-4 py-2 rounded transition-colors">
          Entrar
        </button>
      `;
    }
  }

  async signIn() {
    try {
      if (!window.auth) {
        throw new Error('Sistema de autenticação não disponível');
      }

      // Simular provider do Google (em produção, implementar OAuth real)
      const provider = {}; // Mock provider
      
      const result = await window.auth.signInWithPopup(provider);
      
      if (result && result.user) {
        this.showMessage('Login realizado com sucesso!', 'success');
      }
      
    } catch (error) {
      console.error('Erro no login:', error);
      this.showMessage('Erro ao fazer login. Tente novamente.', 'error');
    }
  }

  async signOut() {
    try {
      if (!window.auth) {
        throw new Error('Sistema de autenticação não disponível');
      }

      await window.auth.signOut();
      this.showMessage('Logout realizado com sucesso!', 'success');
      
    } catch (error) {
      console.error('Erro no logout:', error);
      this.showMessage('Erro ao fazer logout. Tente novamente.', 'error');
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isLoggedIn() {
    return !!this.currentUser;
  }

  showMessage(message, type = 'info') {
    // Criar notificação temporária
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${this.getMessageClasses(type)}`;
    
    notification.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-${this.getMessageIcon(type)} mr-3"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white hover:text-gray-200">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remover automaticamente após 3 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, 3000);
  }

  getMessageClasses(type) {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-blue-500 text-white';
    }
  }

  getMessageIcon(type) {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'exclamation-circle';
      case 'warning':
        return 'exclamation-triangle';
      default:
        return 'info-circle';
    }
  }
}

// Instância global
const authManager = new AuthManager();

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => authManager.initialize());
} else {
  authManager.initialize();
}

// Disponibilizar globalmente
window.authManager = authManager;

