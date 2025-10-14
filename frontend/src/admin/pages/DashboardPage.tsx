"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import {
  Card,
  Title,
  Text,
  Flex,
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  Metric,
} from "@tremor/react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TopItem {
  name: string;
  total_quantity: number;
  total_amount: number;
}

interface CategorySales {
  category: string;
  total_amount: number;
}

const COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#8A2BE2", "#00C49F"];

export default function DashboardPage() {
  const [totalSales, setTotalSales] = useState<number>(0);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);

  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await axios.get(`http://localhost:5000/api/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`, // ✅ ส่ง token ให้ backend
        },
      });

      setTotalSales(res.data.total_sales);
      setTopItems(res.data.top_items);
      setCategorySales(res.data.category_sales);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        // token invalid หรือ expired
        handleLogout();
      }
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("username");
    localStorage.removeItem("role");

    logout();
    navigate("/login");
  };

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header + Logout */}
      <Flex justifyContent="between" alignItems="center" className="mb-4">
        <Title className="text-2xl font-bold text-[#FF6500]">Dashboard</Title>
        <button
          onClick={handleLogout}
          className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl shadow transition">
          Logout
        </button>
      </Flex>

      {/* ยอดขายรวม */}
      <Card className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white shadow-xl rounded-2xl p-4">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title className="text-white">ยอดขายรวม</Title>
            <Metric className="text-4xl font-bold mt-2">
              {totalSales.toLocaleString()} บาท
            </Metric>
          </div>
        </Flex>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 สินค้าขายดี */}
        <Card className="shadow-lg rounded-2xl py-10 max-h-[400px] overflow-y-auto">
          <Title className="text-lg font-semibold mb-2 text-center">
            Top 5 สินค้าขายดี
          </Title>
          <Table className="min-w-full text-sm text-center align-middle">
            <TableHead>
              <TableRow className="bg-[#FF6500]/20">
                <TableHeaderCell>#</TableHeaderCell>
                <TableHeaderCell>ชื่อสินค้า</TableHeaderCell>
                <TableHeaderCell>จำนวนขาย</TableHeaderCell>
                <TableHeaderCell>ยอดขายรวม</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topItems.map((item, i) => (
                <TableRow
                  key={item.name}
                  className={`${
                    i % 2 === 0 ? "bg-white" : "bg-[#FFF5E6]"
                  } hover:bg-[#FFF0E0] transition`}>
                  <TableCell className="text-center align-middle">
                    {i + 1}
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    <Text className="truncate max-w-[150px] mx-auto">
                      {item.name}
                    </Text>
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    {item.total_quantity}
                  </TableCell>
                  <TableCell className="text-center align-middle">
                    {item.total_amount.toLocaleString()} บาท
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* กราฟรายได้ตามประเภทเมนู */}
        <Card className="shadow-lg rounded-2xl p-4">
          <Title className="text-lg font-semibold mb-2">
            รายได้ตามประเภทเมนู
          </Title>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={categorySales}
                dataKey="total_amount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label>
                {categorySales.map((entry, index) => (
                  <Cell
                    key={entry.category}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `${value.toLocaleString()} บาท`}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
