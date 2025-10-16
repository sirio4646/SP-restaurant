import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../../../store/authStore";

const API_BASE_URL = "http://localhost:5000/api";

const handleStorageSetup = (
  token: string,
  username: string,
  restaurant_id?: number,
  isCustomer?: boolean
) => {
  if (isCustomer) {
    sessionStorage.setItem("jwtToken", token);
    sessionStorage.setItem("username", username);
    sessionStorage.setItem("is_customer", "true");

    const clearSession = () => sessionStorage.clear();
    window.addEventListener("beforeunload", clearSession);
    window.addEventListener("pagehide", clearSession);
  } else {
    localStorage.setItem("jwtToken", token);
    localStorage.setItem("username", username);
    localStorage.setItem("is_customer", "false");
    if (restaurant_id) {
      localStorage.setItem("restaurant_id", restaurant_id.toString());
    }
  }
};

const getRedirectPath = (isCustomer: boolean) =>
  isCustomer ? "/customer/table-reservation" : "/admin/dashboard";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password,
      });

      const { token, restaurant_id, is_customer } = response.data;

      handleStorageSetup(token, username, restaurant_id, is_customer);
      setAuth(token, username, "");
      navigate(getRedirectPath(is_customer));
    } catch (err: any) {
      const errorMessage =
        err.response?.status === 401
          ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
          : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')`,
        fontFamily: "Carlito, sans-serif",
      }}>
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">เข้าสู่ระบบ</h1>
          <p className="text-gray-600">ระบบจัดการร้านอาหาร</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ชื่อผู้ใช้
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
              placeholder="กรอกชื่อผู้ใช้"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รหัสผ่าน
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
              placeholder="กรอกรหัสผ่าน"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-semibold transition-all transform text-white ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] hover:scale-105 shadow-lg"
            }`}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  );
}
