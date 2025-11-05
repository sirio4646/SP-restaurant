import { useState, useEffect } from "react";
import api from "../../utils/axiosConfig";
import { Card, Title, Flex, Metric } from "@tremor/react";
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

const RANK_STYLES = [
  {
    bg: "bg-gradient-to-r from-yellow-100 to-yellow-200",
    border: "border-yellow-300",
    badge: "bg-gradient-to-br from-yellow-400 to-yellow-600",
  },
  {
    bg: "bg-gradient-to-r from-gray-100 to-gray-200",
    border: "border-gray-300",
    badge: "bg-gradient-to-br from-gray-400 to-gray-600",
  },
  {
    bg: "bg-gradient-to-r from-orange-100 to-orange-200",
    border: "border-orange-300",
    badge: "bg-gradient-to-br from-orange-400 to-orange-600",
  },
  {
    bg: "bg-gradient-to-r from-blue-50 to-blue-100",
    border: "border-blue-200",
    badge: "bg-gradient-to-br from-blue-400 to-blue-600",
  },
];

export default function DashboardPage() {
  const [totalSales, setTotalSales] = useState<number>(0);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  const fetchDashboard = async () => {
    try {
      // หาวันที่ปัจจุบัน
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const monthStr = `${year}-${month}`;

      // ส่ง month=YYYY-MM ไปที่ backend
      const response = await api.get(`/admin/dashboard?month=${monthStr}`);
      const { total_sales, top_items, category_sales } = response.data;

      setTotalSales(total_sales);
      setTopItems(top_items);
      setCategorySales(category_sales);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    }
  };

  const fetchAllCategories = async () => {
    try {
      const response = await api.get("/menus");
      const categories = [
        ...new Set(
          response.data.map((menu: { category: string }) => menu.category)
        ),
      ] as string[];
      setAllCategories(categories);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const getCategoriesWithSales = () => {
    const categoriesWithSales = categorySales.map((cat) => cat.category);
    const categoriesWithoutSales = allCategories.filter(
      (cat) => !categoriesWithSales.includes(cat)
    );

    return [
      ...categorySales,
      ...categoriesWithoutSales.map((cat) => ({
        category: cat,
        total_amount: 0,
      })),
    ];
  };

  const getRankStyle = (index: number) => RANK_STYLES[index] || RANK_STYLES[3];

  const getPercentage = (amount: number) => {
    const totalRevenue = categorySales.reduce(
      (sum, cat) => sum + cat.total_amount,
      0
    );
    return totalRevenue > 0 && amount > 0
      ? ((amount / totalRevenue) * 100).toFixed(1)
      : "0.0";
  };

  const getColorForCategory = (category: string) => {
    const categoriesWithSales = getCategoriesWithSales().filter(
      (cat) => cat.total_amount > 0
    );
    const colorIndex = categoriesWithSales.findIndex(
      (cat) => cat.category === category
    );
    return colorIndex >= 0 ? COLORS[colorIndex % COLORS.length] : "#d1d5db";
  };

  useEffect(() => {
    fetchDashboard();
    fetchAllCategories();
  }, []);

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header */}
      <div className="mb-4">
        <Title className="text-2xl font-bold text-[#FF6500]">Dashboard</Title>
      </div>

      {/* Total Sales */}
      <Card className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white shadow-xl rounded-2xl p-4">
        <Flex justifyContent="between" alignItems="center">
          <div>
            <Title className="text-white">ยอดขายรวมประจำเดือนปัจจุบัน</Title>
            <Metric className="text-4xl font-bold mt-2">
              {totalSales.toLocaleString()} บาท
            </Metric>
          </div>
        </Flex>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Items */}
        <Card className="shadow-lg rounded-2xl p-6">
          <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white p-4 rounded-xl mb-6">
            <Title className="text-xl font-bold text-white">
              Top 5 สินค้าขายดี
            </Title>
          </div>

          <div className="space-y-4">
            {topItems.map((item, index) => {
              const style = getRankStyle(index);
              return (
                <div
                  key={item.name}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-md ${style.bg} ${style.border}`}>
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-md text-white ${style.badge}`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">
                        {item.name}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        ขายได้ {item.total_quantity} ชิ้น
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#FF6500]">
                      ฿{item.total_amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      เฉลี่ย ฿
                      {Math.round(
                        item.total_amount / item.total_quantity
                      ).toLocaleString()}
                      /ชิ้น
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {topItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">ยังไม่มีข้อมูลการขาย</div>
            </div>
          )}
        </Card>

        {/* Category Sales Chart */}
        <Card className="shadow-lg rounded-2xl p-6">
          <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white p-4 rounded-xl mb-6">
            <Title className="text-xl font-bold text-white">
              รายได้ตามประเภทเมนู
            </Title>
          </div>

          {allCategories.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={getCategoriesWithSales().filter(
                      (cat) => cat.total_amount > 0
                    )}
                    dataKey="total_amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    innerRadius={60}
                    paddingAngle={3}
                    strokeWidth={2}
                    stroke="#fff">
                    {getCategoriesWithSales()
                      .filter((cat) => cat.total_amount > 0)
                      .map((entry, index) => (
                        <Cell
                          key={entry.category}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      `฿${value.toLocaleString()}`,
                      "ยอดขาย",
                    ]}
                    labelStyle={{
                      color: "#374151",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "2px solid #FF6500",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={60}
                    iconType="circle"
                    wrapperStyle={{
                      paddingTop: "20px",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Category Summary */}
              <div className="mt-6 space-y-3">
                <h3 className="font-bold text-gray-800 mb-4">
                  สรุปยอดขายแต่ละประเภท
                </h3>
                {getCategoriesWithSales()
                  .sort((a, b) => b.total_amount - a.total_amount)
                  .map((category) => {
                    const percentage = getPercentage(category.total_amount);
                    const hasNoSales = category.total_amount === 0;

                    return (
                      <div
                        key={category.category}
                        className={`flex items-center justify-between p-3 rounded-xl transition ${
                          hasNoSales
                            ? "bg-gray-100 opacity-60"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor: getColorForCategory(
                                category.category
                              ),
                            }}
                          />
                          <span
                            className={`font-medium ${
                              hasNoSales ? "text-gray-500" : "text-gray-800"
                            }`}>
                            {category.category}
                            {hasNoSales && (
                              <span className="text-xs text-gray-400 ml-2">
                                (ยังไม่มียอดขาย)
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-bold ${
                              hasNoSales ? "text-gray-400" : "text-[#FF6500]"
                            }`}>
                            ฿{category.total_amount.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {percentage}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">กำลังโหลดข้อมูล...</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
