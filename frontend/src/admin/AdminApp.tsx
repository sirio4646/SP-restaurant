'use client';
import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

// Customer Pages
import TableReservationPage from "../customer/pages/TableReservationPage";
import OrderFoodPage from "../customer/pages/OrderFoodPage";
import CartPage from "../customer/pages/CartPage";
import PaymentMethod from "../customer/pages/PaymentMethod";
import PaymentSuccess from "../customer/pages/PaymentSuccess";

// Admin Pages
import DashboardPage from "../admin/pages/DashboardPage";
import OrdersPage from "../admin/pages/OrdersPage";
import EmployeesPage from "../admin/pages/EmployeesPage";
import MenusPage from "../admin/pages/MenusPage";
import LoginPage from "../admin/pages/login/Login";
import RegisterPage from "../admin/pages/login/Register";

import { useAuthStore } from "../store/authStore";

interface CartItem {
  menu_id: number;
  name: string;
  quantity: number;
  price_at_order: number;
  notes: string;
}

/* ─────────────────────────────
   ✅ Sidebar Component (Admin)
────────────────────────────── */
function Sidebar() {
  const location = useLocation();

  const links = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Orders", path: "/admin/orders" },
    { name: "Employees", path: "/admin/employees" },
    { name: "Menus", path: "/admin/menus" },
  ];

  return (
    <aside className="w-64 bg-[#0B192C] text-gray-100 min-h-screen p-6 shadow-lg">
      <h2 className="text-2xl font-extrabold mb-8 text-center text-[#FF6500] tracking-wide">
        Admin Panel
      </h2>

      <nav className="flex flex-col gap-2">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <a
              key={link.path}
              href={link.path}
              className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                isActive
                  ? "bg-[#FF6500] text-white shadow-md"
                  : "text-gray-300 hover:bg-gray-800 hover:text-[#FF6500]"
              }`}
            >
              {link.name}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

/* ─────────────────────────────
   ✅ Main App Component
────────────────────────────── */
export default function App() {
  const [initialized, setInitialized] = useState(false);
  const token = useAuthStore((state) => state.token);
  const username = useAuthStore((state) => state.username);
  const setAuth = useAuthStore((state) => state.setAuth);

  const [cart, setCart] = useState<CartItem[]>([]);

  const isLoggedIn = !!token;
  const isCustomer = username?.endsWith("User");

  useEffect(() => {
    const localToken = localStorage.getItem("jwtToken");
    const localUsername = localStorage.getItem("username");

    if (localToken) {
      setAuth(localToken, localUsername || "", "");
    }

    setInitialized(true);
  }, [setAuth]);

  if (!initialized) return <div>Loading...</div>;

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-100">
        {/* 🧭 Sidebar เฉพาะ Admin */}
        {!isCustomer && isLoggedIn && <Sidebar />}

        <main className="flex-1 overflow-y-auto">
          <Routes>
            {/* 🔐 Login / Register */}
            <Route
              path="/login"
              element={
                isLoggedIn ? (
                  <Navigate
                    to={isCustomer ? "/" : "/admin/dashboard"}
                    replace
                  />
                ) : (
                  <LoginPage />
                )
              }
            />
            <Route
              path="/register"
              element={
                isLoggedIn ? (
                  <Navigate
                    to={isCustomer ? "/" : "/admin/dashboard"}
                    replace
                  />
                ) : (
                  <RegisterPage />
                )
              }
            />

            {/* 👨‍🍳 Customer Routes */}
            {isCustomer && isLoggedIn && (
              <>
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
              </>
            )}

            {/* 🧰 Admin Routes */}
            {!isCustomer && isLoggedIn && (
              <>
                <Route path="/admin/dashboard" element={<DashboardPage />} />
                <Route path="/admin/orders" element={<OrdersPage />} />
                <Route path="/admin/employees" element={<EmployeesPage />} />
                <Route path="/admin/menus" element={<MenusPage />} />
              </>
            )}

            {/* 🚧 Fallback */}
            <Route
              path="*"
              element={
                <Navigate
                  to={
                    isLoggedIn
                      ? isCustomer
                        ? "/"
                        : "/admin/dashboard"
                      : "/login"
                  }
                  replace
                />
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
