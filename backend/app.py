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

# Add the directory of app.py to Python's search path.
sys.path.append(os.path.dirname(__file__))

# Load environment variables from the .env file.
load_dotenv()

# Initialize the Flask application.
app = Flask(__name__)
bcrypt = Bcrypt(app)

# --- กำหนด JWT_SECRET_KEY ให้ app.config ---
DEFAULT_JWT_SECRET = '9f4g2H6p!zQ@kR7v$tY8uW^eJ0iL*oM3A(sD5fG)hJ1kL2zX3c'
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', DEFAULT_JWT_SECRET)
if app.config['JWT_SECRET_KEY'] == DEFAULT_JWT_SECRET and os.getenv('JWT_SECRET_KEY') is None:
    print("Warning: JWT_SECRET_KEY is using the default value. Please set it in .env.")
# -------------------------------------------------------------

# Configure CORS (Cross-Origin Resource Sharing) for the Flask app.
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"]}}, supports_credentials=True)


def get_db_connection():
    """
    Establishes and returns a new database connection using mysql.connector.
    Note: Uses DB_PASS from .env file for password.
    """
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "food_shopdb"),
            port=int(os.getenv("DB_PORT", 3306)),
            charset='utf8mb4'
            
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Database connection error: {err}")
        raise

# ----------------------------------------------------------------------------------
# **ฟังก์ชันสำหรับสร้าง Token (สอดคล้องกับ token_required)**
# ----------------------------------------------------------------------------------
def create_token(identity, expires_delta=timedelta(hours=24)):
    """สร้าง JWT Token โดยใช้ PyJWT พร้อมกำหนดเวลาหมดอายุ 24 ชม."""
    payload = {
        # 'exp' (Expiration Time) ต้องมี
        # แก้ไข: ใช้ datetime.now(timezone.utc) แทน datetime.utcnow() เพื่อเลี่ยง DeprecationWarning
        'exp': datetime.now(timezone.utc) + expires_delta,
        # 'iat' (Issued At)
        'iat': datetime.now(timezone.utc),
        # ใส่ identity (user data) เป็น payload หลัก
        **identity 
    }
    return jwt.encode(
        payload,
        app.config['JWT_SECRET_KEY'],
        algorithm='HS256'
    )
    
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == "OPTIONS":  # allow preflight
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


# ----------------------------------------------------------------------------------
# **Authentication Routes**
# ----------------------------------------------------------------------------------

@app.route('/api/auth/register', methods=['POST'])
def register_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    role = 'admin'  # กำหนดตายตัวเป็น admin

    if not username or not password or not email:
        return jsonify({'message': 'Username, password, and email are required'}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    
    conn = get_db_connection()
    try:
        with conn.cursor(dictionary=True) as cursor:
            # check duplicate username
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                return jsonify({'message': 'Username already exists'}), 409

            # check duplicate email
            cursor.execute("SELECT id FROM restaurants WHERE email = %s", (email,))
            if cursor.fetchone():
                return jsonify({'message': 'Email already exists'}), 409

            # create restaurant
            cursor.execute(
                "INSERT INTO restaurants (name, address, phone_number, email) VALUES (%s, %s, %s, %s)",
                (f'ร้านค้าของ {username}', '', '', email)
            )
            cursor.execute("SELECT LAST_INSERT_ID() AS id")
            new_restaurant_id = cursor.fetchone()['id']

            # create user
            cursor.execute(
                "INSERT INTO users (username, password, role, restaurant_id) VALUES (%s, %s, %s, %s)",
                (username, hashed_password, role, new_restaurant_id)
            )
            conn.commit()

            response = {
                'message': 'Admin registered, restaurant created successfully',
                'username': username,
                'role': role,
                'restaurant_id': new_restaurant_id
            }

            return jsonify(response), 201
    except Exception as e:
        conn.rollback()
        print(f"Database error during registration: {e}")
        return jsonify({'message': f'Database error during registration: {str(e)}'}), 500
    finally:
        conn.close()


@app.route('/api/auth/login', methods=['POST'])
def login_user():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # --- ตรวจสอบว่าผู้ใช้เป็น customer หรือ admin ตาม pattern ---
    is_customer = username.endswith("User")
    login_username = username[:-4] if is_customer else username  # ตัดคำว่า 'User' ออกถ้าเป็น customer

    conn = get_db_connection()
    user = None
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
        # ✅ log ตรวจสอบ
        print(f"[LOGIN] username={username}, login_username={login_username}, is_customer={is_customer}")

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
            'is_customer': is_customer  # ส่งไป frontend เพื่อ redirect
        }), 200
    else:
        print(f"[LOGIN FAILED] username={username}")
        return jsonify({'message': 'Invalid username or password'}), 401



# ----------------------------------------------------------------------------------
# **Protected Route**
# ----------------------------------------------------------------------------------

@app.route('/api/admin/protected_data', methods=['GET'])
@token_required
def get_protected_data():
    """Route นี้เข้าถึงได้เฉพาะผู้ที่ Login และมี Token ที่ถูกต้องเท่านั้น"""
    # สามารถเข้าถึง identity ที่ถอดรหัสจาก token ได้ผ่าน request.user_identity
    identity = request.user_identity 
    
    return jsonify({
        'message': 'Access granted: Data from JWT Token payload.',
        'identity': identity,
        'user_id_from_token': identity['user_id'],
        'restaurant_id_from_token': identity['restaurant_id']
    }), 200

@app.route('/', methods=['GET'])
def home():
    """Home Route"""
    return "Food Shop Backend (Flask/Python) Running..."


# --- API Endpoint: Get All Menus ---
@app.route('/api/menus', methods=['GET'])
@token_required
def get_all_menus(current_user):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        restaurant_id = current_user["restaurant_id"]
        category = request.args.get("category")

        sql_query = """
            SELECT id, restaurant_id, name, description, base_price, category,
                   image_url, is_available, created_at, updated_at
            FROM menus
            WHERE restaurant_id = %s
        """
        params = [restaurant_id]

        if category and category != "All":
            sql_query += " AND category = %s"
            params.append(category)

        cursor.execute(sql_query, params)
        menus = cursor.fetchall()

        # Format
        formatted_menus = []
        for menu_item in menus:
            item = menu_item.copy()
            if "base_price" in item and item["base_price"] is not None:
                item["base_price"] = str(item["base_price"])
            if "created_at" in item and item["created_at"] is not None:
                item["created_at"] = item["created_at"].isoformat()
            if "updated_at" in item and item["updated_at"] is not None:
                item["updated_at"] = item["updated_at"].isoformat()
            formatted_menus.append(item)

        return jsonify(formatted_menus), 200
    except Exception as e:
        print(f"Error in /api/menus (GET all): {e}")
        return jsonify({"error": "Failed to fetch menus", "detail": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# --- Get Single Menu ---
@app.route('/api/menus/<int:menu_id>', methods=['GET'])
@token_required
def get_menu_by_id(current_user, menu_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        sql_query = """
            SELECT id, restaurant_id, name, description, base_price, category,
                   image_url, is_available, created_at, updated_at
            FROM menus
            WHERE id = %s AND restaurant_id = %s
        """
        cursor.execute(sql_query, (menu_id, current_user["restaurant_id"]))
        menu_item = cursor.fetchone()

        if not menu_item:
            return jsonify({"message": "Menu not found"}), 404

        item = menu_item.copy()
        if "base_price" in item and item["base_price"] is not None:
            item["base_price"] = str(item["base_price"])
        if "created_at" in item and item["created_at"] is not None:
            item["created_at"] = item["created_at"].isoformat()
        if "updated_at" in item and item["updated_at"] is not None:
            item["updated_at"] = item["updated_at"].isoformat()

        return jsonify(item), 200
    finally:
        cursor.close()
        conn.close()


# --- Create Menu ---
@app.route('/api/menus', methods=['POST'])
@token_required
def create_menu(current_user):
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    base_price = data.get('base_price')
    category = data.get('category')
    image_url = data.get('image_url')
    is_available = data.get('is_available', True)

    if not name or base_price is None or not category:
        return jsonify({"error": "Missing required menu data"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        current_time = datetime.now()

        sql = """
        INSERT INTO menus (restaurant_id, name, description, base_price, category,
                           image_url, is_available, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            current_user["restaurant_id"], name, description, base_price,
            category, image_url, is_available, current_time, current_time
        )
        cursor.execute(sql, params)
        conn.commit()
        return jsonify({"message": "Menu created successfully", "id": cursor.lastrowid}), 201
    finally:
        cursor.close()
        conn.close()


# --- Update Menu ---
@app.route('/api/menus/<int:menu_id>', methods=['PUT', 'PATCH'])
@token_required
def update_menu(current_user, menu_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        set_clauses, params = [], []

        for key, value in data.items():
            if key in ['name', 'description', 'category', 'image_url']:
                set_clauses.append(f"{key} = %s")
                params.append(value)
            elif key == 'base_price':
                set_clauses.append(f"{key} = %s")
                params.append(float(value))
            elif key == 'is_available':
                set_clauses.append(f"{key} = %s")
                params.append(bool(value))

        set_clauses.append("updated_at = %s")
        params.append(datetime.now())
        params.extend([menu_id, current_user["restaurant_id"]])

        sql = f"""
        UPDATE menus
        SET {', '.join(set_clauses)}
        WHERE id = %s AND restaurant_id = %s
        """
        cursor.execute(sql, params)
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Menu not found or no changes"}), 404
        return jsonify({"message": "Menu updated successfully"}), 200
    finally:
        cursor.close()
        conn.close()


# --- Delete Menu ---
@app.route('/api/menus/<int:menu_id>', methods=['DELETE'])
@token_required
def delete_menu(current_user, menu_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        sql = "DELETE FROM menus WHERE id = %s AND restaurant_id = %s"
        cursor.execute(sql, (menu_id, current_user["restaurant_id"]))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Menu not found"}), 404
        return jsonify({"message": "Menu deleted successfully"}), 200
    finally:
        cursor.close()
        conn.close()


@app.route('/api/orders', methods=['GET'])
@token_required
def get_all_orders(current_user):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        restaurant_id = current_user["restaurant_id"]

        sql_orders = """
            SELECT id, restaurant_id, table_number, total_amount, status, payment_status, order_time, updated_at, qr_code_url
            FROM orders
            WHERE restaurant_id = %s
            ORDER BY order_time DESC
        """
        cursor.execute(sql_orders, (restaurant_id,))
        orders = cursor.fetchall()

        formatted_orders = []
        for order in orders:
            sql_items = """
                SELECT oi.id, oi.menu_id, oi.quantity, oi.price_at_order, oi.notes, oi.created_at, oi.updated_at,
                       m.name AS menu_name, m.image_url AS menu_image
                FROM order_items AS oi
                JOIN menus AS m ON oi.menu_id = m.id
                WHERE oi.order_id = %s
            """
            cursor.execute(sql_items, (order['id'],))
            items = cursor.fetchall()

            formatted_items = []
            for item in items:
                item_copy = item.copy()
                if item_copy.get('price_at_order') is not None:
                    item_copy['price_at_order'] = str(item_copy['price_at_order'])
                if item_copy.get('created_at'):
                    item_copy['created_at'] = item_copy['created_at'].isoformat()
                if item_copy.get('updated_at'):
                    item_copy['updated_at'] = item_copy['updated_at'].isoformat()
                formatted_items.append(item_copy)

            order['items'] = formatted_items
            if order.get('total_amount') is not None:
                order['total_amount'] = str(order['total_amount'])
            if order.get('order_time'):
                order['order_time'] = order['order_time'].isoformat()
            if order.get('updated_at'):
                order['updated_at'] = order['updated_at'].isoformat()

            formatted_orders.append(order)

        return jsonify(formatted_orders), 200
    except Exception as e:
        print(f"Error in /api/orders (GET all): {e}")
        return jsonify({"error": "Failed to fetch orders", "detail": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# --- API Endpoint: Get Order by ID ---
@app.route('/api/orders/<int:order_id>', methods=['GET'])
@token_required
def get_order_by_id(current_user, order_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        restaurant_id = current_user['restaurant_id']

        sql_order = """
            SELECT id, restaurant_id, table_number, total_amount, status, payment_status, order_time, updated_at, qr_code_url
            FROM orders
            WHERE id = %s AND restaurant_id = %s
        """
        cursor.execute(sql_order, (order_id, restaurant_id))
        order = cursor.fetchone()
        if not order:
            return jsonify({"message": "Order not found"}), 404

        sql_items = """
            SELECT oi.id, oi.menu_id, oi.quantity, oi.price_at_order, oi.notes, oi.created_at, oi.updated_at,
                   m.name AS menu_name, m.image_url AS menu_image
            FROM order_items AS oi
            JOIN menus AS m ON oi.menu_id = m.id
            WHERE oi.order_id = %s
        """
        cursor.execute(sql_items, (order_id,))
        items = cursor.fetchall()

        formatted_items = []
        for item in items:
            item_copy = item.copy()
            if item_copy.get('price_at_order') is not None:
                item_copy['price_at_order'] = str(item_copy['price_at_order'])
            if item_copy.get('created_at'):
                item_copy['created_at'] = item_copy['created_at'].isoformat()
            if item_copy.get('updated_at'):
                item_copy['updated_at'] = item_copy['updated_at'].isoformat()
            formatted_items.append(item_copy)

        order['items'] = formatted_items
        if order.get('total_amount') is not None:
            order['total_amount'] = str(order['total_amount'])
        if order.get('order_time'):
            order['order_time'] = order['order_time'].isoformat()
        if order.get('updated_at'):
            order['updated_at'] = order['updated_at'].isoformat()

        return jsonify(order), 200
    except Exception as e:
        print(f"Error in /api/orders/{order_id} (GET): {e}")
        return jsonify({"error": "Failed to fetch order", "detail": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# --- API Endpoint: Create a New Order ---
@app.route('/api/orders', methods=['POST'])
@token_required
def create_order(current_user):
    data = request.get_json()
    restaurant_id = current_user["restaurant_id"]
    table_number = data.get('table_number')
    total_amount = data.get('total_amount')
    status = data.get('status')
    payment_status = data.get('payment_status')
    qr_code_url = data.get('qr_code_url', None)
    items = data.get('items', [])

    if table_number is None or total_amount is None or not status or not payment_status:
        return jsonify({"error": "Missing required order data"}), 400
    if not isinstance(items, list):
        return jsonify({"error": "Items must be a list"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        conn.autocommit = False
        cursor = conn.cursor()
        current_time = datetime.now()

        sql_order = """
            INSERT INTO orders (restaurant_id, table_number, total_amount, status, payment_status, order_time, qr_code_url, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        params_order = (restaurant_id, table_number, total_amount, status, payment_status, current_time, qr_code_url, current_time)
        cursor.execute(sql_order, params_order)
        new_order_id = cursor.lastrowid

        if items:
            sql_order_item = """
                INSERT INTO order_items (order_id, menu_id, quantity, price_at_order, notes, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            for item in items:
                menu_id = item.get('menu_id')
                quantity = item.get('quantity')
                price_at_order = item.get('price_at_order')
                notes = item.get('notes', None)
                if menu_id is None or quantity is None or price_at_order is None:
                    raise ValueError(f"Missing required data for an order item: {item}")
                cursor.execute(sql_order_item, (new_order_id, menu_id, quantity, price_at_order, notes, current_time, current_time))

        conn.commit()
        return jsonify({"message": "Order and items created successfully", "order_id": new_order_id}), 201
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


# --- API Endpoint: Update Order ---
@app.route('/api/orders/<int:order_id>', methods=['PUT', 'PATCH'])
@token_required
def update_order(current_user, order_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)  # เปลี่ยนเป็น dictionary=True
        restaurant_id = current_user["restaurant_id"]

        # ตรวจสอบว่า order เป็นของร้านนี้ และ FETCH ผลลัพธ์
        cursor.execute("SELECT id FROM orders WHERE id=%s AND restaurant_id=%s", (order_id, restaurant_id))
        existing_order = cursor.fetchone()  # เพิ่มบรรทัดนี้
        if not existing_order:  # เปลี่ยนจาก cursor.rowcount
            return jsonify({"error": "Order not found or unauthorized"}), 404

        set_clauses = []
        params = []
        current_time = datetime.now()

        for key, value in data.items():
            if key in ['status', 'payment_status']:
                set_clauses.append(f"{key}=%s")
                params.append(value)
            elif key == 'total_amount':
                set_clauses.append(f"{key}=%s")
                params.append(float(value))
            elif key == 'table_number':
                set_clauses.append(f"{key}=%s")
                params.append(int(value))
            elif key == 'qr_code_url':
                set_clauses.append(f"{key}=%s")
                params.append(value)

        if not set_clauses:  # ย้ายขึ้นมาก่อน update
            return jsonify({"message": "No valid fields provided for update"}), 200

        set_clauses.append("updated_at=%s")
        params.append(current_time)
        params.extend([order_id, restaurant_id])

        sql = f"UPDATE orders SET {', '.join(set_clauses)} WHERE id=%s AND restaurant_id=%s"
        cursor.execute(sql, params)
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "No changes made"}), 404
        return jsonify({"message": "Order updated successfully"}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": "Failed to update order", "detail": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# --- API Endpoint: Delete Order ---
@app.route('/api/orders/<int:order_id>', methods=['DELETE'])
@token_required
def delete_order(current_user, order_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        restaurant_id = current_user["restaurant_id"]

        sql = "DELETE FROM orders WHERE id=%s AND restaurant_id=%s"
        cursor.execute(sql, (order_id, restaurant_id))
        conn.commit()

        if cursor.rowcount == 0:
            return jsonify({"message": "Order not found"}), 404
        return jsonify({"message": "Order deleted successfully"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"error": "Failed to delete order", "detail": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# --- API Endpoint: Get Order Items by Order ID ---
@app.route('/api/orders/<int:order_id>/items', methods=['GET'])
@token_required
def get_order_items_by_order_id(current_user, order_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        restaurant_id = current_user["restaurant_id"]

        # ตรวจสอบ order เป็นของร้านนี้
        cursor.execute("SELECT id FROM orders WHERE id=%s AND restaurant_id=%s", (order_id, restaurant_id))
        if cursor.rowcount == 0:
            return jsonify({"error": "Order not found or unauthorized"}), 404

        sql_query = "SELECT id, order_id, menu_id, quantity, price_at_order, notes, created_at, updated_at FROM order_items WHERE order_id=%s"
        cursor.execute(sql_query, (order_id,))
        items = cursor.fetchall()

        formatted_items = []
        for item in items:
            item_copy = item.copy()
            if item_copy.get('price_at_order') is not None:
                item_copy['price_at_order'] = str(item_copy['price_at_order'])
            if item_copy.get('created_at'):
                item_copy['created_at'] = item_copy['created_at'].isoformat()
            if item_copy.get('updated_at'):
                item_copy['updated_at'] = item_copy['updated_at'].isoformat()
            formatted_items.append(item_copy)

        return jsonify({"items": formatted_items}), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch order items", "detail": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# --- API Endpoint: Get All Employees ของร้านผู้ใช้งาน ---
@app.route('/api/employees', methods=['GET'])
@token_required
def get_all_employees(current_user):
    """
    Fetches employees for the logged-in user's restaurant only.
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        restaurant_id = current_user["restaurant_id"]

        sql_query = """
        SELECT id, full_name, position, phone_number, salary, hire_date, created_at, updated_at, restaurant_id
        FROM employees
        WHERE restaurant_id = %s
        """
        cursor.execute(sql_query, (restaurant_id,))
        employees = cursor.fetchall()

        formatted_employees = []
        for item in employees:
            emp = item.copy()
            if 'salary' in emp and emp['salary'] is not None:
                emp['salary'] = str(emp['salary'])
            if 'hire_date' in emp and emp['hire_date'] is not None:
                emp['hire_date'] = emp['hire_date'].isoformat()
            if 'created_at' in emp and emp['created_at'] is not None:
                emp['created_at'] = emp['created_at'].isoformat()
            if 'updated_at' in emp and emp['updated_at'] is not None:
                emp['updated_at'] = emp['updated_at'].isoformat()
            formatted_employees.append(emp)

        return jsonify(formatted_employees), 200
    except Exception as e:
        print(f"Error in /api/employees (GET all): {e}")
        return jsonify({"error": "Failed to fetch employees", "detail": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# --- NEW: API Endpoint: Create Employee ---
@app.route('/api/employees', methods=['POST'])
@token_required
def create_employee(current_user):
    """
    Creates a new employee in the logged-in user's restaurant.
    Expects JSON with 'full_name', 'position', 'phone_number', 'salary', 'hire_date'.
    """
    data = request.get_json()
    full_name = data.get('full_name')
    position = data.get('position')
    phone_number = data.get('phone_number')
    salary = data.get('salary')
    hire_date_str = data.get('hire_date')

    if not full_name or not position or salary is None or not hire_date_str:
        return jsonify({"error": "Missing required employee data: full_name, position, salary, hire_date"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        current_time = datetime.now()
        hire_date = datetime.strptime(hire_date_str, '%Y-%m-%d').date()

        sql = """
        INSERT INTO employees (restaurant_id, full_name, position, phone_number, salary, hire_date, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            current_user["restaurant_id"], full_name, position, phone_number, salary, hire_date,
            current_time, current_time
        )
        cursor.execute(sql, params)
        conn.commit()
        new_employee_id = cursor.lastrowid
        return jsonify({"message": "Employee created successfully", "id": new_employee_id}), 201
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error in /api/employees (POST): {e}")
        return jsonify({"error": "Failed to create employee", "detail": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# --- NEW: API Endpoint: Update Employee ---
@app.route('/api/employees/<int:employee_id>', methods=['PUT', 'PATCH'])
@token_required
def update_employee(current_user, employee_id):
    """
    Updates an existing employee in the logged-in user's restaurant.
    Expects JSON with fields to update.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided for update"}), 400

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # ตรวจสอบว่าพนักงานอยู่ในร้านเดียวกันกับผู้ใช้งาน
        cursor.execute("SELECT restaurant_id FROM employees WHERE id = %s", (employee_id,))
        emp = cursor.fetchone()
        if not emp:
            return jsonify({"message": "Employee not found"}), 404
        if emp['restaurant_id'] != current_user['restaurant_id']:
            return jsonify({"error": "Unauthorized: cannot modify employee of another restaurant"}), 403

        # Build update query
        set_clauses = []
        params = []
        current_time = datetime.now()
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

        set_clauses.append("updated_at = %s")
        params.append(current_time)

        if not set_clauses:
            return jsonify({"message": "No valid fields provided for update"}), 200

        sql = f"UPDATE employees SET {', '.join(set_clauses)} WHERE id = %s"
        params.append(employee_id)
        cursor.execute(sql, params)
        conn.commit()

        return jsonify({"message": "Employee updated successfully"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error in /api/employees/{employee_id} (PUT/PATCH): {e}")
        return jsonify({"error": "Failed to update employee", "detail": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# --- NEW: API Endpoint: Delete Employee ---
@app.route('/api/employees/<int:employee_id>', methods=['DELETE'])
@token_required
def delete_employee(current_user, employee_id):
    """
    Deletes an employee from the logged-in user's restaurant.
    """
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # ตรวจสอบว่าพนักงานอยู่ในร้านเดียวกัน
        cursor.execute("SELECT restaurant_id FROM employees WHERE id = %s", (employee_id,))
        emp = cursor.fetchone()
        if not emp:
            return jsonify({"message": "Employee not found"}), 404
        if emp['restaurant_id'] != current_user['restaurant_id']:
            return jsonify({"error": "Unauthorized: cannot delete employee of another restaurant"}), 403

        cursor.execute("DELETE FROM employees WHERE id = %s", (employee_id,))
        conn.commit()
        return jsonify({"message": "Employee deleted successfully"}), 200
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error in /api/employees/{employee_id} (DELETE): {e}")
        return jsonify({"error": "Failed to delete employee", "detail": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# --- NEW: API Endpoint: Admin Dashboard ---
@app.route('/api/admin/dashboard', methods=['GET'])
@token_required
def get_dashboard(current_user):
    """
    Fetches all dashboard data (total sales, top products, sales by category) 
    for the logged-in user's restaurant.
    """
    conn = None
    cursor = None
    try:
        # --- Get restaurant_id from current_user ---
        restaurant_id = current_user.get('restaurant_id')
        if not restaurant_id:
            return jsonify({"error": "No restaurant_id found for user"}), 401

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # --- Optional: filter by month ---
        month_str = request.args.get('month')  # 'YYYY-MM'
        month_filter = ""
        params = [restaurant_id]

        if month_str:
            month_filter = " AND DATE_FORMAT(o.created_at, '%Y-%m') = %s"
            params.append(month_str)

        # 1. Total Sales
        sql_total_sales = f"""
            SELECT SUM(total_amount) AS total_sales
            FROM orders o
            WHERE o.restaurant_id = %s
              AND o.payment_status = 'paid'
              {month_filter}
        """
        cursor.execute(sql_total_sales, params)
        total_sales_result = cursor.fetchone()
        total_sales = float(total_sales_result['total_sales']) if total_sales_result and total_sales_result['total_sales'] is not None else 0.0

        # 2. Top 5 Selling Products
        sql_top_items = f"""
            SELECT
                m.name,
                SUM(oi.quantity) AS total_quantity,
                SUM(oi.quantity * oi.price_at_order) AS total_amount
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN menus m ON oi.menu_id = m.id
            WHERE o.restaurant_id = %s
              AND o.payment_status = 'paid'
              {month_filter}
            GROUP BY m.name
            ORDER BY total_quantity DESC
            LIMIT 5
        """
        cursor.execute(sql_top_items, params)
        top_items = cursor.fetchall()

        # 3. Sales by Category
        sql_category_sales = f"""
            SELECT m.category, SUM(oi.quantity * oi.price_at_order) AS total_amount
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            JOIN menus m ON oi.menu_id = m.id
            WHERE o.restaurant_id = %s
              AND o.payment_status = 'paid'
              {month_filter}
            GROUP BY m.category
            ORDER BY total_amount DESC
        """
        cursor.execute(sql_category_sales, params)
        category_sales = cursor.fetchall()

        # Convert Decimal to float
        for item in top_items:
            item['total_amount'] = float(item['total_amount'])
        for item in category_sales:
            item['total_amount'] = float(item['total_amount'])

        return jsonify({
            "total_sales": total_sales,
            "top_items": top_items,
            "category_sales": category_sales
        }), 200

    except Exception as e:
        print(f"Error in /api/admin/dashboard: {e}")
        return jsonify({"error": "Failed to fetch dashboard data", "detail": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()



if __name__ == '__main__':
    # Running the app in debug mode makes it restart automatically on code changes
    # and provides a more detailed error page.
    app.run(debug=True, port=5000)
