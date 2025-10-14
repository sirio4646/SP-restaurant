"use client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RegisterForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("http://127.0.0.1:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, email }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Register successful! Redirecting to login...");
      setTimeout(() => {
        navigate("/login"); // ไปหน้า Login อัตโนมัติ
      }, 1500);
    } else {
      setMessage(data.message || "Register failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 font-sans text-gray-800 bg-cover bg-center
    " style={{
        backgroundImage: "url('https://thumbs.dreamstime.com/b/thai-food-background-dishes-cuisine-tom-yum-soup-pad-noodles-fried-rice-pork-vegetables-khao-phat-mu-85688529.jpg')",
      }}>
      
  <div className="w-full max-w-md bg-white shadow-xl rounded-3xl p-6">
    <h2 className="text-2xl font-bold mb-6 text-center text-[#FF6500]">Register</h2>
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6500] shadow-sm transition"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6500] shadow-sm transition"
      />
      <input
        type="email"
        placeholder="Email (สำหรับร้านค้า)"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6500] shadow-sm transition"
      />
      <button
        type="submit"
        className="w-full bg-[#FF6500] hover:bg-[#FFA559] text-white py-2 rounded-xl font-semibold transition-colors"
      >
        Register
      </button>
    </form>
    {message && <p className="mt-4 text-center text-gray-700">{message}</p>}

    <p className="text-sm text-gray-600 mt-4 text-center">
      มีบัญชีแล้ว?{" "}
      <span
        className="text-[#FF6500] cursor-pointer hover:underline"
        onClick={() => navigate("/login")}
      >
        Login
      </span>
    </p>
  </div>
</div>

  );
}
