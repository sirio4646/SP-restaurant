import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuthStore } from "../store/authStore";

// Customer Pages
import TableReservationPage from "./pages/TableReservationPage";
import OrderFoodPage from "./pages/OrderFoodPage";
import CartPage from "./pages/CartPage";
import PaymentMethod from "./pages/PaymentMethod";
import PaymentSuccess from "./pages/PaymentSuccess";

// Admin Pages
import AdminApp from "../admin/AdminApp";
import DashboardPage from "../admin/pages/DashboardPage";
import OrdersPage from "../admin/pages/OrdersPage";
import EmployeesPage from "../admin/pages/EmployeesPage";
import MenusPage from "../admin/pages/MenusPage";

interface CartItem {
  menu_id: number;
  name: string;
  quantity: number;
  price_at_order: number;
  notes: string;
}

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const logout = useAuthStore((state) => state.logout);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    checkAuth();

    const handleStorageChange = () => {
      const isCustomer = sessionStorage.getItem("is_customer");
      const token = sessionStorage.getItem("jwtToken");

      if (isCustomer && !token) {
        logout();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [checkAuth, logout]);

  return (
    <Router>
      <Routes>
        {/* Customer Routes */}
        <Route path="/" element={<TableReservationPage />} />
        <Route
          path="/order/:table_number"
          element={<OrderFoodPage cart={cart} setCart={setCart} />}
        />
        <Route
          path="/cart/:table_number"
          element={<CartPage cart={cart} setCart={setCart} />}
        />
        <Route path="/payment/:order_id" element={<PaymentMethod />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminApp />} />
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/orders" element={<OrdersPage />} />
        <Route path="/admin/employees" element={<EmployeesPage />} />
        <Route path="/admin/menus" element={<MenusPage />} />
      </Routes>
    </Router>
  );
}
