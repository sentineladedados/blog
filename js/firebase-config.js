// js/firebase-config.js
// Configuração segura do Firebase - SEM credenciais expostas
// Todas as interações com Firebase passam pelo proxy backend

class FirebaseProxy {
  constructor() {
    this.apiBaseUrl = 'http://localhost:5001/api/firebase'; // Será atualizado para produção
    this.initialized = false;
    this.currentUser = null;
    this.authListeners = [];
  }

  // Simula a inicialização do Firebase
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Verificar se o backend está disponível
      const response = await fetch(`${this.apiBaseUrl}/health`);
      if (!response.ok) {
        throw new Error('Backend não está disponível');
      }
      
      this.initialized = true;
      console.log('Firebase Proxy inicializado com sucesso');
      
      // Verificar se há usuário logado no localStorage
      const savedUser = localStorage.getItem('firebase_user');
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        this.notifyAuthListeners(this.currentUser);
      }
      
    } catch (error) {
      console.error('Erro ao inicializar Firebase Proxy:', error);
      this.showError('Erro de conexão com o servidor. Algumas funcionalidades podem não funcionar.');
    }
  }

  // Simula firebase.auth()
  auth() {
    return {
      currentUser: this.currentUser,
      
      onAuthStateChanged: (callback) => {
        this.authListeners.push(callback);
        // Chama imediatamente com o estado atual
        callback(this.currentUser);
        
        // Retorna função para remover o listener
        return () => {
          const index = this.authListeners.indexOf(callback);
          if (index > -1) {
            this.authListeners.splice(index, 1);
          }
        };
      },
      
      signInWithPopup: async (provider) => {
        try {
          // Simular login (em produção, implementar OAuth via backend)
          const mockUser = {
            uid: 'mock_user_' + Date.now(),
            displayName: 'Usuário Teste',
            email: 'usuario@teste.com',
            photoURL: 'https://ui-avatars.com/api/?name=Usuario+Teste'
          };
          
          this.currentUser = mockUser;
          localStorage.setItem('firebase_user', JSON.stringify(mockUser));
          this.notifyAuthListeners(mockUser);
          
          return { user: mockUser };
        } catch (error) {
          console.error('Erro no login:', error);
          throw error;
        }
      },
      
      signOut: async () => {
        try {
          this.currentUser = null;
          localStorage.removeItem('firebase_user');
          this.notifyAuthListeners(null);
        } catch (error) {
          console.error('Erro no logout:', error);
          throw error;
        }
      }
    };
  }

  // Simula firebase.firestore()
  firestore() {
    return {
      collection: (collectionName) => {
        return {
          // Buscar documentos
          get: async () => {
            try {
              const response = await fetch(`${this.apiBaseUrl}/firestore/${collectionName}`);
              if (!response.ok) {
                throw new Error(`Erro ao buscar ${collectionName}: ${response.statusText}`);
              }
              
              const data = await response.json();
              
              // Simular QuerySnapshot do Firebase
              return {
                empty: data.length === 0,
                size: data.length,
                docs: data.map(doc => ({
                  id: doc.id,
                  data: () => doc.data,
                  exists: true
                })),
                forEach: (callback) => {
                  data.forEach(doc => {
                    callback({
                      id: doc.id,
                      data: () => doc.data,
                      exists: true
                    });
                  });
                }
              };
            } catch (error) {
              console.error(`Erro ao buscar ${collectionName}:`, error);
              throw error;
            }
          },
          
          // Buscar documento específico
          doc: (docId) => {
            return {
              get: async () => {
                try {
                  const response = await fetch(`${this.apiBaseUrl}/firestore/${collectionName}/${docId}`);
                  if (!response.ok) {
                    throw new Error(`Erro ao buscar documento ${docId}: ${response.statusText}`);
                  }
                  
                  const data = await response.json();
                  
                  return {
                    id: data.id,
                    exists: !!data.data,
                    data: () => data.data || null
                  };
                } catch (error) {
                  console.error(`Erro ao buscar documento ${docId}:`, error);
                  throw error;
                }
              },
              
              set: async (data) => {
                try {
                  const response = await fetch(`${this.apiBaseUrl}/firestore/${collectionName}/${docId}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                  });
                  
                  if (!response.ok) {
                    throw new Error(`Erro ao salvar documento: ${response.statusText}`);
                  }
                  
                  return await response.json();
                } catch (error) {
                  console.error('Erro ao salvar documento:', error);
                  throw error;
                }
              },
              
              update: async (data) => {
                try {
                  const response = await fetch(`${this.apiBaseUrl}/firestore/${collectionName}/${docId}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                  });
                  
                  if (!response.ok) {
                    throw new Error(`Erro ao atualizar documento: ${response.statusText}`);
                  }
                  
                  return await response.json();
                } catch (error) {
                  console.error('Erro ao atualizar documento:', error);
                  throw error;
                }
              }
            };
          },
          
          // Adicionar novo documento
          add: async (data) => {
            try {
              const response = await fetch(`${this.apiBaseUrl}/firestore/${collectionName}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
              });
              
              if (!response.ok) {
                throw new Error(`Erro ao adicionar documento: ${response.statusText}`);
              }
              
              const result = await response.json();
              return {
                id: result.id
              };
            } catch (error) {
              console.error('Erro ao adicionar documento:', error);
              throw error;
            }
          },
          
          // Filtros e ordenação
          where: (field, operator, value) => {
            const query = { field, operator, value };
            return {
              get: async () => {
                try {
                  const params = new URLSearchParams({
                    where: JSON.stringify(query)
                  });
                  
                  const response = await fetch(`${this.apiBaseUrl}/firestore/${collectionName}?${params}`);
                  if (!response.ok) {
                    throw new Error(`Erro na consulta: ${response.statusText}`);
                  }
                  
                  const data = await response.json();
                  
                  return {
                    empty: data.length === 0,
                    size: data.length,
                    docs: data.map(doc => ({
                      id: doc.id,
                      data: () => doc.data,
                      exists: true
                    })),
                    forEach: (callback) => {
                      data.forEach(doc => {
                        callback({
                          id: doc.id,
                          data: () => doc.data,
                          exists: true
                        });
                      });
                    }
                  };
                } catch (error) {
                  console.error('Erro na consulta:', error);
                  throw error;
                }
              },
              
              orderBy: (field, direction = 'asc') => {
                query.orderBy = { field, direction };
                return this;
              },
              
              limit: (count) => {
                query.limit = count;
                return this;
              }
            };
          },
          
          orderBy: (field, direction = 'asc') => {
            return {
              get: async () => {
                try {
                  const params = new URLSearchParams({
                    orderBy: field,
                    direction: direction
                  });
                  
                  const response = await fetch(`${this.apiBaseUrl}/firestore/${collectionName}?${params}`);
                  if (!response.ok) {
                    throw new Error(`Erro na consulta ordenada: ${response.statusText}`);
                  }
                  
                  const data = await response.json();
                  
                  return {
                    empty: data.length === 0,
                    size: data.length,
                    docs: data.map(doc => ({
                      id: doc.id,
                      data: () => doc.data,
                      exists: true
                    })),
                    forEach: (callback) => {
                      data.forEach(doc => {
                        callback({
                          id: doc.id,
                          data: () => doc.data,
                          exists: true
                        });
                      });
                    }
                  };
                } catch (error) {
                  console.error('Erro na consulta ordenada:', error);
                  throw error;
                }
              },
              
              limit: (count) => {
                return {
                  get: async () => {
                    try {
                      const params = new URLSearchParams({
                        orderBy: field,
                        direction: direction,
                        limit: count
                      });
                      
                      const response = await fetch(`${this.apiBaseUrl}/firestore/${collectionName}?${params}`);
                      if (!response.ok) {
                        throw new Error(`Erro na consulta limitada: ${response.statusText}`);
                      }
                      
                      const data = await response.json();
                      
                      return {
                        empty: data.length === 0,
                        size: data.length,
                        docs: data.map(doc => ({
                          id: doc.id,
                          data: () => doc.data,
                          exists: true
                        })),
                        forEach: (callback) => {
                          data.forEach(doc => {
                            callback({
                              id: doc.id,
                              data: () => doc.data,
                              exists: true
                            });
                          });
                        }
                      };
                    } catch (error) {
                      console.error('Erro na consulta limitada:', error);
                      throw error;
                    }
                  }
                };
              }
            };
          }
        };
      }
    };
  }

  // Notificar listeners de mudança de autenticação
  notifyAuthListeners(user) {
    this.authListeners.forEach(callback => {
      try {
        callback(user);
      } catch (error) {
        console.error('Erro no listener de autenticação:', error);
      }
    });
  }

  // Mostrar erro para o usuário
  showError(message) {
    const errorDiv = document.getElementById('firebase-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
      
      // Esconder após 5 segundos
      setTimeout(() => {
        errorDiv.style.display = 'none';
      }, 5000);
    }
  }

  // Método para atualizar URL da API (para produção)
  setApiBaseUrl(url) {
    this.apiBaseUrl = url;
  }
}

// Instância global do proxy
const firebaseProxy = new FirebaseProxy();

// Simular objetos globais do Firebase
window.firebase = {
  initializeApp: () => firebaseProxy.initialize(),
  auth: () => firebaseProxy.auth(),
  firestore: () => firebaseProxy.firestore(),
  analytics: () => ({ logEvent: () => {} }) // Mock do analytics
};

// Aliases para compatibilidade
window.auth = firebaseProxy.auth();
window.db = firebaseProxy.firestore();

// Inicializar automaticamente
document.addEventListener('DOMContentLoaded', () => {
  firebaseProxy.initialize();
});

// Disponibilizar globalmente
window.firebaseProxy = firebaseProxy;

