//frontend\src\customer\App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import TableReservationPage from "./pages/TableReservationPage";
import OrderFoodPage from "./pages/OrderFoodPage";
import CartPage from "./pages/CartPage";
import AdminApp from "../admin/AdminApp";
import PaymentMethod from "./pages/PaymentMethod";
import PaymentSuccess from "./pages/PaymentSuccess";
import DashboardPage from "../admin/pages/DashboardPage";
import OrdersPage from "../admin/pages/OrdersPage";
import EmployeesPage from "../admin/pages/EmployeesPage";
import MenusPage from "../admin/pages/MenusPage";

// Define CartItem type here if needed
interface CartItem {
  menu_id: number;
  name: string;
  quantity: number;
  price_at_order: number;
  notes: string;
}

export default function App() {
  // สร้าง cart state ไว้ตรงนี้
  const [cart, setCart] = useState<CartItem[]>([]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<TableReservationPage />} />
        <Route
          path="/order/:table_number"
          element={<OrderFoodPage cart={cart} setCart={setCart} />}
        />
        <Route 
          path="/cart/:table_number"
          element={<CartPage cart={cart} setCart={setCart} />} />

        <Route path="/payment/:order_id" element={<PaymentMethod />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/admin" element={<AdminApp />} />
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/orders" element={<OrdersPage />} />
        <Route path="/admin/employees" element={<EmployeesPage />} />
        <Route path="/admin/menus" element={<MenusPage />} />
      </Routes>
    </Router>
  );
}
