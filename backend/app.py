import sys
import os
import mysql.connector
from flask import Flask, jsonify, request
from flask_bcrypt import Bcrypt
from functools import wraps
import jwt
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.dirname(__file__))
load_dotenv()

app = Flask(__name__)
bcrypt = Bcrypt(app)

DEFAULT_JWT_SECRET = '9f4g2H6p!zQ@kR7v$tY8uW^eJ0iL*oM3A(sD5fG)hJ1kL2zX3c'
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', DEFAULT_JWT_SECRET)

if app.config['JWT_SECRET_KEY'] == DEFAULT_JWT_SECRET and os.getenv('JWT_SECRET_KEY') is None:
    print("Warning: JWT_SECRET_KEY is using default value. Set it in .env.")

CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}}, supports_credentials=True)

def get_db_connection():
    try:
        return mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "sp_restaurant_db"),
            port=int(os.getenv("DB_PORT", 3306)),
            charset='utf8mb4'
        )
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        raise

def create_token(identity, expires_delta=timedelta(hours=24)):
    payload = {
        'exp': datetime.now(timezone.utc) + expires_delta,
        'iat': datetime.now(timezone.utc),
        **identity 
    }
    return jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')
    
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == "OPTIONS":
            return f(*args, **kwargs)

        token = None
        if "Authorization" in request.headers:
            parts = request.headers["Authorization"].split(" ")
            if len(parts) == 2 and parts[0] == "Bearer":
                token = parts[1]

        if not token:
            return jsonify({"message": "Token is missing"}), 401

        try:
            data = jwt.decode(token, app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
            current_user = {
                "user_id": data["user_id"],
                "restaurant_id": data["restaurant_id"],
            }
        except Exception as e:
            return jsonify({"message": "Token is invalid", "detail": str(e)}), 401

        return f(current_user, *args, **kwargs)
    return decorated

def execute_query(query, params=None, fetch_one=False, fetch_all=False, commit=False):
    """Helper function for database operations"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())
        
        if commit:
            conn.commit()
            return cursor.lastrowid if 'INSERT' in query.upper() else cursor.rowcount
        elif fetch_one:
            return cursor.fetchone()
        elif fetch_all:
            return cursor.fetchall()
        
        return cursor.rowcount
    except Exception as e:
        if conn and commit:
            conn.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

def format_datetime_fields(data, datetime_fields=['created_at', 'updated_at', 'order_time', 'hire_date']):
    """Convert datetime objects to ISO format strings"""
    if isinstance(data, list):
        return [format_datetime_fields(item, datetime_fields) for item in data]
    
    if isinstance(data, dict):
        formatted = data.copy()
        for field in datetime_fields:
            if field in formatted and formatted[field] is not None:
                if hasattr(formatted[field], 'isoformat'):
                    formatted[field] = formatted[field].isoformat()
        
        for field in ['base_price', 'price_at_order', 'total_amount', 'salary']:
            if field in formatted and formatted[field] is not None:
                formatted[field] = str(formatted[field])
        
        return formatted
    
    return data

# ==================== AUTH ROUTES ====================
@app.route('/api/auth/register', methods=['POST'])
def register_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')

    if not username or not password or not email:
        return jsonify({'message': 'Username, password, and email are required'}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    conn = get_db_connection()
    try:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                return jsonify({'message': 'Username already exists'}), 409

            cursor.execute("SELECT id FROM restaurants WHERE email = %s", (email,))
            if cursor.fetchone():
                return jsonify({'message': 'Email already exists'}), 409

            cursor.execute(
                "INSERT INTO restaurants (name, address, phone_number, email) VALUES (%s, %s, %s, %s)",
                (f'ร้านค้าของ {username}', '', '', email)
            )
            cursor.execute("SELECT LAST_INSERT_ID() AS id")
            new_restaurant_id = cursor.fetchone()['id']

            cursor.execute(
                "INSERT INTO users (username, password, role, restaurant_id) VALUES (%s, %s, %s, %s)",
                (username, hashed_password, 'admin', new_restaurant_id)
            )
            conn.commit()

            return jsonify({
                'message': 'Admin registered, restaurant created successfully',
                'username': username,
                'role': 'admin',
                'restaurant_id': new_restaurant_id
            }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'message': f'Database error during registration: {str(e)}'}), 500
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    is_customer = username.endswith("User")
    login_username = username[:-4] if is_customer else username

    conn = get_db_connection()
    try:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(
                "SELECT id, username, password, restaurant_id FROM users WHERE username = %s",
                (login_username,)
            )
            user = cursor.fetchone()
    finally:
        conn.close()

    if user and bcrypt.check_password_hash(user['password'], password):
        identity = {
            'user_id': user['id'],
            'username': user['username'],
            'restaurant_id': user['restaurant_id']
        }

        access_token = create_token(identity)

        return jsonify({
            'message': 'Login successful',
            'token': access_token,
            'restaurant_id': user['restaurant_id'],
            'is_customer': is_customer
        }), 200
    else:
        return jsonify({'message': 'Invalid username or password'}), 401

# ==================== MENU ROUTES ====================
@app.route('/api/menus', methods=['GET'])
@token_required
def get_all_menus(current_user):
    try:
        restaurant_id = current_user["restaurant_id"]
        category = request.args.get("category")

        query = """
            SELECT 
                ROW_NUMBER() OVER (ORDER BY id) as display_id,
                id, restaurant_id, name, description, base_price, category,
                image_url, is_available, created_at, updated_at
            FROM menus 
            WHERE restaurant_id = %s AND is_deleted = FALSE
        """
        params = [restaurant_id]

        if category and category != "All":
            query += " AND category = %s"
            params.append(category)

        query += " ORDER BY id"
        
        menus = execute_query(query, params, fetch_all=True)
        return jsonify(format_datetime_fields(menus)), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch menus", "detail": str(e)}), 500

@app.route('/api/menus/<int:menu_id>', methods=['GET'])
@token_required
def get_menu_by_id(current_user, menu_id):
    try:
        query = """
            SELECT id, restaurant_id, name, description, base_price, category,
                   image_url, is_available, created_at, updated_at
            FROM menus WHERE id = %s AND restaurant_id = %s
        """
        menu_item = execute_query(query, (menu_id, current_user["restaurant_id"]), fetch_one=True)

        if not menu_item:
            return jsonify({"message": "Menu not found"}), 404

        return jsonify(format_datetime_fields(menu_item)), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch menu", "detail": str(e)}), 500

@app.route('/api/menus', methods=['POST'])
@token_required
def create_menu(current_user):
    data = request.get_json()
    
    required_fields = ['name', 'base_price', 'category']
    if not all(data.get(field) for field in required_fields if field != 'base_price') or data.get('base_price') is None:
        return jsonify({"error": "Missing required menu data"}), 400

    try:
        current_time = datetime.now()
        query = """
            INSERT INTO menus (restaurant_id, name, description, base_price, category,
                              image_url, is_available, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            current_user["restaurant_id"],
            data.get('name'),
            data.get('description'),
            data.get('base_price'),
            data.get('category'),
            data.get('image_url'),
            data.get('is_available', True),
            current_time,
            current_time
        )
        
        menu_id = execute_query(query, params, commit=True)
        return jsonify({"message": "Menu created successfully", "id": menu_id}), 201
    except Exception as e:
        return jsonify({"error": "Failed to create menu", "detail": str(e)}), 500

@app.route('/api/menus/<int:menu_id>', methods=['PUT', 'PATCH'])
@token_required
def update_menu(current_user, menu_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        set_clauses = []
        params = []

        field_mapping = {
            'name': str, 'description': str, 'category': str, 'image_url': str,
            'base_price': float, 'is_available': bool
        }

        for key, value in data.items():
            if key in field_mapping:
                set_clauses.append(f"{key} = %s")
                params.append(field_mapping[key](value))

        if not set_clauses:
            return jsonify({"message": "No valid fields to update"}), 200

        set_clauses.append("updated_at = %s")
        params.extend([datetime.now(), menu_id, current_user["restaurant_id"]])

        query = f"UPDATE menus SET {', '.join(set_clauses)} WHERE id = %s AND restaurant_id = %s"
        rows_affected = execute_query(query, params, commit=True)

        if rows_affected == 0:
            return jsonify({"message": "Menu not found or no changes"}), 404
        return jsonify({"message": "Menu updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to update menu", "detail": str(e)}), 500

@app.route('/api/menus/<int:menu_id>', methods=['DELETE'])
@token_required
def delete_menu(current_user, menu_id):
    try:
        query = "UPDATE menus SET is_deleted = TRUE WHERE id = %s AND restaurant_id = %s"
        rows_affected = execute_query(query, (menu_id, current_user["restaurant_id"]), commit=True)
        
        if rows_affected == 0:
            return jsonify({"error": "Menu not found or unauthorized"}), 404
            
        return jsonify({"message": "Menu deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to delete menu", "detail": str(e)}), 500

# ==================== ORDER ROUTES ====================
@app.route('/api/orders', methods=['GET'])
@token_required
def get_orders(current_user):
    try:
        restaurant_id = current_user["restaurant_id"]
        
        query = """
            SELECT DISTINCT o.id, o.table_number, o.total_amount, o.status, 
                   o.payment_status, o.order_time, o.updated_at, o.qr_code_url
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN menus m ON oi.menu_id = m.id
            WHERE o.restaurant_id = %s 
            AND m.is_deleted = FALSE
            ORDER BY o.order_time DESC
        """
        
        orders = execute_query(query, (restaurant_id,), fetch_all=True)
        
        for order in orders:
            items_query = """
                SELECT oi.*, m.name as menu_name, m.image_url as menu_image
                FROM order_items oi
                JOIN menus m ON oi.menu_id = m.id
                WHERE oi.order_id = %s AND m.is_deleted = FALSE
            """
            order["items"] = execute_query(items_query, (order["id"],), fetch_all=True)
        
        return jsonify(format_datetime_fields(orders)), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch orders"}), 500

@app.route('/api/orders/<int:order_id>', methods=['GET'])
@token_required
def get_order_by_id(current_user, order_id):
    try:
        order_query = """
            SELECT id, restaurant_id, table_number, total_amount, status,
                   payment_status, order_time, updated_at, qr_code_url
            FROM orders WHERE id = %s AND restaurant_id = %s
        """
        order = execute_query(order_query, (order_id, current_user['restaurant_id']), fetch_one=True)
        
        if not order:
            return jsonify({"message": "Order not found"}), 404

        items_query = """
            SELECT oi.id, oi.menu_id, oi.quantity, oi.price_at_order, oi.notes,
                   oi.created_at, oi.updated_at, m.name AS menu_name, m.image_url AS menu_image
            FROM order_items oi
            JOIN menus m ON oi.menu_id = m.id
            WHERE oi.order_id = %s
        """
        items = execute_query(items_query, (order_id,), fetch_all=True)
        order['items'] = format_datetime_fields(items)

        return jsonify(format_datetime_fields(order)), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch order", "detail": str(e)}), 500

@app.route('/api/orders', methods=['POST'])
@token_required
def create_order(current_user):
    data = request.get_json()
    
    required_fields = ['table_number', 'total_amount', 'status', 'payment_status'
    ]
    if not all(data.get(field) is not None for field in required_fields):
        return jsonify({"error": "Missing required order data"}), 400
    
    items = data.get('items', [])
    if not isinstance(items, list):
        return jsonify({"error": "Items must be a list"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        conn.autocommit = False
        cursor = conn.cursor()
        current_time = datetime.now()

        order_query = """
            INSERT INTO orders (restaurant_id, table_number, total_amount, status, 
                               payment_status, order_time, qr_code_url, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        order_params = (
            current_user["restaurant_id"], data.get('table_number'), data.get('total_amount'),
            data.get('status'), data.get('payment_status'), current_time,
            data.get('qr_code_url'), current_time
        )
        cursor.execute(order_query, order_params)
        new_order_id = cursor.lastrowid

        if items:
            item_query = """
                INSERT INTO order_items (order_id, menu_id, quantity, price_at_order, notes, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            for item in items:
                required_item_fields = ['menu_id', 'quantity', 'price_at_order']
                if not all(item.get(field) is not None for field in required_item_fields):
                    raise ValueError(f"Missing required item data: {item}")
                
                cursor.execute(item_query, (
                    new_order_id, item.get('menu_id'), item.get('quantity'),
                    item.get('price_at_order'), item.get('notes', ''),
                    current_time, current_time
                ))

        conn.commit()
        return jsonify({"message": "Order created successfully", "order_id": new_order_id}), 201
    except ValueError as ve:
        if conn:
            conn.rollback()
        return jsonify({"error": "Item validation error", "detail": str(ve)}), 400
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": "Failed to create order", "detail": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/orders/<int:order_id>', methods=['PUT', 'PATCH'])
@token_required
def update_order(current_user, order_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        check_query = "SELECT id FROM orders WHERE id=%s AND restaurant_id=%s"
        existing_order = execute_query(check_query, (order_id, current_user["restaurant_id"]), fetch_one=True)
        
        if not existing_order:
            return jsonify({"error": "Order not found or unauthorized"}), 404

        set_clauses = []
        params = []

        field_mapping = {
            'status': str, 'payment_status': str, 'qr_code_url': str,
            'total_amount': float, 'table_number': int
        }

        for key, value in data.items():
            if key in field_mapping:
                set_clauses.append(f"{key}=%s")
                params.append(field_mapping[key](value))

        if not set_clauses:
            return jsonify({"message": "No valid fields provided for update"}), 200

        set_clauses.append("updated_at=%s")
        params.extend([datetime.now(), order_id, current_user["restaurant_id"]])

        query = f"UPDATE orders SET {', '.join(set_clauses)} WHERE id=%s AND restaurant_id=%s"
        rows_affected = execute_query(query, params, commit=True)

        if rows_affected == 0:
            return jsonify({"message": "No changes made"}), 404
        return jsonify({"message": "Order updated successfully"}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to update order", "detail": str(e)}), 500

@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
@token_required
def delete_order(current_user, order_id):
    try:
        query = "DELETE FROM orders WHERE id=%s AND restaurant_id=%s"
        rows_affected = execute_query(query, (order_id, current_user["restaurant_id"]), commit=True)

        if rows_affected == 0:
            return jsonify({"message": "Order not found"}), 404
        return jsonify({"message": "Order deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to delete order", "detail": str(e)}), 500

@app.route('/api/orders/<int:order_id>/payment', methods=['POST'])
@token_required
def process_payment(current_user, order_id):
    try:
        data = request.get_json()
        payment_method = data.get('payment_method')
        qr_code_url = data.get('qr_code_url')

        if payment_method == 'qr_code' and not qr_code_url:
            return jsonify({"error": "QR Code URL is required for QR payment"}), 400

        query = """
            UPDATE orders 
            SET payment_status = 'paid',
                qr_code_url = %s,
                updated_at = %s 
            WHERE id = %s AND restaurant_id = %s
        """
        params = (qr_code_url if payment_method == 'qr_code' else None,
                 datetime.now(),
                 order_id,
                 current_user["restaurant_id"])
        
        rows_affected = execute_query(query, params, commit=True)

        if rows_affected == 0:
            return jsonify({"error": "Order not found or unauthorized"}), 404

        return jsonify({"message": "Payment processed successfully"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to process payment", "detail": str(e)}), 500

@app.route('/api/orders/cleanup-deleted-menus', methods=['POST'])
@token_required
def cleanup_orders_with_deleted_menus(current_user):
    try:
        restaurant_id = current_user["restaurant_id"]
        
        query = """
            SELECT DISTINCT o.id, o.table_number, o.total_amount
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN menus m ON oi.menu_id = m.id
            WHERE o.restaurant_id = %s AND m.is_deleted = TRUE
        """
        orders_to_cleanup = execute_query(query, (restaurant_id,), fetch_all=True)
        
        if not orders_to_cleanup:
            return jsonify({"message": "ไม่มีออเดอร์ที่ต้องลบ", "count": 0}), 200
        
        order_ids = [order["id"] for order in orders_to_cleanup]
        
        delete_items_query = f"""
            DELETE FROM order_items 
            WHERE order_id IN ({','.join(['%s'] * len(order_ids))})
        """
        execute_query(delete_items_query, order_ids, commit=True)
        
        delete_orders_query = f"""
            DELETE FROM orders 
            WHERE id IN ({','.join(['%s'] * len(order_ids))})
        """
        execute_query(delete_orders_query, order_ids, commit=True)
        
        return jsonify({
            "message": f"ลบออเดอร์ที่มีเมนูถูกลบแล้ว {len(orders_to_cleanup)} รายการ",
            "count": len(orders_to_cleanup),
            "deleted_orders": [f"ออเดอร์ #{order['id']} โต๊ะ {order['table_number']} ยอด ฿{order['total_amount']}" for order in orders_to_cleanup]
        }), 200
        
    except Exception as e:
        return jsonify({"error": "เกิดข้อผิดพลาดในการลบออเดอร์", "detail": str(e)}), 500

# ==================== EMPLOYEE ROUTES ====================
@app.route('/api/employees', methods=['GET'])
@token_required
def get_all_employees(current_user):
    try:
        query = """
            SELECT id, full_name, position, phone_number, salary, hire_date, 
                   created_at, updated_at, restaurant_id
            FROM employees WHERE restaurant_id = %s
        """
        employees = execute_query(query, (current_user["restaurant_id"],), fetch_all=True)
        return jsonify(format_datetime_fields(employees)), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch employees", "detail": str(e)}), 500

@app.route('/api/employees', methods=['POST'])
@token_required
def create_employee(current_user):
    data = request.get_json()
    required_fields = ['full_name', 'position', 'salary', 'hire_date']
    
    if not all(data.get(field) for field in required_fields if field != 'salary') or data.get('salary') is None:
        return jsonify({"error": "Missing required employee data"}), 400

    try:
        current_time = datetime.now()
        hire_date = datetime.strptime(data.get('hire_date'), '%Y-%m-%d').date()

        query = """
            INSERT INTO employees (restaurant_id, full_name, position, phone_number, 
                                  salary, hire_date, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            current_user["restaurant_id"], data.get('full_name'), data.get('position'),
            data.get('phone_number'), data.get('salary'), hire_date, current_time, current_time
        )
        
        employee_id = execute_query(query, params, commit=True)
        return jsonify({"message": "Employee created successfully", "id": employee_id}), 201
    except Exception as e:
        return jsonify({"error": "Failed to create employee", "detail": str(e)}), 500

@app.route('/api/employees/<int:employee_id>', methods=['PUT', 'PATCH'])
@token_required
def update_employee(current_user, employee_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided for update"}), 400

    try:
        check_query = "SELECT restaurant_id FROM employees WHERE id = %s"
        emp = execute_query(check_query, (employee_id,), fetch_one=True)
        
        if not emp:
            return jsonify({"message": "Employee not found"}), 404
        if emp['restaurant_id'] != current_user['restaurant_id']:
            return jsonify({"error": "Unauthorized"}), 403

        set_clauses = []
        params = []

        for key, value in data.items():
            if key in ['full_name', 'position', 'phone_number']:
                set_clauses.append(f"{key} = %s")
                params.append(value)
            elif key == 'salary':
                set_clauses.append(f"{key} = %s")
                params.append(float(value))
            elif key == 'hire_date':
                set_clauses.append(f"{key} = %s")
                params.append(datetime.strptime(value, '%Y-%m-%d').date())

        if not set_clauses:
            return jsonify({"message": "No valid fields provided for update"}), 200

        set_clauses.append("updated_at = %s")
        params.extend([datetime.now(), employee_id])

        query = f"UPDATE employees SET {', '.join(set_clauses)} WHERE id = %s"
        execute_query(query, params, commit=True)

        return jsonify({"message": "Employee updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to update employee", "detail": str(e)}), 500

@app.route('/api/employees/<int:employee_id>', methods=['DELETE'])
@token_required
def delete_employee(current_user, employee_id):
    try:
        check_query = "SELECT restaurant_id FROM employees WHERE id = %s"
        emp = execute_query(check_query, (employee_id,), fetch_one=True)
        
        if not emp:
            return jsonify({"message": "Employee not found"}), 404
        if emp['restaurant_id'] != current_user['restaurant_id']:
            return jsonify({"error": "Unauthorized"}), 403

        query = "DELETE FROM employees WHERE id = %s"
        execute_query(query, (employee_id,), commit=True)
        return jsonify({"message": "Employee deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to delete employee", "detail": str(e)}), 500

# ==================== DASHBOARD ROUTES ====================
@app.route('/api/admin/dashboard', methods=['GET'])
@token_required
def get_dashboard(current_user):
    try:
        restaurant_id = current_user.get('restaurant_id')
        if not restaurant_id:
            return jsonify({"error": "No restaurant_id found for user"}), 401

        month_str = request.args.get('month')
        month_filter = ""
        params = [restaurant_id]

        if month_str:
            month_filter = " AND DATE_FORMAT(o.order_time, '%Y-%m') = %s"
            params.append(month_str)

        total_sales_query = f"""
            SELECT SUM(total_amount) AS total_sales
            FROM orders o
            WHERE o.restaurant_id = %s AND o.payment_status = 'paid' {month_filter}
        """
        total_sales_result = execute_query(total_sales_query, params, fetch_one=True)
        total_sales = float(total_sales_result['total_sales'] or 0)

        top_items_query = f"""
            SELECT m.name, SUM(oi.quantity) AS total_quantity, 
                   SUM(oi.quantity * oi.price_at_order) AS total_amount
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN menus m ON oi.menu_id = m.id
            WHERE o.restaurant_id = %s AND o.payment_status = 'paid' {month_filter}
            GROUP BY m.name
            ORDER BY total_quantity DESC
            LIMIT 5
        """
        top_items = execute_query(top_items_query, params, fetch_all=True)

        category_sales_query = f"""
            SELECT m.category, SUM(oi.quantity * oi.price_at_order) AS total_amount
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN menus m ON oi.menu_id = m.id
            WHERE o.restaurant_id = %s AND o.payment_status = 'paid' {month_filter}
            GROUP BY m.category
            ORDER BY total_amount DESC
        """
        category_sales = execute_query(category_sales_query, params, fetch_all=True)

        for item in top_items + category_sales:
            item['total_amount'] = float(item['total_amount'])

        return jsonify({
            "total_sales": total_sales,
            "top_items": top_items,
            "category_sales": category_sales
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to fetch dashboard data", "detail": str(e)}), 500

# ==================== TABLE ROUTES ====================
@app.route('/api/tables', methods=['GET'])
def get_tables():
    try:
        query = """
            SELECT id, table_number, status, capacity 
            FROM tables 
            WHERE restaurant_id = %s 
            ORDER BY table_number
        """
        tables = execute_query(query, (1,), fetch_all=True)
        return jsonify(tables), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tables/<int:table_id>/status', methods=['PUT'])
def update_table_status(table_id):
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['free', 'occupied']:
            return jsonify({'error': 'Invalid status. Use "free" or "occupied" only.'}), 400
        
        query = """
            UPDATE tables 
            SET status = %s, updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s AND restaurant_id = %s
        """
        rows_affected = execute_query(query, (new_status, table_id, 1), commit=True)
        
        if rows_affected == 0:
            return jsonify({'error': 'Table not found'}), 404
        
        return jsonify({'message': 'Table status updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tables/<int:table_id>/occupy', methods=['POST'])
def occupy_table(table_id):
    try:
        status_query = "SELECT status FROM tables WHERE id = %s"
        result = execute_query(status_query, (table_id,), fetch_one=True)
        
        if not result:
            return jsonify({'error': 'Table not found'}), 404
        
        if result['status'] != 'free':
            return jsonify({'error': 'Table is not available'}), 400
        
        update_query = """
            UPDATE tables 
            SET status = 'occupied', updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s
        """
        execute_query(update_query, (table_id,), commit=True)
        
        return jsonify({'message': 'Table occupied successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tables/<int:table_id>/free', methods=['POST'])
def free_table(table_id):
    try:
        query = """
            UPDATE tables 
            SET status = 'free', updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s AND restaurant_id = %s
        """
        rows_affected = execute_query(query, (table_id, 1), commit=True)
        
        if rows_affected == 0:
            return jsonify({'error': 'Table not found'}), 404
        
        return jsonify({'message': 'Table freed successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/tables/open-all', methods=['POST'])
@token_required
def open_all_tables(current_user):
    try:
        restaurant_id = current_user["restaurant_id"]
        
        query = "UPDATE tables SET status = 'free' WHERE restaurant_id = %s"
        rows_affected = execute_query(query, (restaurant_id,), commit=True)
        
        return jsonify({
            "success": True,
            "message": f"เปิดโต๊ะทั้งหมดแล้ว ({rows_affected} โต๊ะ)",
            "tables_opened": rows_affected
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Failed to open all tables", 
            "detail": str(e)
        }), 500

# ==================== STOCK MANAGEMENT ROUTES ====================
@app.route('/api/ingredients', methods=['GET'])
@token_required
def get_ingredients(current_user):
    try:
        restaurant_id = current_user["restaurant_id"]
        
        query = """
            SELECT i.*, 
                   COALESCE(SUM(s.quantity), 0) as total_stock,
                   COUNT(s.id) as batch_count
            FROM ingredients i
            LEFT JOIN ingredient_stock s ON i.id = s.ingredient_id
            WHERE i.restaurant_id = %s AND i.is_active = TRUE
            GROUP BY i.id
            ORDER BY i.name
        """
        
        ingredients = execute_query(query, (restaurant_id,), fetch_all=True)
        return jsonify(format_datetime_fields(ingredients)), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch ingredients", "detail": str(e)}), 500

@app.route('/api/ingredients', methods=['POST'])
@token_required
def create_ingredient(current_user):
    data = request.get_json()
    # category, unit, and unit_cost removed from DB / frontend, require only name
    required_fields = ['name']
    
    if not all(data.get(field) is not None and data.get(field) != "" for field in required_fields):
        return jsonify({"error": "Missing required ingredient data"}), 400

    try:
        current_time = datetime.now()
        query = """
            INSERT INTO ingredients (restaurant_id, name, minimum_stock, supplier_info, description, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            current_user["restaurant_id"], 
            data.get('name'), 
            data.get('minimum_stock', 0),
            data.get('supplier_info'), 
            data.get('description'), 
            current_time, 
            current_time
        )
        
        ingredient_id = execute_query(query, params, commit=True)
        return jsonify({"message": "Ingredient created successfully", "id": ingredient_id}), 201
    except Exception as e:
        return jsonify({"error": "Failed to create ingredient", "detail": str(e)}), 500

@app.route('/api/ingredients/<int:ingredient_id>', methods=['PUT'])
@token_required
def update_ingredient(current_user, ingredient_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        set_clauses = []
        params = []

        # removed category, unit, and unit_cost fields
        field_mapping = {
            'name': str, 'supplier_info': str,
            'description': str, 'minimum_stock': int
        }

        for key, value in data.items():
            if key in field_mapping:
                set_clauses.append(f"{key} = %s")
                params.append(field_mapping[key](value))

        if not set_clauses:
            return jsonify({"message": "No valid fields to update"}), 200

        set_clauses.append("updated_at = %s")
        params.extend([datetime.now(), ingredient_id, current_user["restaurant_id"]])

        query = f"UPDATE ingredients SET {', '.join(set_clauses)} WHERE id = %s AND restaurant_id = %s"
        rows_affected = execute_query(query, params, commit=True)

        if rows_affected == 0:
            return jsonify({"message": "Ingredient not found"}), 404
        return jsonify({"message": "Ingredient updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to update ingredient", "detail": str(e)}), 500

@app.route('/api/ingredients/<int:ingredient_id>/hard-delete', methods=['DELETE'])
@token_required
def hard_delete_ingredient(current_user, ingredient_id):
    try:
        restaurant_id = current_user.get("restaurant_id")

        # ตรวจสอบว่า ingredient เป็นของร้านนี้
        check_q = "SELECT id FROM ingredients WHERE id = %s AND restaurant_id = %s"
        ing = execute_query(check_q, (ingredient_id, restaurant_id), fetch_one=True)
        if not ing:
            return jsonify({"error": "Ingredient not found or unauthorized"}), 404

        # ลบ stock ที่เกี่ยวข้องก่อน (ถ้าไม่มี ON DELETE CASCADE)
        delete_stock_q = "DELETE FROM ingredient_stock WHERE ingredient_id = %s"
        execute_query(delete_stock_q, (ingredient_id,), commit=True)

        # ลบ ingredient
        delete_ing_q = "DELETE FROM ingredients WHERE id = %s AND restaurant_id = %s"
        rows = execute_query(delete_ing_q, (ingredient_id, restaurant_id), commit=True)

        if rows == 0:
            return jsonify({"error": "Failed to delete ingredient"}), 500

        return jsonify({"message": "Ingredient and related stock deleted"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to hard-delete ingredient", "detail": str(e)}), 500

@app.route('/api/ingredient-stock', methods=['GET'])
@token_required
def get_ingredient_stock(current_user):
    try:
        restaurant_id = current_user["restaurant_id"]
        ingredient_id = request.args.get('ingredient_id')
        
        if ingredient_id:
            query = """
                SELECT s.*, s.unit, i.name as ingredient_name, i.minimum_stock
                FROM ingredient_stock s
                JOIN ingredients i ON s.ingredient_id = i.id
                WHERE i.restaurant_id = %s AND s.ingredient_id = %s
                ORDER BY s.expiry_date ASC, s.received_date ASC
            """
            params = (restaurant_id, ingredient_id)
        else:
            query = """
                SELECT s.*, s.unit, i.name as ingredient_name, i.minimum_stock
                FROM ingredient_stock s
                JOIN ingredients i ON s.ingredient_id = i.id
                WHERE i.restaurant_id = %s
                ORDER BY i.name, s.expiry_date ASC
            """
            params = (restaurant_id,)
        
        stock = execute_query(query, params, fetch_all=True)
        return jsonify(format_datetime_fields(stock)), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch stock", "detail": str(e)}), 500

@app.route('/api/ingredient-stock', methods=['POST'])
@token_required
def add_stock(current_user):
    data = request.get_json()
    required_fields = ['ingredient_id', 'quantity', 'received_date']
    
    if not all(data.get(field) for field in required_fields):
        return jsonify({"error": "Missing required stock data"}), 400

    try:
        # ตรวจสอบว่า ingredient เป็นของร้านนี้
        check_query = "SELECT id FROM ingredients WHERE id = %s AND restaurant_id = %s"
        ingredient = execute_query(check_query, (data.get('ingredient_id'), current_user["restaurant_id"]), fetch_one=True)
        
        if not ingredient:
            return jsonify({"error": "Ingredient not found"}), 404

        current_time = datetime.now()
        # เอา batch_number ออก (ถูกลบจาก DB) และใส่ unit
        query = """
            INSERT INTO ingredient_stock (ingredient_id, unit, quantity, received_date, 
                                        expiry_date, purchase_price, supplier, notes, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            data.get('ingredient_id'),
            data.get('unit'),            
            data.get('quantity'),
            data.get('received_date'),
            data.get('expiry_date'),
            data.get('purchase_price'),
            data.get('supplier'),
            data.get('notes'),
            current_time,
            current_time
        )
        
        stock_id = execute_query(query, params, commit=True)
        return jsonify({"message": "Stock added successfully", "id": stock_id}), 201
    except Exception as e:
        print("add_stock error:", str(e))  # debug log
        return jsonify({"error": "Failed to add stock", "detail": str(e)}), 500

@app.route('/api/ingredient-stock/<int:stock_id>', methods=['PUT'])
@token_required
def update_stock(current_user, stock_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        # ตรวจสอบสิทธิ์: stock ต้องเป็นของร้านนี้
        check_query = """
            SELECT s.id FROM ingredient_stock s
            JOIN ingredients i ON s.ingredient_id = i.id
            WHERE s.id = %s AND i.restaurant_id = %s
        """
        stock = execute_query(check_query, (stock_id, current_user["restaurant_id"]), fetch_one=True)

        if not stock:
            return jsonify({"error": "Stock not found"}), 404

        set_clauses = []
        params = []

        # ปรับ mapping ให้รองรับ 'unit' และเอา 'status' ออก (ถ้าคอลัมน์ถูกลบ)
        field_mapping = {
            'unit': str,
            'quantity': float,
            'received_date': 'date',
            'expiry_date': 'date',
            'purchase_price': float,
            'supplier': str,
            'notes': str
        }

        from datetime import datetime as _dt

        for key, value in data.items():
            if key not in field_mapping or value is None:
                continue

            mapper = field_mapping[key]
            if mapper == 'date':
                # ยอมรับ string 'YYYY-MM-DD' หรือ ISO
                if isinstance(value, str) and value.strip() != "":
                    try:
                        # try parse common formats, store as string for DB
                        parsed = _dt.fromisoformat(value)
                        params.append(parsed)
                    except Exception:
                        # fallback: pass raw string (MySQL will accept 'YYYY-MM-DD' etc.)
                        params.append(value)
                else:
                    # empty -> skip
                    continue
            else:
                try:
                    params.append(mapper(value))
                except Exception:
                    # หากแปลงค่าไม่ได้ ให้ใช้ raw value (safe fallback)
                    params.append(value)

            set_clauses.append(f"{key} = %s")

        if not set_clauses:
            return jsonify({"message": "No valid fields to update"}), 200

        # เพิ่ม updated_at และ stock_id สำหรับ WHERE
        set_clauses.append("updated_at = %s")
        params.append(_dt.now())
        params.append(stock_id)

        query = f"UPDATE ingredient_stock SET {', '.join(set_clauses)} WHERE id = %s"
        execute_query(query, params, commit=True)

        return jsonify({"message": "Stock updated successfully"}), 200

    except Exception as e:
        # log error เพื่อช่วย debug (ดูบน terminal)
        print("update_stock error:", str(e))
        return jsonify({"error": "Failed to update stock", "detail": str(e)}), 500

@app.route('/api/ingredient-stock/<int:stock_id>', methods=['DELETE'])
@token_required
def delete_stock(current_user, stock_id):
    try:
        # ตรวจสอบสิทธิ์
        check_query = """
            SELECT s.id, s.quantity, s.unit, i.name as ingredient_name 
            FROM ingredient_stock s
            JOIN ingredients i ON s.ingredient_id = i.id
            WHERE s.id = %s AND i.restaurant_id = %s
        """
        stock = execute_query(check_query, (stock_id, current_user["restaurant_id"]), fetch_one=True)
        
        if not stock:
            return jsonify({"error": "Stock not found or unauthorized"}), 404

        # ลบสต็อก
        delete_query = "DELETE FROM ingredient_stock WHERE id = %s"
        rows_affected = execute_query(delete_query, (stock_id,), commit=True)
        
        if rows_affected == 0:
            return jsonify({"error": "Failed to delete stock"}), 500
            
        return jsonify({
            "message": "Stock deleted successfully",
            "deleted_stock": {
                "id": stock_id,
                "ingredient_name": stock['ingredient_name'],
                "quantity": float(stock['quantity']),
                "unit": stock.get('unit')
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to delete stock", "detail": str(e)}), 500

# ==================== EXPENSE MANAGEMENT ROUTES ====================
@app.route('/api/expenses', methods=['GET', 'POST'])
@token_required
def handle_expenses(current_user):
    """จัดการรายจ่ายทั้งหมด"""
    restaurant_id = current_user["restaurant_id"]
    
    if request.method == 'GET':
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = """
            SELECT id, category, amount, description, expense_date, created_at
            FROM expenses 
            WHERE restaurant_id = %s
        """
        params = [restaurant_id]
        
        if start_date and end_date:
            query += " AND expense_date BETWEEN %s AND %s"
            params.extend([start_date, end_date])
            
        query += " ORDER BY expense_date DESC"
        
        expenses = execute_query(query, params, fetch_all=True)
        return jsonify(expenses), 200
        
    elif request.method == 'POST':
        data = request.get_json()
        required_fields = ['category', 'amount', 'expense_date']
        
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400
            
        query = """
            INSERT INTO expenses (restaurant_id, category, amount, description, expense_date)
            VALUES (%s, %s, %s, %s, %s)
        """
        
        execute_query(query, (
            restaurant_id,
            data['category'],
            float(data['amount']),
            data.get('description', ''),
            data['expense_date']
        ), commit=True)
        
        return jsonify({"message": "Expense added successfully"}), 201

@app.route('/api/financial-summary', methods=['GET'])
@token_required
def get_financial_summary(current_user):
    """สร้างรายงานสรุปการเงิน"""
    restaurant_id = current_user["restaurant_id"]
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not start_date or not end_date:
        return jsonify({"error": "start_date and end_date are required"}), 400
    
    try:
        # 1. ดึงข้อมูลรายรับจาก orders
        revenue_query = """
            SELECT 
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(*) as total_orders
            FROM orders 
            WHERE restaurant_id = %s 
            AND status = 'completed' 
            AND payment_status = 'paid'
            AND DATE(order_time) BETWEEN %s AND %s
        """
        revenue_data = execute_query(revenue_query, (restaurant_id, start_date, end_date), fetch_one=True)
        
        # 2. ดึงข้อมูลรายจ่ายจาก expenses แยกตามหมวดหมู่
        expenses_query = """
            SELECT 
                category,
                COALESCE(SUM(amount), 0) as total_amount
            FROM expenses 
            WHERE restaurant_id = %s 
            AND DATE(expense_date) BETWEEN %s AND %s
            AND category IN ('rent', 'utilities', 'equipment')
            GROUP BY category
        """
        expenses_data = execute_query(expenses_query, (restaurant_id, start_date, end_date))
        
        # 3. ดึงข้อมูลเงินเดือนจาก employees (คำนวณจากช่วงวันที่)
        salary_query = """
            SELECT 
                COALESCE(SUM(salary), 0) as total_salary
            FROM employees 
            WHERE restaurant_id = %s 
            AND status = 'active'
        """
        salary_data = execute_query(salary_query, (restaurant_id,), fetch_one=True)
        
        # คำนวณเงินเดือนตามจำนวนเดือนในช่วงวันที่
        from datetime import datetime
        start_dt = datetime.strptime(start_date, '%Y-%m-%d')
        end_dt = datetime.strptime(end_date, '%Y-%m-%d')
        months_diff = (end_dt.year - start_dt.year) * 12 + (end_dt.month - start_dt.month) + 1
        total_salary = float(salary_data['total_salary']) * months_diff if salary_data['total_salary'] else 0
        
        # 4. ดึงข้อมูลค่าวัตถุดิบจาก ingredient_stock (รวมค่าซื้อในช่วงวันที่)
        ingredients_query = """
            SELECT 
                COALESCE(SUM(cost_per_unit * quantity), 0) as ingredients_cost
            FROM ingredient_stock 
            WHERE restaurant_id = %s 
            AND DATE(created_at) BETWEEN %s AND %s
        """
        ingredients_data = execute_query(ingredients_query, (restaurant_id, start_date, end_date), fetch_one=True)
        
        # 5. รวมข้อมูลรายจ่ายทั้งหมด
        expense_breakdown = {
            'rent': 0,
            'utilities': 0, 
            'salary': total_salary,
            'ingredients': float(ingredients_data['ingredients_cost']) if ingredients_data['ingredients_cost'] else 0,
            'equipment': 0
        }
        
        # ใส่ข้อมูลจาก expenses table
        for expense in expenses_data:
            if expense['category'] in expense_breakdown:
                expense_breakdown[expense['category']] = float(expense['total_amount'])
        
        total_expenses = sum(expense_breakdown.values())
        total_revenue = float(revenue_data['total_revenue']) if revenue_data['total_revenue'] else 0
        
        # 6. คำนวณกำไรและอัตราส่วน
        net_profit = total_revenue - total_expenses
        profit_margin = (net_profit / total_revenue * 100) if total_revenue > 0 else 0
        expense_ratio = (total_expenses / total_revenue * 100) if total_revenue > 0 else 0
        ingredients_ratio = (expense_breakdown['ingredients'] / total_revenue * 100) if total_revenue > 0 else 0
        
        # 7. ส่งผลลัพธ์
        result = {
            "revenue": {
                "total_revenue": total_revenue,
                "total_orders": int(revenue_data['total_orders']) if revenue_data['total_orders'] else 0
            },
            "expenses": {
                "total_expenses": total_expenses,
                "breakdown": expense_breakdown
            },
            "profit": {
                "net_profit": net_profit,
                "profit_margin": profit_margin
            },
            "ratios": {
                "expense_ratio": expense_ratio,
                "ingredients_ratio": ingredients_ratio
            }
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to generate financial summary: {str(e)}"}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
@token_required
def delete_expense(current_user, expense_id):
    """ลบรายจ่าย"""
    restaurant_id = current_user["restaurant_id"]
    
    try:
        # ตรวจสอบว่ารายจ่ายเป็นของร้านนี้
        check_query = """
            SELECT id, category, amount, description 
            FROM expenses 
            WHERE id = %s AND restaurant_id = %s
        """
        expense = execute_query(check_query, (expense_id, restaurant_id), fetch_one=True)
        
        if not expense:
            return jsonify({"error": "Expense not found or unauthorized"}), 404
        
        # ลบรายจ่าย
        delete_query = "DELETE FROM expenses WHERE id = %s AND restaurant_id = %s"
        rows_affected = execute_query(delete_query, (expense_id, restaurant_id), commit=True)
        
        if rows_affected == 0:
            return jsonify({"error": "Failed to delete expense"}), 500
            
        return jsonify({
            "message": "Expense deleted successfully",
            "deleted_expense": {
                "id": expense_id,
                "category": expense['category'],
                "amount": float(expense['amount']),
                "description": expense['description']
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to delete expense: {str(e)}"}), 500
    
# ==================== HOME ROUTE ====================
@app.route('/', methods=['GET'])
def home():
    return "Food Shop Backend (Flask/Python) Running..."

if __name__ == '__main__':
    app.run(debug=True, port=5000)