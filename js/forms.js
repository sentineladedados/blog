// js/forms.js
// Sistema para gerenciar formulários de contato e newsletter

class FormsManager {
  constructor() {
    this.apiBaseUrl = 'http://localhost:5001/api'; // Será atualizado para produção
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    this.setupNewsletterForm();
    this.setupContactForm();
    this.initialized = true;
  }

  setupNewsletterForm() {
    // Configurar todos os formulários de newsletter na página
    const newsletterForms = document.querySelectorAll('#newsletter-form, .newsletter-form');
    
    newsletterForms.forEach(form => {
      form.addEventListener('submit', (e) => this.handleNewsletterSubmit(e));
    });
  }

  setupContactForm() {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
      contactForm.addEventListener('submit', (e) => this.handleContactSubmit(e));
    }
  }

  async handleNewsletterSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const emailInput = form.querySelector('input[type="email"]');
    const submitButton = form.querySelector('button[type="submit"]');
    
    if (!emailInput || !submitButton) {
      console.error('Elementos do formulário não encontrados');
      return;
    }

    const email = emailInput.value.trim();
    
    if (!email) {
      this.showMessage('Por favor, digite seu email.', 'error');
      return;
    }

    if (!this.isValidEmail(email)) {
      this.showMessage('Por favor, digite um email válido.', 'error');
      return;
    }

    // Mostrar estado de carregamento
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';

    try {
      const response = await fetch(`${this.apiBaseUrl}/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        this.showMessage(data.message, 'success');
        emailInput.value = '';
        
        // Analytics (se disponível)
        if (typeof gtag !== 'undefined') {
          gtag('event', 'newsletter_signup', {
            'event_category': 'engagement',
            'event_label': 'newsletter'
          });
        }
      } else {
        this.showMessage(data.error || 'Erro ao processar inscrição.', 'error');
      }

    } catch (error) {
      console.error('Erro na inscrição da newsletter:', error);
      this.showMessage('Erro de conexão. Tente novamente mais tarde.', 'error');
    } finally {
      // Restaurar botão
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  }

  async handleContactSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    
    // Extrair dados do formulário
    const contactData = {
      name: formData.get('name') || document.getElementById('name')?.value,
      email: formData.get('email') || document.getElementById('email')?.value,
      subject: formData.get('subject') || document.getElementById('subject')?.value,
      message: formData.get('message') || document.getElementById('message')?.value
    };

    // Validar dados
    const validation = this.validateContactData(contactData);
    if (!validation.isValid) {
      this.showMessage(validation.error, 'error');
      return;
    }

    // Mostrar estado de carregamento
    const originalText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enviando...';

    try {
      const response = await fetch(`${this.apiBaseUrl}/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData)
      });

      const data = await response.json();

      if (data.success) {
        this.showMessage(data.message, 'success');
        form.reset();
        
        // Analytics (se disponível)
        if (typeof gtag !== 'undefined') {
          gtag('event', 'contact_form_submit', {
            'event_category': 'engagement',
            'event_label': 'contact'
          });
        }
      } else {
        this.showMessage(data.error || 'Erro ao enviar mensagem.', 'error');
      }

    } catch (error) {
      console.error('Erro no formulário de contato:', error);
      this.showMessage('Erro de conexão. Tente novamente mais tarde.', 'error');
    } finally {
      // Restaurar botão
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  }

  validateContactData(data) {
    if (!data.name || data.name.trim().length < 2) {
      return { isValid: false, error: 'Nome deve ter pelo menos 2 caracteres.' };
    }

    if (!data.email || !this.isValidEmail(data.email)) {
      return { isValid: false, error: 'Email inválido.' };
    }

    if (!data.subject || data.subject.trim().length < 3) {
      return { isValid: false, error: 'Assunto deve ter pelo menos 3 caracteres.' };
    }

    if (!data.message || data.message.trim().length < 10) {
      return { isValid: false, error: 'Mensagem deve ter pelo menos 10 caracteres.' };
    }

    return { isValid: true };
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  showMessage(message, type = 'info') {
    // Remover mensagens existentes
    const existingMessages = document.querySelectorAll('.form-message');
    existingMessages.forEach(msg => msg.remove());

    // Criar nova mensagem
    const messageElement = document.createElement('div');
    messageElement.className = `form-message fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 max-w-md ${this.getMessageClasses(type)}`;
    
    messageElement.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-${this.getMessageIcon(type)} mr-3"></i>
        <span class="flex-1">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-3 text-white hover:text-gray-200">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    document.body.appendChild(messageElement);
    
    // Remover automaticamente após 5 segundos
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
          }
        }, 300);
      }
    }, 5000);
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

  // Método para atualizar URL da API (para produção)
  setApiBaseUrl(url) {
    this.apiBaseUrl = url;
  }

  // Método para cancelar inscrição da newsletter
  async unsubscribeNewsletter(email) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/newsletter/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        this.showMessage(data.message, 'success');
      } else {
        this.showMessage(data.error || 'Erro ao cancelar inscrição.', 'error');
      }

    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      this.showMessage('Erro de conexão. Tente novamente mais tarde.', 'error');
    }
  }
}

// Instância global
const formsManager = new FormsManager();

// Funções globais para compatibilidade
window.subscribeNewsletter = (email) => {
  const form = document.createElement('form');
  const input = document.createElement('input');
  input.type = 'email';
  input.value = email;
  form.appendChild(input);
  
  const button = document.createElement('button');
  button.type = 'submit';
  form.appendChild(button);
  
  const event = new Event('submit');
  form.addEventListener('submit', (e) => formsManager.handleNewsletterSubmit(e));
  form.dispatchEvent(event);
};

window.unsubscribeNewsletter = (email) => formsManager.unsubscribeNewsletter(email);

// Inicialização automática
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => formsManager.initialize());
} else {
  formsManager.initialize();
}

// Disponibilizar globalmente
window.formsManager = formsManager;

