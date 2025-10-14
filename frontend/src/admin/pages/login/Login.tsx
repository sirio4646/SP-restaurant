'use client';
import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../../../store/authStore";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      alert("กรุณากรอก username และ password");
      return;
    }

    setLoading(true);

    try {
      // --- ส่ง username/password ดิบไป backend
      const response = await axios.post("http://localhost:5000/api/auth/login", {
        username,
        password,
      });

      if (response.status === 200) {
        const { token, restaurant_id, is_customer } = response.data;

        // --- เก็บ JWT + restaurant_id ลง localStorage
        localStorage.setItem("jwtToken", token);
        localStorage.setItem("username", username);
        if (restaurant_id) localStorage.setItem("restaurant_id", restaurant_id.toString());

        // --- เก็บลง Zustand store
        setAuth(token, username, "");

        // --- Redirect ตาม type ของ user
        if (is_customer) {
          navigate("/customer/table-reservation");
        } else {
          navigate("/admin/dashboard");
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-cover bg-center font-sans text-gray-800"
      style={{
        backgroundImage: "url('https://thumbs.dreamstime.com/b/thai-food-background-dishes-cuisine-tom-yum-soup-pad-noodles-fried-rice-pork-vegetables-khao-phat-mu-85688529.jpg')",
      }}
    >
      <div className="w-full max-w-sm bg-white/90 backdrop-blur-sm shadow-2xl rounded-3xl p-6">
        <h2 className="text-2xl font-bold mb-6 text-center text-[#FF6500]">Login</h2>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Username"
            className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6500] shadow-sm transition"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6500] shadow-sm transition"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#FF6500] hover:bg-[#FFA559] text-white py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-gray-700 mt-4 text-center">
          ยังไม่มีบัญชี?{" "}
          <span
            className="text-[#FF6500] cursor-pointer hover:underline"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </div>
    </div>


  );
}
