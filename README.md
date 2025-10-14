# รายวิชาปัญหาพิเศษ

# Restaurant Management System 🍽️

ระบบจัดการร้านอาหารแบบครบวงจร พัฒนาสำหรับรายวิชาปัญหาพิเศษ

## 📋 ภาพรวมโปรเจค

ระบบนี้เป็น Full-Stack Web Application ที่ออกแบบมาเพื่อแก้ปัญหาการจัดการร้านอาหารในยุคดิจิทัล โดยแบ่งออกเป็น 2 ส่วนหลัก:

- **👨‍💼 Admin Panel** - สำหรับเจ้าของร้านและพนักงาน
- **👥 Customer App** - สำหรับลูกค้าสั่งอาหาร

## ✨ ฟีเจอร์หลัก

### 🔧 Admin Panel

- **📊 Dashboard** - สถิติยอดขาย, จำนวนออเดอร์, กราฟแนวโน้ม
- **🍕 Menu Management** - จัดการเมนูอาหาร (เพิ่ม/แก้ไข/ลบ)
- **📝 Order Management** - ติดตามและอัพเดทสถานะออเดอร์
- **👥 Employee Management** - จัดการข้อมูลพนักงาน
- **🔐 Authentication** - ระบบเข้าสู่ระบบที่ปลอดภัย

### 📱 Customer App

- **🍽️ Food Ordering** - เลือกและสั่งอาหารจากเมนู
- **🛒 Shopping Cart** - จัดการรายการที่สั่ง
- **💳 Payment Options** - เลือกวิธีการชำระเงิน

## 🛠️ เทคโนโลยีที่ใช้

### Frontend

- **React 18** - UI Library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Icon library

### Backend

- **Flask** - Python web framework
- **mysql-connector-python** - MySQL database connector
- **JWT** - JSON Web Token authentication
- **bcrypt** - Password hashing
- **Flask-CORS** - Cross-origin resource sharing

### Database

- **MySQL** - Relational database management system

### Development Tools

- **VSCode** - Code editor
- **Git** - Version control
- **npm** - Package manager
- **pip** - Python package installer

## 📁 โครงสร้างโปรเจค

```
SP-restaurant/
├── backend/                 # Flask API Server
│   ├── app.py              # Main application file
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables (ต้องสร้าง)
│
├── frontend/               # React Application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.tsx        # Main app component
│   │   ├── main.tsx       # Entry point
│   │   └── index.css      # Styles
│   ├── package.json       # Node dependencies
│   └── vite.config.ts     # Vite configuration
│
├── database/               # Database scripts
│   └── schema.sql         # Database schema
│
└── README.md              # Project documentation
```

## 🚀 การติดตั้งและใช้งาน

### ข้อกำหนดระบบ

- **Node.js** 16+ และ npm
- **Python** 3.8+
- **MySQL** 8.0+
- **Git**

### 1. Clone Repository

```bash
git clone <repository-url>
cd SP-restaurant
```

### 2. ตั้งค่า Database

```sql
-- สร้างฐานข้อมูล
CREATE DATABASE restaurant_db;
USE restaurant_db;

-- Import schema
source database/schema.sql;
```

### 3. ตั้งค่า Backend

```bash
# เข้าไปยังโฟลเดอร์ backend
cd backend

# สร้าง virtual environment
python -m venv venv

# เปิดใช้งาน virtual environment (Windows)
venv\Scripts\activate

# ติดตั้ง dependencies
pip install -r requirements.txt

# สร้างไฟล์ .env
# (ดูตัวอย่างด้านล่าง)
```

### 4. ตั้งค่า Frontend

```bash
# เข้าไปยังโฟลเดอร์ frontend
cd frontend

# ติดตั้ง dependencies
npm install
```

### 5. รันโปรแกรม

**Backend (Terminal 1):**

```bash
cd backend
# เปิดใช้งาน virtual environment
venv\Scripts\activate
python app.py
# Server จะรันที่ http://127.0.0.1:5000
```

**Frontend (Terminal 2):**

```bash
cd frontend
npm run dev
# Application จะรันที่ http://localhost:5173
```

## 🔧 การตั้งค่า Environment Variables

สร้างไฟล์ `.env` ในโฟลเดอร์ `backend/`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=restaurant_db

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-here

# Flask Configuration
FLASK_ENV=development
FLASK_DEBUG=True
```

## 📊 Database Schema

### ตารางหลัก

- **users** - ข้อมูลผู้ใช้งานและการเข้าสู่ระบบ
- **menu_items** - รายการเมนูอาหาร
- **orders** - คำสั่งซื้อ
- **order_items** - รายการสินค้าในแต่ละออเดอร์
- **tables** - ข้อมูลโต๊ะ

## 🔐 ระบบความปลอดภัย

- **JWT Authentication** - ยืนยันตัวตนด้วย JSON Web Token
- **Password Hashing** - เข้ารหัสรหัสผ่านด้วย bcrypt
- **CORS Protection** - ป้องกันการเข้าถึงจากโดเมนอื่น
- **Input Validation** - ตรวจสอบข้อมูลป้อนเข้า

## 📝 API Endpoints

### Authentication

- `POST /login` - เข้าสู่ระบบ
- `POST /register` - ลงทะเบียน

### Menu Management

- `GET /menu` - ดูรายการเมนู
- `POST /menu` - เพิ่มเมนูใหม่
- `PUT /menu/<id>` - แก้ไขเมนู
- `DELETE /menu/<id>` - ลบเมนู

### Order Management

- `GET /orders` - ดูรายการออเดอร์
- `POST /orders` - สร้างออเดอร์ใหม่
- `PUT /orders/<id>` - อัพเดทสถานะออเดอร์
