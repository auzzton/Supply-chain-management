import os
import jwt
import datetime
from functools import wraps
from flask import Flask, jsonify, request, make_response, Blueprint
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
from dotenv import load_dotenv
from flask_cors import CORS
import logging
from mysql.connector import pooling
from marshmallow import Schema, fields, ValidationError
from flask_swagger_ui import get_swaggerui_blueprint

# Load environment variables from .env file
load_dotenv()

# Flask app setup
app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing (CORS) for API

# Swagger UI setup for documentation
SWAGGER_URL = '/swagger'
API_URL = '/static/swagger.json'
swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={'app_name': "Supply Chain Management API"}
)
app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)

# Configuration for JWT and MySQL
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['MYSQL_POOL_NAME'] = 'scms_pool'
app.config['MYSQL_POOL_SIZE'] = 10
app.config['MYSQL_POOL_RESET_SESSION'] = True

# Logger Setup
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Database Pooling Setup using mysql-connector-python
dbconfig = {
    "user": os.getenv('DB_USER'),
    "password": os.getenv('DB_PASSWORD'),
    "host": os.getenv('DB_HOST'),
    "database": os.getenv('DB_NAME')
}
db_pool = pooling.MySQLConnectionPool(pool_name=app.config['MYSQL_POOL_NAME'],
                                      pool_size=app.config['MYSQL_POOL_SIZE'],
                                      **dbconfig)

# Authentication Middleware (JWT Token)
def token_required(f):
    @wraps(f)
    def decorator(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]  # Bearer token
        if not token:
            return jsonify({'message': 'Token is missing!'}), 403
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = get_user_by_id(data['id'])
        except Exception as e:
            logger.error(f"Token error: {str(e)}")
            return jsonify({'message': 'Token is invalid!'}), 403
        return f(current_user, *args, **kwargs)
    return decorator

# Database Utility Functions with Connection Pooling

def get_db_connection():
    connection = db_pool.get_connection()
    if connection.is_connected():
        return connection
    else:
        raise Exception("Failed to connect to the database")

# Error Handling: Custom Exception
class DBConnectionError(Exception):
    pass

# Marshmallow Schemas for Validation

class UserSchema(Schema):
    username = fields.Str(required=True)
    password = fields.Str(required=True)
    role = fields.Str(required=True, validate=lambda x: x in ['admin', 'user'])

class SupplierSchema(Schema):
    name = fields.Str(required=True)
    contact = fields.Str(required=True)
    email = fields.Str(required=True)
    rating = fields.Float(required=True)
    status = fields.Str(required=True)
    products = fields.Str(required=True)
    notes = fields.Str()

# Database Operations

def get_user_by_id(user_id):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
    user = cursor.fetchone()
    cursor.close()
    connection.close()
    return user

def get_user_by_username(username):
    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    cursor.close()
    connection.close()
    return user

def create_user(username, password, role):
    connection = get_db_connection()
    cursor = connection.cursor()
    hashed_password = generate_password_hash(password, method='sha256')
    cursor.execute("INSERT INTO users (username, password, role) VALUES (%s, %s, %s)",
                   (username, hashed_password, role))
    connection.commit()
    cursor.close()
    connection.close()

def add_supplier(name, contact, email, rating, status, products, notes=None):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute("INSERT INTO suppliers (name, contact, email, rating, status, products, notes) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                   (name, contact, email, rating, status, products, notes))
    connection.commit()
    cursor.close()
    connection.close()

# Routes

# Register a new user
@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        user_schema = UserSchema()
        validated_data = user_schema.load(data)  # Validation

        if get_user_by_username(validated_data['username']):
            return jsonify({'message': 'Username already exists!'}), 400
        
        create_user(validated_data['username'], validated_data['password'], validated_data['role'])
        return jsonify({'message': 'User created successfully!'}), 201
    
    except ValidationError as e:
        return jsonify({"message": "Validation error", "errors": e.messages}), 400
    except Exception as e:
        logger.error(f"Error during registration: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500

# Login and generate JWT token
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        user = get_user_by_username(data['username'])
        
        if not user or not check_password_hash(user['password'], data['password']):
            return jsonify({'message': 'Invalid credentials!'}), 401
        
        token = jwt.encode({'id': user['id'], 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)}, app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({'token': token})
    
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500

# Supplier Routes

@app.route('/suppliers', methods=['POST'])
@token_required
def add_supplier_route(current_user):
    try:
        if current_user['role'] != 'admin':
            return jsonify({'message': 'Permission denied!'}), 403

        data = request.get_json()
        supplier_schema = SupplierSchema()
        validated_data = supplier_schema.load(data)  # Validation
        
        add_supplier(
            name=validated_data['name'],
            contact=validated_data['contact'],
            email=validated_data['email'],
            rating=validated_data['rating'],
            status=validated_data['status'],
            products=validated_data['products'],
            notes=validated_data.get('notes', '')
        )
        
        return jsonify({'message': 'Supplier added successfully!'}), 201
    
    except ValidationError as e:
        return jsonify({"message": "Validation error", "errors": e.messages}), 400
    except DBConnectionError as e:
        logger.error(f"Database connection error: {str(e)}")
        return jsonify({"message": "Database connection error"}), 500
    except Exception as e:
        logger.error(f"Error during supplier creation: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500

@app.route('/suppliers', methods=['GET'])
@token_required
def get_suppliers_route(current_user):
    try:
        if current_user['role'] != 'admin':
            return jsonify({'message': 'Permission denied!'}), 403
        
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)
        cursor.execute("SELECT * FROM suppliers")
        suppliers = cursor.fetchall()
        cursor.close()
        connection.close()
        
        return jsonify({'suppliers': suppliers})
    
    except Exception as e:
        logger.error(f"Error during fetching suppliers: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500

# Main entry point
if __name__ == '__main__':
    app.run(debug=True)
