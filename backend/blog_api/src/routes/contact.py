import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, request, jsonify
from datetime import datetime
import json

contact_bp = Blueprint('contact', __name__)

@contact_bp.route('/contact', methods=['POST'])
def submit_contact():
    """Endpoint para processar formulário de contato"""
    try:
        data = request.get_json()
        
        # Validar dados obrigatórios
        required_fields = ['name', 'email', 'subject', 'message']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Campo {field} é obrigatório'
                }), 400
        
        # Validar formato do email
        email = data['email']
        if '@' not in email or '.' not in email:
            return jsonify({
                'success': False,
                'error': 'Email inválido'
            }), 400
        
        # Preparar dados do contato
        contact_data = {
            'name': data['name'],
            'email': email,
            'subject': data['subject'],
            'message': data['message'],
            'timestamp': datetime.now().isoformat(),
            'ip': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', '')
        }
        
        # Salvar em arquivo (em produção, usar banco de dados)
        save_contact_to_file(contact_data)
        
        # Enviar email de notificação (se configurado)
        try:
            send_contact_notification(contact_data)
        except Exception as e:
            print(f"Erro ao enviar email de notificação: {e}")
            # Não falhar se o email não funcionar
        
        return jsonify({
            'success': True,
            'message': 'Mensagem enviada com sucesso! Entraremos em contato em breve.'
        })
        
    except Exception as e:
        print(f"Erro no formulário de contato: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro interno do servidor. Tente novamente mais tarde.'
        }), 500

def save_contact_to_file(contact_data):
    """Salva dados de contato em arquivo JSON"""
    try:
        contacts_file = 'data/contacts.json'
        
        # Criar diretório se não existir
        os.makedirs(os.path.dirname(contacts_file), exist_ok=True)
        
        # Carregar contatos existentes
        contacts = []
        if os.path.exists(contacts_file):
            try:
                with open(contacts_file, 'r', encoding='utf-8') as f:
                    contacts = json.load(f)
            except:
                contacts = []
        
        # Adicionar novo contato
        contacts.append(contact_data)
        
        # Manter apenas os últimos 1000 contatos
        if len(contacts) > 1000:
            contacts = contacts[-1000:]
        
        # Salvar arquivo
        with open(contacts_file, 'w', encoding='utf-8') as f:
            json.dump(contacts, f, ensure_ascii=False, indent=2)
            
    except Exception as e:
        print(f"Erro ao salvar contato: {e}")

def send_contact_notification(contact_data):
    """Envia email de notificação para o administrador"""
    # Configurações de email (usar variáveis de ambiente em produção)
    smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('SMTP_PORT', '587'))
    smtp_username = os.getenv('SMTP_USERNAME', '')
    smtp_password = os.getenv('SMTP_PASSWORD', '')
    admin_email = os.getenv('ADMIN_EMAIL', 'admin@sentineladedados.com')
    
    if not smtp_username or not smtp_password:
        print("Configurações de email não encontradas")
        return
    
    # Criar mensagem
    msg = MIMEMultipart()
    msg['From'] = smtp_username
    msg['To'] = admin_email
    msg['Subject'] = f"[Sentinela de Dados] Novo contato: {contact_data['subject']}"
    
    # Corpo do email
    body = f"""
    Novo contato recebido no site Sentinela de Dados:
    
    Nome: {contact_data['name']}
    Email: {contact_data['email']}
    Assunto: {contact_data['subject']}
    Data: {contact_data['timestamp']}
    
    Mensagem:
    {contact_data['message']}
    
    ---
    IP: {contact_data['ip']}
    User Agent: {contact_data['user_agent']}
    """
    
    msg.attach(MIMEText(body, 'plain', 'utf-8'))
    
    # Enviar email
    with smtplib.SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.send_message(msg)

@contact_bp.route('/contacts', methods=['GET'])
def list_contacts():
    """Endpoint para listar contatos (apenas para admin)"""
    try:
        # Em produção, adicionar autenticação de admin
        contacts_file = 'data/contacts.json'
        
        if not os.path.exists(contacts_file):
            return jsonify({
                'success': True,
                'contacts': []
            })
        
        with open(contacts_file, 'r', encoding='utf-8') as f:
            contacts = json.load(f)
        
        # Ordenar por data mais recente
        contacts.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return jsonify({
            'success': True,
            'contacts': contacts
        })
        
    except Exception as e:
        print(f"Erro ao listar contatos: {e}")
        return jsonify({
            'success': False,
            'error': 'Erro ao carregar contatos'
        }), 500

