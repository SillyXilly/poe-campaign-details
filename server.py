from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import uuid

app = Flask(__name__, static_folder='.')
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
USERS_DIR = os.path.join(BASE_DIR, 'users')

def ensure_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(USERS_DIR, exist_ok=True)
    users_file = os.path.join(DATA_DIR, 'users.json')
    if not os.path.exists(users_file):
        with open(users_file, 'w') as f:
            json.dump({'users': []}, f)

ensure_dirs()

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/users', methods=['GET'])
def get_users():
    users_file = os.path.join(DATA_DIR, 'users.json')
    with open(users_file, 'r') as f:
        return jsonify(json.load(f))

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    username = data.get('username', '').strip()

    if not username:
        return jsonify({'error': 'Username required'}), 400

    # Sanitize username
    username = ''.join(c for c in username if c.isalnum() or c in '-_')

    users_file = os.path.join(DATA_DIR, 'users.json')
    with open(users_file, 'r') as f:
        users_data = json.load(f)

    if username in users_data['users']:
        return jsonify({'error': 'User already exists'}), 400

    # Create user directory and data file
    user_dir = os.path.join(USERS_DIR, username)
    os.makedirs(user_dir, exist_ok=True)
    os.makedirs(os.path.join(user_dir, 'images'), exist_ok=True)

    user_data_file = os.path.join(user_dir, 'data.json')
    with open(user_data_file, 'w') as f:
        json.dump({'sections': []}, f)

    # Add to users list
    users_data['users'].append(username)
    with open(users_file, 'w') as f:
        json.dump(users_data, f, indent=2)

    return jsonify({'username': username})

@app.route('/api/users/<username>/data', methods=['GET'])
def get_user_data(username):
    user_data_file = os.path.join(USERS_DIR, username, 'data.json')
    if not os.path.exists(user_data_file):
        return jsonify({'error': 'User not found'}), 404

    with open(user_data_file, 'r') as f:
        return jsonify(json.load(f))

@app.route('/api/users/<username>/data', methods=['PUT'])
def save_user_data(username):
    user_data_file = os.path.join(USERS_DIR, username, 'data.json')
    if not os.path.exists(os.path.dirname(user_data_file)):
        return jsonify({'error': 'User not found'}), 404

    data = request.get_json()
    with open(user_data_file, 'w') as f:
        json.dump(data, f, indent=2)

    return jsonify({'success': True})

@app.route('/api/users/<username>/images', methods=['POST'])
def upload_image(username):
    user_images_dir = os.path.join(USERS_DIR, username, 'images')
    if not os.path.exists(user_images_dir):
        return jsonify({'error': 'User not found'}), 404

    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400

    # Generate unique filename
    ext = os.path.splitext(file.filename)[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(user_images_dir, filename)
    file.save(filepath)

    return jsonify({'filename': filename, 'url': f'/users/{username}/images/{filename}'})

@app.route('/users/<username>/images/<filename>')
def serve_user_image(username, filename):
    return send_from_directory(os.path.join(USERS_DIR, username, 'images'), filename)

if __name__ == '__main__':
    print("Starting PoE2 Campaign Guide server...")
    print("Open http://localhost:5000 in your browser")
    app.run(debug=True, port=5000)
