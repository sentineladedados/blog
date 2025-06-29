import os
import requests
import json
from flask import Blueprint, request, jsonify
from datetime import datetime

firebase_bp = Blueprint('firebase', __name__)

# Configurações do Firebase a partir das variáveis de ambiente
FIREBASE_API_KEY = os.getenv('FIREBASE_API_KEY')
FIREBASE_PROJECT_ID = os.getenv('FIREBASE_PROJECT_ID')
FIREBASE_AUTH_DOMAIN = os.getenv('FIREBASE_AUTH_DOMAIN')

# URLs base do Firebase
FIRESTORE_BASE_URL = f"https://firestore.googleapis.com/v1/projects/{FIREBASE_PROJECT_ID}/databases/(default)/documents"
AUTH_BASE_URL = f"https://identitytoolkit.googleapis.com/v1/accounts"

@firebase_bp.route('/health', methods=['GET'])
def health_check():
    """Endpoint para verificar se o proxy está funcionando"""
    return jsonify({
        'status': 'healthy',
        'service': 'Firebase Proxy',
        'firebase_configured': bool(FIREBASE_API_KEY and FIREBASE_PROJECT_ID)
    })

@firebase_bp.route('/firestore/<collection_name>', methods=['GET'])
def get_collection(collection_name):
    """Buscar todos os documentos de uma coleção"""
    try:
        # Parâmetros de consulta
        order_by = request.args.get('orderBy')
        direction = request.args.get('direction', 'asc')
        limit = request.args.get('limit')
        where_param = request.args.get('where')
        
        # Construir URL da consulta
        url = f"{FIRESTORE_BASE_URL}/{collection_name}"
        params = {'key': FIREBASE_API_KEY}
        
        # Adicionar ordenação se especificada
        if order_by:
            if direction.lower() == 'desc':
                params['orderBy'] = f"{order_by} desc"
            else:
                params['orderBy'] = order_by
        
        # Adicionar limite se especificado
        if limit:
            params['pageSize'] = limit
        
        # Fazer requisição para o Firestore
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            documents = data.get('documents', [])
            
            # Processar documentos
            result = []
            for doc in documents:
                doc_id = doc['name'].split('/')[-1]
                doc_data = parse_firestore_fields(doc.get('fields', {}))
                
                # Aplicar filtro where se especificado
                if where_param:
                    try:
                        where_filter = json.loads(where_param)
                        if not apply_where_filter(doc_data, where_filter):
                            continue
                    except:
                        pass
                
                result.append({
                    'id': doc_id,
                    'data': doc_data
                })
            
            return jsonify(result)
        else:
            return jsonify({
                'error': 'Erro ao buscar documentos',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Erro interno do servidor',
            'details': str(e)
        }), 500

@firebase_bp.route('/firestore/<collection_name>/<doc_id>', methods=['GET'])
def get_document(collection_name, doc_id):
    """Buscar um documento específico"""
    try:
        url = f"{FIRESTORE_BASE_URL}/{collection_name}/{doc_id}"
        params = {'key': FIREBASE_API_KEY}
        
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            doc = response.json()
            doc_data = parse_firestore_fields(doc.get('fields', {}))
            
            return jsonify({
                'id': doc_id,
                'data': doc_data
            })
        elif response.status_code == 404:
            return jsonify({
                'id': doc_id,
                'data': None
            })
        else:
            return jsonify({
                'error': 'Erro ao buscar documento',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Erro interno do servidor',
            'details': str(e)
        }), 500

@firebase_bp.route('/firestore/<collection_name>', methods=['POST'])
def add_document(collection_name):
    """Adicionar novo documento"""
    try:
        data = request.get_json()
        
        # Converter dados para formato Firestore
        firestore_fields = convert_to_firestore_fields(data)
        
        # Adicionar timestamp se não existir
        if 'timestamp' not in firestore_fields:
            firestore_fields['timestamp'] = {
                'timestampValue': datetime.now().isoformat() + 'Z'
            }
        
        url = f"{FIRESTORE_BASE_URL}/{collection_name}"
        params = {'key': FIREBASE_API_KEY}
        
        payload = {
            'fields': firestore_fields
        }
        
        response = requests.post(url, params=params, json=payload)
        
        if response.status_code == 200:
            doc = response.json()
            doc_id = doc['name'].split('/')[-1]
            
            return jsonify({
                'id': doc_id,
                'success': True
            })
        else:
            return jsonify({
                'error': 'Erro ao adicionar documento',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Erro interno do servidor',
            'details': str(e)
        }), 500

@firebase_bp.route('/firestore/<collection_name>/<doc_id>', methods=['PUT'])
def set_document(collection_name, doc_id):
    """Definir/substituir documento"""
    try:
        data = request.get_json()
        
        # Converter dados para formato Firestore
        firestore_fields = convert_to_firestore_fields(data)
        
        url = f"{FIRESTORE_BASE_URL}/{collection_name}/{doc_id}"
        params = {'key': FIREBASE_API_KEY}
        
        payload = {
            'fields': firestore_fields
        }
        
        response = requests.patch(url, params=params, json=payload)
        
        if response.status_code == 200:
            return jsonify({
                'id': doc_id,
                'success': True
            })
        else:
            return jsonify({
                'error': 'Erro ao definir documento',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Erro interno do servidor',
            'details': str(e)
        }), 500

@firebase_bp.route('/firestore/<collection_name>/<doc_id>', methods=['PATCH'])
def update_document(collection_name, doc_id):
    """Atualizar documento parcialmente"""
    try:
        data = request.get_json()
        
        # Converter dados para formato Firestore
        firestore_fields = convert_to_firestore_fields(data)
        
        # Adicionar timestamp de atualização
        firestore_fields['updatedAt'] = {
            'timestampValue': datetime.now().isoformat() + 'Z'
        }
        
        url = f"{FIRESTORE_BASE_URL}/{collection_name}/{doc_id}"
        params = {'key': FIREBASE_API_KEY}
        
        # Criar máscara de campos para atualização parcial
        field_paths = list(firestore_fields.keys())
        params['updateMask.fieldPaths'] = field_paths
        
        payload = {
            'fields': firestore_fields
        }
        
        response = requests.patch(url, params=params, json=payload)
        
        if response.status_code == 200:
            return jsonify({
                'id': doc_id,
                'success': True
            })
        else:
            return jsonify({
                'error': 'Erro ao atualizar documento',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Erro interno do servidor',
            'details': str(e)
        }), 500

def parse_firestore_fields(fields):
    """Converter campos do Firestore para formato Python"""
    result = {}
    
    for key, value in fields.items():
        if 'stringValue' in value:
            result[key] = value['stringValue']
        elif 'integerValue' in value:
            result[key] = int(value['integerValue'])
        elif 'doubleValue' in value:
            result[key] = float(value['doubleValue'])
        elif 'booleanValue' in value:
            result[key] = value['booleanValue']
        elif 'timestampValue' in value:
            result[key] = value['timestampValue']
        elif 'arrayValue' in value:
            result[key] = [parse_firestore_value(item) for item in value['arrayValue'].get('values', [])]
        elif 'mapValue' in value:
            result[key] = parse_firestore_fields(value['mapValue'].get('fields', {}))
        elif 'nullValue' in value:
            result[key] = None
        else:
            result[key] = value
    
    return result

def parse_firestore_value(value):
    """Converter um valor individual do Firestore"""
    if 'stringValue' in value:
        return value['stringValue']
    elif 'integerValue' in value:
        return int(value['integerValue'])
    elif 'doubleValue' in value:
        return float(value['doubleValue'])
    elif 'booleanValue' in value:
        return value['booleanValue']
    elif 'timestampValue' in value:
        return value['timestampValue']
    elif 'nullValue' in value:
        return None
    else:
        return value

def convert_to_firestore_fields(data):
    """Converter dados Python para formato Firestore"""
    result = {}
    
    for key, value in data.items():
        if isinstance(value, str):
            result[key] = {'stringValue': value}
        elif isinstance(value, int):
            result[key] = {'integerValue': str(value)}
        elif isinstance(value, float):
            result[key] = {'doubleValue': value}
        elif isinstance(value, bool):
            result[key] = {'booleanValue': value}
        elif isinstance(value, list):
            result[key] = {
                'arrayValue': {
                    'values': [convert_to_firestore_value(item) for item in value]
                }
            }
        elif isinstance(value, dict):
            result[key] = {
                'mapValue': {
                    'fields': convert_to_firestore_fields(value)
                }
            }
        elif value is None:
            result[key] = {'nullValue': None}
        else:
            result[key] = {'stringValue': str(value)}
    
    return result

def convert_to_firestore_value(value):
    """Converter um valor individual para formato Firestore"""
    if isinstance(value, str):
        return {'stringValue': value}
    elif isinstance(value, int):
        return {'integerValue': str(value)}
    elif isinstance(value, float):
        return {'doubleValue': value}
    elif isinstance(value, bool):
        return {'booleanValue': value}
    elif value is None:
        return {'nullValue': None}
    else:
        return {'stringValue': str(value)}

def apply_where_filter(doc_data, where_filter):
    """Aplicar filtro where aos dados do documento"""
    field = where_filter.get('field')
    operator = where_filter.get('operator')
    value = where_filter.get('value')
    
    if not field or not operator:
        return True
    
    doc_value = doc_data.get(field)
    
    if operator == '==':
        return doc_value == value
    elif operator == '!=':
        return doc_value != value
    elif operator == '>':
        return doc_value > value
    elif operator == '>=':
        return doc_value >= value
    elif operator == '<':
        return doc_value < value
    elif operator == '<=':
        return doc_value <= value
    elif operator == 'in':
        return doc_value in value if isinstance(value, list) else False
    elif operator == 'array-contains':
        return value in doc_value if isinstance(doc_value, list) else False
    
    return True

