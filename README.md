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
- **🪑 Table Management** - จัดการโต๊ะ (สถานะ, จำนวนที่นั่ง, การจัดการแบบเร็ว)
- **👥 Employee Management** - จัดการข้อมูลพนักงาน
- **🔐 Authentication** - ระบบเข้าสู่ระบบที่ปลอดภัย

### 📱 Customer App

- **🍽️ Food Ordering** - เลือกและสั่งอาหารจากเมนู
- **🛒 Shopping Cart** - จัดการรายการที่สั่ง
- **💳 Payment Options** - เลือกวิธีการชำระเงิน
- **🪑 Table Selection** - เลือกโต๊ะสำหรับนั่งรับประทาน

## 🛠️ เทคโนโลยีที่ใช้

### Frontend

- **React 18** - UI Library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **React Router** - Client-side routing
- **Zustand** - State management

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
│   ├── package.json        # Node.js dependencies (if any)
│   └── venv_backend/       # Python virtual environment
│
├── frontend/               # React Application
│   ├── src/
│   │   ├── admin/         # Admin panel components
│   │   │   └── pages/     # Admin pages
│   │   ├── customer/      # Customer app components
│   │   ├── components/    # Shared React components
│   │   ├── store/         # State management (Zustand)
│   │   ├── utils/         # Utility functions
│   │   ├── assets/        # Static assets
│   │   ├── main.tsx       # Entry point
│   │   ├── index.tsx      # App initialization
│   │   └── index.css      # Global styles
│   ├── package.json       # Node dependencies
│   ├── vite.config.ts     # Vite configuration
│   ├── tsconfig.json      # TypeScript configuration
│   └── eslint.config.js   # ESLint configuration
│
├── .vscode/               # VSCode settings
│   └── settings.json      # Editor configuration
│
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
├── package.json          # Root package.json
└── README.md             # Project documentation
```

## 🚀 การติดตั้งและใช้งาน

### ข้อกำหนดระบบ

- **Node.js** 18+ และ npm
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

-- Import schema (ถ้ามีไฟล์ schema.sql)
-- source database/schema.sql;
```

### 3. ตั้งค่า Backend

```bash
# เข้าไปยังโฟลเดอร์ backend
cd backend

# สร้าง virtual environment (ถ้ายังไม่มี)
python -m venv venv_backend

# เปิดใช้งาน virtual environment (Windows)
venv_backend\Scripts\activate

# ติดตั้ง dependencies
pip install -r requirements.txt

# สร้างไฟล์ .env ในโฟลเดอร์ root
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
venv_backend\Scripts\activate
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

สร้างไฟล์ `.env` ในโฟลเดอร์ root:

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

# API Configuration
VITE_API_URL=http://localhost:5000/api
```

## 📊 Database Schema

### ตารางหลัก

- **users** - ข้อมูลผู้ใช้งานและการเข้าสู่ระบบ
- **menu_items** - รายการเมนูอาหาร
- **orders** - คำสั่งซื้อ
- **order_items** - รายการสินค้าในแต่ละออเดอร์
- **tables** - ข้อมูลโต๊ะ (table_number, capacity, status)
- **restaurants** - ข้อมูลร้านอาหาร

### โครงสร้างตาราง Tables

```sql
CREATE TABLE tables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    table_number INT NOT NULL UNIQUE,
    capacity INT NOT NULL,
    status ENUM('free', 'occupied') DEFAULT 'free',
    restaurant_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🔐 ระบบความปลอดภัย

- **JWT Authentication** - ยืนยันตัวตนด้วย JSON Web Token
- **Password Hashing** - เข้ารหัสรหัสผ่านด้วย bcrypt
- **CORS Protection** - ป้องกันการเข้าถึงจากโดเมนอื่น
- **Input Validation** - ตรวจสอบข้อมูลป้อนเข้า
- **Role-based Access** - การควบคุมการเข้าถึงตามบทบาท

## 📝 API Endpoints

### Authentication

- `POST /api/login` - เข้าสู่ระบบ
- `POST /api/register` - ลงทะเบียน
- `POST /api/logout` - ออกจากระบบ

### Menu Management

- `GET /api/menu` - ดูรายการเมนู
- `POST /api/menu` - เพิ่มเมนูใหม่
- `PUT /api/menu/<id>` - แก้ไขเมนู
- `DELETE /api/menu/<id>` - ลบเมนู

### Order Management

- `GET /api/orders` - ดูรายการออเดอร์
- `POST /api/orders` - สร้างออเดอร์ใหม่
- `PUT /api/orders/<id>` - อัพเดทสถานะออเดอร์
- `DELETE /api/orders/<id>` - ยกเลิกออเดอร์

### Table Management

- `GET /api/tables` - ดูรายการโต๊ะทั้งหมด
- `POST /api/tables` - เพิ่มโต๊ะใหม่
- `PUT /api/tables/<id>` - แก้ไขข้อมูลโต๊ะ
- `PUT /api/tables/<id>/status` - อัพเดทสถานะโต๊ะ
- `DELETE /api/tables/<id>` - ลบโต๊ะ

## 🎨 UI/UX Features

### Admin Panel

- **Responsive Design** - รองรับทุกขนาดหน้าจอ
- **Real-time Updates** - อัพเดทข้อมูลแบบเรียลไทม์
- **Interactive Dashboard** - กราฟและสถิติแบบ Interactive
- **Thai Language Support** - รองรับภาษาไทยเต็มรูปแบบ
- **Snackbar Notifications** - แจ้งเตือนสถานะการทำงาน
- **Loading States** - แสดงสถานะการโหลดข้อมูล

### Table Management Features

- **Quick Actions** - ปล่อย/ปิดโต๊ะทั้งหมดพร้อมกัน
- **Real-time Status** - สถานะโต๊ะแบบเรียลไทม์
- **Inline Editing** - แก้ไขข้อมูลโต๊ะได้ทันที
- **Statistics Dashboard** - สถิติการใช้งานโต๊ะ
- **Validation** - ตรวจสอบข้อมูลก่อนบันทึก

## 🚀 การ Deploy

### Development

```bash
# รัน Backend และ Frontend พร้อมกัน
npm run dev        # ในโฟลเดอร์ root (ถ้ามี script)
```

### Production

```bash
# Build Frontend
cd frontend
npm run build

# Deploy ตาม environment ที่ต้องการ
```
