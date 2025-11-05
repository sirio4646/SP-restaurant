import { useState, useEffect } from "react";
import api from "../../utils/axiosConfig";

interface Expense {
  id: number;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
}

// เพิ่ม interface สำหรับรายงานการเงินแบบครบถ้วน
interface FinancialReport {
  period: string;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  topProducts: TopItem[]; // เปลี่ยนเป็น TopItem[]
  expenses: {
    total_expenses: number;
    breakdown: {
      rent: number;
      utilities: number;
      salary: number;
      //ingredients: number;
    };
    count: {
      rent: number;
      utilities: number;
      salary: number;
      //ingredients: number;
    };
  };

  // ข้อมูลกำไร
  profit: {
    net_profit: number;
    profit_margin: number;
  };

  // ข้อมูลการชำระเงิน
  paymentMethods: {
    cash: { count: number; amount: number; percentage: number };
    qr_code: { count: number; amount: number; percentage: number };
  };

  // ยอดขายรายวัน
  dailySales: {
    date: string;
    revenue: number;
    orders: number;
  }[];

  // สถานะออเดอร์
  statusBreakdown: {
    completed: { count: number; revenue: number };
    pending: { count: number; revenue: number };
    cancelled: { count: number; revenue: number };
  };

  // โต๊ะที่มียอดขายสูงสุด
  topTables: {
    table_number: number;
    revenue: number;
    orders: number;
  }[];
}

// เพิ่ม interface TopItem แบบเดียวกับ DashboardPage
interface TopItem {
  name: string;
  total_quantity: number;
  total_amount: number;
}

export default function ExpenseManagementPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  // เพิ่ม state สำหรับการลบ
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [newExpense, setNewExpense] = useState({
    category: "",
    amount: "",
    other_number: "",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  const [financialData, setFinancialData] = useState<FinancialReport | null>(
    null
  );
  const [showFinancialReport, setShowFinancialReport] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0],
  });

  const expenseCategories = [
    { value: "rent", label: "ค่าเช่าที่" },
    { value: "utilities", label: "ค่าน้ำค่าไฟ" },
    { value: "other", label: "อื่นๆ" },
  ];

  // Categories สำหรับแสดงในรายงาน (รวม salary)
  const reportCategories = [
    { value: "rent", label: "ค่าเช่าที่" },
    { value: "utilities", label: "ค่าน้ำค่าไฟ" },
    { value: "salary", label: "เงินเดือนพนักงาน" },
    //{ value: "ingredients", label: "ค่าวัตถุดิบ" },
    { value: "other", label: "อื่นๆ" },
  ];

  const fetchExpenses = async () => {
    try {
      console.log("Fetching expenses...");
      const response = await api.get("/expenses");
      console.log("Raw expenses response:", response.data);

      // กรองข้อมูลให้แสดงเฉพาะหมวดหมู่ที่ต้องการ
      const allowedCategories = ["rent", "utilities", "other"];

      const filteredExpenses = response.data.filter((expense: Expense) =>
        allowedCategories.includes(expense.category)
      );

      console.log("Filtered expenses:", filteredExpenses);
      setExpenses(filteredExpenses);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  const handleAddExpense = async () => {
    try {
      // ส่ง other_number เฉพาะเมื่อ category === 'other'
      const payload: any = {
        category: newExpense.category,
        amount: parseFloat(newExpense.amount),
        description: newExpense.description,
        expense_date: newExpense.expense_date,
      };
      if (newExpense.category === "other") {
        payload.other_number = newExpense.other_number;
      }
      await api.post("/expenses", payload);

      setNewExpense({
        category: "",
        amount: "",
        other_number: "",
        description: "",
        expense_date: new Date().toISOString().split("T")[0],
      });
      setShowAddForm(false);
      fetchExpenses();
      alert("เพิ่มรายจ่ายสำเร็จ!");
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("เกิดข้อผิดพลาดในการเพิ่มรายจ่าย");
    }
  };

  // เพิ่มฟังก์ชันลบรายจ่าย
  const handleDeleteExpense = async (expenseId: number) => {
    const expense = expenses.find((e) => e.id === expenseId);
    if (!expense) return;

    const confirmMessage = `คุณต้องการลบรายจ่าย "${
      expense.description
    }" จำนวน ฿${expense.amount.toLocaleString()} ใช่หรือไม่?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingId(expenseId);
      await api.delete(`/expenses/${expenseId}`);

      // อัปเดต state โดยลบรายการที่ถูกลบออก
      setExpenses(expenses.filter((expense) => expense.id !== expenseId));
      alert("ลบรายจ่ายสำเร็จ!");
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("เกิดข้อผิดพลาดในการลบรายจ่าย");
    } finally {
      setDeletingId(null);
    }
  };

  // ฟังก์ชันสร้างรายงานการเงินแบบครบถ้วน - แก้ไขให้ใช้ expenses ที่ fetch มาแล้ว
  const generateFinancialReport = async () => {
    try {
      setGeneratingReport(true);

      // 1. ดึงข้อมูลออเดอร์
      const ordersResponse = await api.get("/orders");
      const orders = ordersResponse.data;

      // 2. ดึงข้อมูลรายจ่าย (rent, utilities, equipment) -- ดึงทั้งหมด ไม่ต้องส่ง params
      const expensesResponse = await api.get("/expenses");
      const expensesData: Expense[] = expensesResponse.data;

      const parseDate = (dateStr: string) => {
        // รับทั้ง "Wed, 01 Oct 2025 00:00:00 GMT" และ "2025-10-01"
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return ""; // ถ้าแปลงไม่ได้
        return d.toISOString().split("T")[0];
      };

      const filteredExpenses = expensesData.filter((e) => {
        const expDate = parseDate(e.expense_date);
        return (
          expDate >= reportDateRange.start && expDate <= reportDateRange.end
        );
      });

      // 3. ดึงข้อมูลเงินเดือนพนักงาน
      const employeesResponse = await api.get("/employees");
      const employees = employeesResponse.data;
      const totalSalary = employees
        .filter((emp: any) => emp.salary && emp.salary > 0)
        .reduce((sum: number, emp: any) => sum + Number(emp.salary), 0);

      // 4. ดึงข้อมูลค่าวัตถุดิบ
      //const ingredientStockResponse = await api.get("/ingredient-stock");
      //const ingredientStock = ingredientStockResponse.data;

      /*const totalIngredients = ingredientStock
        .filter((stock: any) => {
          // แปลงวันที่ให้เป็นรูปแบบเดียวกัน
          const receivedDate = new Date(stock.received_date)
            .toISOString()
            .split("T")[0];
          const startDate = reportDateRange.start;
          const endDate = reportDateRange.end;

          console.log(
            "Stock received_date:",
            stock.received_date,
            "-> converted:",
            receivedDate
          );
          console.log("Date range:", startDate, "to", endDate);
          console.log(
            "In range?",
            receivedDate >= startDate && receivedDate <= endDate
          );

          return (
            receivedDate >= startDate &&
            receivedDate <= endDate &&
            stock.purchase_price &&
            stock.quantity
          );
        })
        .reduce((sum: number, stock: any) => {
          const totalCost =
            Number(stock.purchase_price) * Number(stock.quantity);
          console.log(
            "Adding stock:",
            stock.ingredient_name,
            `${stock.quantity} × ฿${stock.purchase_price} = ฿${totalCost}`
          );
          return sum + totalCost;
        }, 0);

      console.log("Total ingredients cost:", totalIngredients);*/

      // 5. กรอง expenses ตามหมวดหมู่
      const getExpenseSum = (category: string) =>
        filteredExpenses
          .filter((e) => e.category === category)
          .reduce((sum, e) => sum + Number(e.amount), 0);

      const getExpenseCount = (category: string) =>
        filteredExpenses.filter((e) => e.category === category).length;

      const expenseBreakdown = {
        rent: getExpenseSum("rent"),
        utilities: getExpenseSum("utilities"),
        salary: totalSalary,
        //ingredients: totalIngredients,
      };

      const expenseBreakdownCount = {
        rent: getExpenseCount("rent"),
        utilities: getExpenseCount("utilities"),
        salary: totalSalary > 0 ? 1 : 0,
        //ingredients: totalIngredients > 0 ? 1 : 0,
      };

      const totalExpenses = Object.values(expenseBreakdown).reduce(
        (sum, v) => sum + Number(v),
        0
      );

      // กรองออเดอร์ตามช่วงวันที่
      const filteredOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.order_time)
          .toISOString()
          .split("T")[0];
        return (
          orderDate >= reportDateRange.start && orderDate <= reportDateRange.end
        );
      });

      // คำนวณยอดขายรวม
      const completedOrders = filteredOrders.filter(
        (order: any) =>
          order.status === "completed" && order.payment_status === "paid"
      );
      const totalRevenue = completedOrders.reduce(
        (sum: number, order: any) => sum + parseFloat(order.total_amount),
        0
      );

      // คำนวณกำไรและอัตราส่วน
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // ข้อมูลการชำระเงิน
      const cashOrders = completedOrders.filter(
        (order: any) => !order.qr_code_url || order.qr_code_url === "None"
      );
      const qrOrders = completedOrders.filter(
        (order: any) => order.qr_code_url && order.qr_code_url !== "None"
      );
      const cashAmount = cashOrders.reduce(
        (sum: number, order: any) => sum + parseFloat(order.total_amount),
        0
      );
      const qrAmount = qrOrders.reduce(
        (sum: number, order: any) => sum + parseFloat(order.total_amount),
        0
      );

      // ยอดขายรายวัน
      const dailySalesMap = new Map();
      completedOrders.forEach((order: any) => {
        const date = new Date(order.order_time).toISOString().split("T")[0];
        const amount = parseFloat(order.total_amount);

        if (dailySalesMap.has(date)) {
          const existing = dailySalesMap.get(date);
          dailySalesMap.set(date, {
            date,
            revenue: existing.revenue + amount,
            orders: existing.orders + 1,
          });
        } else {
          dailySalesMap.set(date, { date, revenue: amount, orders: 1 });
        }
      });
      const dailySales = Array.from(dailySalesMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );

      // สถานะออเดอร์
      const statusBreakdown = {
        completed: {
          count: filteredOrders.filter((o: any) => o.status === "completed")
            .length,
          revenue: completedOrders.reduce(
            (sum: number, order: any) => sum + parseFloat(order.total_amount),
            0
          ),
        },
        pending: {
          count: filteredOrders.filter((o: any) => o.status === "pending")
            .length,
          revenue: filteredOrders
            .filter((o: any) => o.status === "pending")
            .reduce(
              (sum: number, order: any) => sum + parseFloat(order.total_amount),
              0
            ),
        },
        cancelled: {
          count: filteredOrders.filter((o: any) => o.status === "cancelled")
            .length,
          revenue: 0,
        },
      };

      // โต๊ะที่มียอดขายสูงสุด
      const tableRevenueMap = new Map();
      completedOrders.forEach((order: any) => {
        const table = order.table_number;
        const amount = parseFloat(order.total_amount);

        if (tableRevenueMap.has(table)) {
          const existing = tableRevenueMap.get(table);
          tableRevenueMap.set(table, {
            table_number: table,
            revenue: existing.revenue + amount,
            orders: existing.orders + 1,
          });
        } else {
          tableRevenueMap.set(table, {
            table_number: table,
            revenue: amount,
            orders: 1,
          });
        }
      });
      const topTables = Array.from(tableRevenueMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // รวมยอดขายสินค้า
      const productSalesMap = new Map<string, TopItem>();
      completedOrders.forEach((order: any) => {
        if (Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const key = item.menu_name;
            if (!key) return;
            if (!productSalesMap.has(key)) {
              productSalesMap.set(key, {
                name: key,
                total_quantity: 0,
                total_amount: 0,
              });
            }
            const entry = productSalesMap.get(key)!;
            entry.total_quantity += Number(item.quantity) || 0;
            entry.total_amount +=
              (Number(item.price_at_order) || 0) * (Number(item.quantity) || 0);
          });
        }
      });
      const topProducts = Array.from(productSalesMap.values())
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 5);

      // รวมข้อมูลทั้งหมด
      const financialReport: FinancialReport = {
        period: `${reportDateRange.start} ถึง ${reportDateRange.end}`,
        totalRevenue,
        totalOrders: completedOrders.length,
        avgOrderValue: totalRevenue / Math.max(completedOrders.length, 1),

        expenses: {
          total_expenses: totalExpenses,
          breakdown: expenseBreakdown,
          count: expenseBreakdownCount,
        },

        profit: {
          net_profit: netProfit,
          profit_margin: profitMargin,
        },

        paymentMethods: {
          cash: {
            count: cashOrders.length,
            amount: cashAmount,
            percentage:
              totalRevenue > 0 ? (cashAmount / totalRevenue) * 100 : 0,
          },
          qr_code: {
            count: qrOrders.length,
            amount: qrAmount,
            percentage: totalRevenue > 0 ? (qrAmount / totalRevenue) * 100 : 0,
          },
        },

        dailySales,
        statusBreakdown,
        topTables,
        topProducts,
      };

      setFinancialData(financialReport);
      setShowFinancialReport(true);
    } catch (error: any) {
      console.error("Error generating financial report:", error);
      alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  const exportFinancialReportCSV = () => {
    if (!financialData) return;

    const escapeCSV = (value: string | number) => {
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Helper function to format numbers for CSV
    const formatNumber = (num: number) => {
      return `"${num.toLocaleString()}"`;
    };

    const csvRows: string[] = [];

    // Header
    csvRows.push("รายงานทางการเงิน");
    csvRows.push(
      `ระยะเวลา: ${reportDateRange.start} ถึง ${reportDateRange.end}`
    );
    csvRows.push("");

    // Overview
    csvRows.push("สรุปภาพรวม");
    csvRows.push("รายการ,ค่า");
    csvRows.push(`รายรับรวม,${formatNumber(financialData.totalRevenue)} บาท`);
    csvRows.push(
      `รายจ่ายรวม,${formatNumber(financialData.expenses.total_expenses)} บาท`
    );
    csvRows.push(
      `กำไรสุทธิ,${formatNumber(financialData.profit.net_profit)} บาท`
    );
    csvRows.push(
      `จำนวนออเดอร์ทั้งหมด,${formatNumber(financialData.totalOrders)}`
    );
    csvRows.push(
      `ยอดเฉลี่ยต่อออเดอร์,"${financialData.avgOrderValue.toFixed(2)}" บาท`
    );
    csvRows.push("");

    // Expenses by Category
    csvRows.push("รายจ่ายแยกตามหมวดหมู่");
    csvRows.push("หมวดหมู่,จำนวนเงิน (บาท)");
    Object.entries(financialData.expenses.breakdown).forEach(([k, v]) => {
      const categoryName =
        {
          rent: "ค่าเช่าที่",
          utilities: "ค่าน้ำค่าไฟ",
          salary: "เงินเดือนพนักงาน",
          ingredients: "ค่าวัตถุดิบ",
          other: "อื่นๆ",
        }[k] || k;
      csvRows.push(`${escapeCSV(categoryName)},${formatNumber(Number(v))}`);
    });
    csvRows.push("");

    // Payment Methods
    csvRows.push("วิธีการชำระเงิน");
    csvRows.push("วิธีการ,จำนวนออเดอร์,จำนวนเงิน (บาท),เปอร์เซ็นต์");
    csvRows.push(
      `เงินสด,${formatNumber(
        financialData.paymentMethods.cash.count
      )},${formatNumber(
        financialData.paymentMethods.cash.amount
      )},"${financialData.paymentMethods.cash.percentage.toFixed(1)}%"`
    );
    csvRows.push(
      `QR Code,${formatNumber(
        financialData.paymentMethods.qr_code.count
      )},${formatNumber(
        financialData.paymentMethods.qr_code.amount
      )},"${financialData.paymentMethods.qr_code.percentage.toFixed(1)}%"`
    );
    csvRows.push("");

    // Order Status
    csvRows.push("สถานะออเดอร์");
    csvRows.push("สถานะ,จำนวนออเดอร์,รายรับ (บาท)");
    csvRows.push(
      `เสร็จสมบูรณ์,${formatNumber(
        financialData.statusBreakdown.completed.count
      )},${formatNumber(financialData.statusBreakdown.completed.revenue)}`
    );
    csvRows.push(
      `รอดำเนินการ,${formatNumber(
        financialData.statusBreakdown.pending.count
      )},${formatNumber(financialData.statusBreakdown.pending.revenue)}`
    );
    csvRows.push(
      `ยกเลิก,${formatNumber(
        financialData.statusBreakdown.cancelled.count
      )},${formatNumber(financialData.statusBreakdown.cancelled.revenue)}`
    );
    csvRows.push("");

    // Top Tables
    csvRows.push("โต๊ะที่มียอดขายสูงสุด");
    csvRows.push("โต๊ะ,รายรับ (บาท),จำนวนออเดอร์");
    financialData.topTables.forEach((table) => {
      csvRows.push(
        `โต๊ะ ${table.table_number},${formatNumber(
          table.revenue
        )},${formatNumber(table.orders)}`
      );
    });
    csvRows.push("");

    // Daily Sales
    csvRows.push("ยอดขายรายวัน");
    csvRows.push("วันที่,รายรับ (บาท),จำนวนออเดอร์,เฉลี่ยต่อออเดอร์ (บาท)");
    financialData.dailySales.forEach((day) => {
      csvRows.push(
        `${day.date},${formatNumber(day.revenue)},${formatNumber(
          day.orders
        )},"${(day.revenue / day.orders).toFixed(2)}"`
      );
    });
    csvRows.push("");

    // Top 5 Best Sellers
    csvRows.push("สินค้าขายดี Top 5");
    csvRows.push("สินค้า,จำนวนที่ขาย,ยอดขาย (บาท)");
    financialData.topProducts.forEach((prod) => {
      csvRows.push(
        `${escapeCSV(prod.name)},${formatNumber(
          prod.total_quantity
        )},${formatNumber(prod.total_amount)}`
      );
    });

    // Create and download CSV
    const csvContent = csvRows.join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `รายงานการเงิน-${reportDateRange.start}-ถึง-${reportDateRange.end}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    console.log("Current expenses:", expenses);
    console.log("Expense categories available:", expenseCategories);
  }, [expenses]);

  // เพิ่มใน useEffect เพื่อดูข้อมูลรายจ่าย
  useEffect(() => {
    console.log(
      "Current expenses with dates:",
      expenses.map((e) => ({
        id: e.id,
        category: e.category,
        amount: e.amount,
        date: e.expense_date,
        description: e.description,
      }))
    );

    console.log("Current date range:", reportDateRange);
  }, [expenses, reportDateRange]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#FF6500]">
          จัดการรายจ่าย & รายงานการเงิน
        </h1>
      </div>

      {/* รายการรายจ่าย */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">รายการรายจ่าย</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white px-4 py-2 rounded-xl shadow transition font-semibold">
            + เพิ่มรายจ่าย
          </button>
        </div>

        {/* ลบสรุปยอดรวมแต่ละหมวดหมู่และ debug ออก */}
        {/* ตารางเดิม */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">วันที่</th>
                <th className="text-left p-3">หมวดหมู่</th>
                <th className="text-right p-3">จำนวนเงิน</th>
                <th className="text-left p-3">คำอธิบาย</th>
                <th className="text-center p-3">การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{expense.expense_date}</td>
                  <td className="p-3">
                    {
                      expenseCategories.find(
                        (cat) => cat.value === expense.category
                      )?.label
                    }
                  </td>
                  <td className="p-3 text-right font-semibold">
                    ฿{expense.amount.toLocaleString()}
                  </td>
                  <td className="p-3">{expense.description}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      disabled={deletingId === expense.id}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1 mx-auto disabled:opacity-50 disabled:cursor-not-allowed">
                      {deletingId === expense.id ? (
                        <>
                          <svg
                            className="animate-spin h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12c0-4.418 3.582-8 8-8s8 3.582 8 8H4z"></path>
                          </svg>
                          ลบ...
                        </>
                      ) : (
                        <>
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          ลบ
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    ไม่มีข้อมูลรายจ่าย
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ส่วนรายงานการเงิน */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">รายงานการเงินแบบครบถ้วน</h2>

        {/* ช่วงวันที่รายงาน */}
        <div className="flex gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-2">
              วันที่เริ่มต้น
            </label>
            <input
              type="date"
              value={reportDateRange.start}
              onChange={(e) =>
                setReportDateRange({
                  ...reportDateRange,
                  start: e.target.value,
                })
              }
              className="p-3 border rounded-xl w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">
              วันที่สิ้นสุด
            </label>
            <input
              type="date"
              value={reportDateRange.end}
              onChange={(e) =>
                setReportDateRange({
                  ...reportDateRange,
                  end: e.target.value,
                })
              }
              className="p-3 border rounded-xl w-full"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={generateFinancialReport}
              disabled={generatingReport}
              className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50">
              {generatingReport && (
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12c0-4.418 3.582-8 8-8s8 3.582 8 8H4z"></path>
                </svg>
              )}
              สร้างรายงานครบถ้วน
            </button>
          </div>
        </div>

        {/* แสดงรายงานการเงินแบบครบถ้วน */}
        {showFinancialReport && financialData && (
          <div className="space-y-8">
            <div className="flex justify-end mb-4">
              <button
                onClick={exportFinancialReportCSV}
                className="bg-gradient-to-r from-green-400 to-green-600 text-white px-6 py-2 rounded-xl font-semibold shadow hover:from-green-500 hover:to-green-700 transition flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                ดาวน์โหลดรายงาน CSV
              </button>
            </div>

            {/* สรุปภาพรวมการเงิน */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200">
              <h3 className="text-2xl font-bold text-blue-800 mb-4">
                สรุปการเงิน
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl shadow">
                  <div className="text-sm text-gray-600">รายรับรวม</div>
                  <div className="text-2xl font-bold text-green-600">
                    ฿{financialData.totalRevenue.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                  <div className="text-sm text-gray-600">รายจ่ายรวม</div>
                  <div className="text-2xl font-bold text-red-600">
                    ฿{financialData.expenses.total_expenses.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                  <div className="text-sm text-gray-600">กำไรสุทธิ</div>
                  <div
                    className={`text-2xl font-bold ${
                      financialData.profit.net_profit >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                    ฿{financialData.profit.net_profit.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                  <div className="text-sm text-gray-600">จำนวนออเดอร์</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {financialData.totalOrders}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                  <div className="text-sm text-gray-600">ยอดเฉลี่ย/ออเดอร์</div>
                  <div className="text-2xl font-bold text-purple-600">
                    ฿{financialData.avgOrderValue.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>

            {/* รายจ่ายแยกตามหมวดหมู่ - ใช้ข้อมูลจากข้างบน */}
            <div className="bg-red-50 p-6 rounded-2xl border border-red-200">
              <h3 className="text-xl font-bold text-red-800 mb-4">
                รายจ่ายแยกตามหมวดหมู่
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {reportCategories.map((category) => {
                  const amount =
                    financialData?.expenses.breakdown[
                      category.value as keyof typeof financialData.expenses.breakdown
                    ] || 0;
                  const count =
                    financialData?.expenses.count[
                      category.value as keyof typeof financialData.expenses.count
                    ] || 0;
                  return (
                    <div
                      key={category.value}
                      className="bg-white p-3 rounded-lg shadow-sm">
                      <div className="text-sm text-gray-600">
                        {category.label}
                      </div>
                      <div className="text-lg font-bold text-red-600">
                        ฿{amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        ({count} รายการ)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* วิธีการชำระเงิน */}
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
              <h3 className="text-xl font-bold text-green-800 mb-4">
                วิธีการชำระเงิน
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-xl shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold">เงินสด</span>
                    <span className="text-2xl font-bold text-green-600">
                      ฿
                      {financialData.paymentMethods.cash.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {financialData.paymentMethods.cash.count} ออเดอร์ (
                    {financialData.paymentMethods.cash.percentage.toFixed(1)}%)
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-semibold">QR Code</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ฿
                      {financialData.paymentMethods.qr_code.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {financialData.paymentMethods.qr_code.count} ออเดอร์ (
                    {financialData.paymentMethods.qr_code.percentage.toFixed(1)}
                    %)
                  </div>
                </div>
              </div>
            </div>

            {/* สถานะออเดอร์ */}
            <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-200">
              <h3 className="text-xl font-bold text-yellow-800 mb-4">
                สถานะออเดอร์
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow">
                  <div className="text-sm text-gray-600">เสร็จสมบูรณ์</div>
                  <div className="text-xl font-bold text-green-600">
                    {financialData.statusBreakdown.completed.count} ออเดอร์
                  </div>
                  <div className="text-lg text-green-600">
                    ฿
                    {financialData.statusBreakdown.completed.revenue.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                  <div className="text-sm text-gray-600">รอดำเนินการ</div>
                  <div className="text-xl font-bold text-yellow-600">
                    {financialData.statusBreakdown.pending.count} ออเดอร์
                  </div>
                  <div className="text-lg text-yellow-600">
                    ฿
                    {financialData.statusBreakdown.pending.revenue.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow">
                  <div className="text-sm text-gray-600">ยกเลิก</div>
                  <div className="text-xl font-bold text-red-600">
                    {financialData.statusBreakdown.cancelled.count} ออเดอร์
                  </div>
                  <div className="text-lg text-red-600">
                    ฿
                    {financialData.statusBreakdown.cancelled.revenue.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* โต๊ะที่มียอดขายสูงสุด */}
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200">
              <h3 className="text-xl font-bold text-purple-800 mb-4">
                โต๊ะที่มียอดขายสูงสุด
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {financialData.topTables.map((table) => (
                  <div
                    key={table.table_number}
                    className="bg-white p-4 rounded-xl shadow">
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        โต๊ะ {table.table_number}
                      </div>
                      <div className="text-xl font-bold text-green-600">
                        ฿{table.revenue.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        {table.orders} ออเดอร์
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ยอดขายรายวัน */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                ยอดขายรายวัน
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">วันที่</th>
                      <th className="text-right p-3">ยอดขาย</th>
                      <th className="text-right p-3">จำนวนออเดอร์</th>
                      <th className="text-right p-3">เฉลี่ย/ออเดอร์</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialData.dailySales.map((day) => (
                      <tr key={day.date} className="border-b hover:bg-gray-50">
                        <td className="p-3">{day.date}</td>
                        <td className="p-3 text-right font-semibold">
                          ฿{day.revenue.toLocaleString()}
                        </td>
                        <td className="p-3 text-right">{day.orders}</td>
                        <td className="p-3 text-right">
                          ฿{(day.revenue / day.orders).toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top 5 สินค้าขายดี */}
            <div className="bg-pink-50 p-6 rounded-2xl border border-pink-200">
              <h3 className="text-xl font-bold text-pink-800 mb-4">
                Top 5 สินค้าขายดี
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">สินค้า</th>
                      <th className="text-right p-3">จำนวนที่ขาย</th>
                      <th className="text-right p-3">ยอดขาย (บาท)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialData.topProducts.length > 0 ? (
                      financialData.topProducts.map((prod, idx) => (
                        <tr
                          key={prod.name}
                          className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            {idx + 1}. {prod.name}
                          </td>
                          <td className="p-3 text-right">
                            {prod.total_quantity}
                          </td>
                          <td className="p-3 text-right">
                            ฿{prod.total_amount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-6 text-center text-gray-500">
                          ไม่มีข้อมูลสินค้า
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal เพิ่มรายจ่าย */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">เพิ่มรายจ่าย</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  หมวดหมู่
                </label>
                <select
                  value={newExpense.category}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, category: e.target.value })
                  }
                  className="w-full p-3 border rounded-xl">
                  <option value="">เลือกหมวดหมู่</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  จำนวนเงิน
                </label>
                <input
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, amount: e.target.value })
                  }
                  className="w-full p-3 border rounded-xl"
                  placeholder="0.00"
                />
              </div>

              {/* ถ้าเลือก other ให้แสดงช่องหมายเลข/รหัสเพิ่มเติม */}
              {newExpense.category === "other" && (
                <div>
                  <label className="block text-sm font-semibold mb-2">
                    หมายเลข (อื่นๆ)
                  </label>
                  <input
                    type="text"
                    value={newExpense.other_number}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        other_number: e.target.value,
                      })
                    }
                    className="w-full p-3 border rounded-xl"
                    placeholder="ระบุเลขหรือรหัส (ถ้ามี)"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">
                  วันที่
                </label>
                <input
                  type="date"
                  value={newExpense.expense_date}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      expense_date: e.target.value,
                    })
                  }
                  className="w-full p-3 border rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  คำอธิบาย
                </label>
                <textarea
                  value={newExpense.description}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-3 border rounded-xl h-20"
                  placeholder="รายละเอียดเพิ่มเติม"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddExpense}
                className="flex-1 bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white py-3 rounded-xl font-semibold">
                บันทึก
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-500 text-white py-3 rounded-xl font-semibold">
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
