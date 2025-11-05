"use client";
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
import AdminTableManagePage from "../admin/pages/AdminTableManagePage";
import LoginPage from "../admin/pages/login/Login";
import RegisterPage from "../admin/pages/login/Register";
import StockManagementPage from "../admin/pages/StockManagementPage";
import ExpenseManagementPage from "../admin/pages/ExpenseManagementPage";

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
  const logout = useAuthStore((state) => state.logout);

  const links = [
    { name: "Dashboard", path: "/admin/dashboard" },
    { name: "Orders", path: "/admin/orders" },
    { name: "Employees", path: "/admin/employees" },
    { name: "Menus", path: "/admin/menus" },
    { name: "Tables", path: "/admin/tables" },
    { name: "Stocks", path: "/admin/stock" },
    { name: "Expenses", path: "/admin/expenses" },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

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
              }`}>
              {link.name}
            </a>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="mt-auto pt-6 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 font-medium flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </button>
      </div>
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
                <Route
                  path="/admin/tables"
                  element={<AdminTableManagePage />}
                />
                <Route path="/admin/stock" element={<StockManagementPage />} />
                <Route
                  path="/admin/expenses"
                  element={<ExpenseManagementPage />}
                />
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
