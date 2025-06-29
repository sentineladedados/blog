import os
import smtplib
import re
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, request, jsonify
from datetime import datetime
import json

newsletter_bp = Blueprint('newsletter', __name__)

@newsletter_bp.route('/newsletter/subscribe', methods=['POST'])
def subscribe_newsletter():
    """Endpoint para inscrição na newsletter"""
    try:
        data = request.get_json()
        
        # Validar email
        email = data.get('email', '').strip().lower()
        if not email:
            return jsonify({
                'success': False,
                'error': 'Email é obrigatório'
            }), 400
        
        # Validar formato do email
        if not is_valid_email(email):
            return jsonify({
                'success': False,
                'error': 'Email inválido'
            }), 400
        
        # Verificar se já está inscrito
        if is_email_subscribed(email):
            return jsonify({
                'success': False,
                'error': 'Este email já está inscrito na nossa newsletter'
            }), 400
        
        # Preparar dados da inscrição
        subscription_data = {
            'email': email,
            'timestamp': datetime.now().isoformat(),
            'ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', ''),
            'status': 'active',
            'source': 'website'
        }
        
        # Salvar inscrição
        save_subscription(subscription_data)
        
        # Enviar email de boas-vindas
        try:
            send_welcome_email(email)
        except Exception as e:
            print(f"Erro ao enviar email de boas-vindas: {e}")
            # Não falhar se o email não funcionar
        
        return jsonify({
            'success': True,
            'message': 'Inscrição realizada com sucesso! Verifique seu email para confirmar.'
        })
        
    except Exception as e:
        print(f"Erro na inscrição da newsletter: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor. Tente novamente mais tarde.'
        }), 500

@newsletter_bp.route('/newsletter/unsubscribe', methods=['POST'])
def unsubscribe_newsletter():
    """Endpoint para cancelar inscrição na newsletter"""
    try:
        data = request.get_json()
        
        email = data.get('email', '').strip().lower()
        if not email:
            return jsonify({
                'success': False,
                'error': 'Email é obrigatório'
            }), 400
        
        # Verificar se está inscrito
        if not is_email_subscribed(email):
            return jsonify({
                'success': False,
                'error': 'Este email não está inscrito na nossa newsletter'
            }), 400
        
        # Cancelar inscrição
        unsubscribe_email(email)
        
        return jsonify({
            'success': True,
            'message': 'Inscrição cancelada com sucesso.'
        })
        
    except Exception as e:
        print(f"Erro ao cancelar inscrição: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor. Tente novamente mais tarde.'
        }), 500

@newsletter_bp.route('/newsletter/subscribers', methods=['GET'])
def list_subscribers():
    """Endpoint para listar inscritos (apenas para admin)"""
    try:
        # Em produção, adicionar autenticação de admin
        subscribers_file = 'data/newsletter_subscribers.json'
        
        if not os.path.exists(subscribers_file):
            return jsonify({
                'success': True,
                'subscribers': [],
                'total': 0,
                'active': 0
            })
        
        with open(subscribers_file, 'r', encoding='utf-8') as f:
            subscribers = json.load(f)
        
        # Filtrar apenas ativos
        active_subscribers = [s for s in subscribers if s.get('status') == 'active']
        
        # Ordenar por data mais recente
        subscribers.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({
            'success': True,
            'subscribers': subscribers,
            'total': len(subscribers),
            'active': len(active_subscribers)
        })
        
    except Exception as e:
        print(f"Erro ao listar inscritos: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro ao carregar inscritos'
        }), 500

def is_valid_email(email):
    """Valida formato do email"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def is_email_subscribed(email):
    """Verifica se email já está inscrito"""
    try:
        subscribers_file = 'data/newsletter_subscribers.json'
        
        if not os.path.exists(subscribers_file):
            return False
        
        with open(subscribers_file, 'r', encoding='utf-8') as f:
            subscribers = json.load(f)
        
        # Verificar se email existe e está ativo
        for subscriber in subscribers:
            if subscriber['email'] == email and subscriber.get('status') == 'active':
                return True
        
        return False
        
    except Exception as e:
        print(f"Erro ao verificar inscrição: {e}")
        return False

def save_subscription(subscription_data):
    """Salva inscrição em arquivo JSON"""
    try:
        subscribers_file = 'data/newsletter_subscribers.json'
        
        # Criar diretório se não existir
        os.makedirs(os.path.dirname(subscribers_file), exist_ok=True)
        
        # Carregar inscritos existentes
        subscribers = []
        if os.path.exists(subscribers_file):
            try:
                with open(subscribers_file, 'r', encoding='utf-8') as f:
                    subscribers = json.load(f)
            except:
                subscribers = []
        
        # Adicionar nova inscrição
        subscribers.append(subscription_data)
        
        # Salvar arquivo
        with open(subscribers_file, 'w', encoding='utf-8') as f:
            json.dump(subscribers, f, ensure_ascii=False, indent=2)
            
    except Exception as e:
        print(f"Erro ao salvar inscrição: {e}")

def unsubscribe_email(email):
    """Cancela inscrição do email"""
    try:
        subscribers_file = 'data/newsletter_subscribers.json'
        
        if not os.path.exists(subscribers_file):
            return
        
        with open(subscribers_file, 'r', encoding='utf-8') as f:
            subscribers = json.load(f)
        
        # Atualizar status para inativo
        for subscriber in subscribers:
            if subscriber['email'] == email:
                subscriber['status'] = 'unsubscribed'
                subscriber['unsubscribed_at'] = datetime.now().isoformat()
        
        # Salvar arquivo
        with open(subscribers_file, 'w', encoding='utf-8') as f:
            json.dump(subscribers, f, ensure_ascii=False, indent=2)
            
    except Exception as e:
        print(f"Erro ao cancelar inscrição: {e}")

def send_welcome_email(email):
    """Envia email de boas-vindas"""
    # Configurações de email (usar variáveis de ambiente em produção)
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_username = os.getenv('SMTP_USERNAME', '')
    smtp_password = os.getenv('SMTP_PASSWORD', '')
    
    if not smtp_username or not smtp_password:
        print("Configurações de email não encontradas")
        return
    
    # Criar mensagem
    msg = MIMEMultipart('alternative')
    msg['From'] = f"Sentinela de Dados <{smtp_username}>"
    msg['To'] = email
    msg['Subject'] = "Bem-vindo à Newsletter do Sentinela de Dados!"
    
    # Corpo do email em texto
    text_body = """
    Olá!
    
    Obrigado por se inscrever na newsletter do Sentinela de Dados!
    
    Você receberá análises exclusivas sobre:
    • Inteligência Artificial
    • Big Data
    • Cibersegurança
    • Legislação tecnológica
    • E muito mais!
    
    Fique atento ao seu email para não perder nenhuma novidade.
    
    Se você não se inscreveu ou deseja cancelar sua inscrição, 
    acesse: https://sentineladedados.com/unsubscribe
    
    Atenciosamente,
    Equipe Sentinela de Dados
    """
    
    # Corpo do email em HTML
    html_body = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e3a8a 0%, #065f46 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; background: #f9fafb; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
            .button { display: inline-block; background: #1e3a8a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            ul { padding-left: 20px; }
            li { margin-bottom: 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Bem-vindo ao Sentinela de Dados!</h1>
                <p>Decifrando no código, um futuro mais humano</p>
            </div>
            
            <div class="content">
                <h2>Obrigado por se inscrever!</h2>
                
                <p>Você agora faz parte da nossa comunidade e receberá análises exclusivas sobre:</p>
                
                <ul>
                    <li><strong>Inteligência Artificial</strong> - Impactos e debates éticos</li>
                    <li><strong>Big Data</strong> - Privacidade e uso de dados</li>
                    <li><strong>Cibersegurança</strong> - Proteção digital</li>
                    <li><strong>Legislação</strong> - LGPD, PL 2338/2023 e mais</li>
                    <li><strong>Humor</strong> - O lado divertido da tecnologia</li>
                </ul>
                
                <p>Fique atento ao seu email para não perder nenhuma novidade!</p>
                
                <a href="https://sentineladedados.com" class="button">Visite nosso site</a>
            </div>
            
            <div class="footer">
                <p>Se você não se inscreveu ou deseja cancelar sua inscrição, 
                <a href="https://sentineladedados.com/unsubscribe">clique aqui</a>.</p>
                
                <p>© 2025 Sentinela de Dados. Todos os direitos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Anexar ambas as versões
    msg.attach(MIMEText(text_body, 'plain', 'utf-8'))
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))
    
    # Enviar email
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)

