import { useEffect, useState } from "react";
import api from "../../utils/axiosConfig";
import { Check, Trash2, FileText } from "lucide-react";

interface OrderItem {
  menu_id: number;
  quantity: number;
  price_at_order: string;
  notes?: string;
  menu_name: string;
  menu_image: string;
}

interface Order {
  id: number;
  restaurant_id: number;
  table_number: string;
  total_amount: string;
  status: string;
  payment_status: string;
  order_time: string;
  updated_at: string;
  qr_code_url: string | null;
  items: OrderItem[];
  created_at?: string;
}

const STATUS_CONFIG = {
  pending: { text: "รอดำเนินการ", color: "bg-yellow-100 text-yellow-700" },
  completed: { text: "เสร็จสิ้น", color: "bg-green-100 text-green-700" },
  cancelled: { text: "ยกเลิก", color: "bg-red-100 text-red-700" },
} as const;

const PAYMENT_STATUS_CONFIG = {
  paid: { text: "ชำระแล้ว", color: "bg-green-200 text-green-700" },
  pending_verification: {
    text: "รอยืนยัน QR",
    color: "bg-yellow-200 text-yellow-700",
  },
  unpaid: { text: "ยังไม่ชำระ", color: "bg-red-200 text-red-700" },
} as const;

// เพิ่ม config สำหรับแสดงวิธีการชำระเงิน
const PAYMENT_METHOD_CONFIG = {
  cash: { text: "เงินสด", color: "bg-green-100 text-green-700" },
  qr_code: { text: "QR Code", color: "bg-blue-100 text-blue-700" },
} as const;

const ACTION_BUTTON_CONFIG = {
  completed: {
    color:
      "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
  },
  payment_received: {
    color:
      "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
  },
  cancelled: {
    color:
      "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
  },
} as const;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderToConfirm, setOrderToConfirm] = useState<Order | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [dailyReportData, setDailyReportData] = useState<any>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get("/orders");
      setOrders(response.data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/orders/${id}`, { status });
      fetchOrders();
    } catch (err) {
      console.error("Failed to update order status:", err);
    }
  };

  const updatePaymentStatus = async (
    id: number,
    payment_status: string,
    qr_code_url?: string
  ) => {
    try {
      await api.patch(`/orders/${id}`, {
        payment_status,
        qr_code_url: qr_code_url || null,
      });
      fetchOrders();
    } catch (err) {
      console.error("Failed to update payment status:", err);
    }
  };

  const handleActionClick = (order: Order, action: string) => {
    setOrderToConfirm(order);
    setActionToConfirm(action);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    if (!orderToConfirm || !actionToConfirm) return;

    if (actionToConfirm === "payment_received") {
      // ถ้าเป็น QR Payment
      if (orderToConfirm.payment_status === "pending_verification") {
        updatePaymentStatus(
          orderToConfirm.id,
          "paid",
          orderToConfirm.qr_code_url || undefined
        );
      } else {
        // ถ้าเป็นเงินสด
        updatePaymentStatus(orderToConfirm.id, "paid", undefined);
      }
    } else {
      updateOrderStatus(orderToConfirm.id, actionToConfirm);
    }

    closeConfirmModal();
    setSelectedOrder(null);
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
    setOrderToConfirm(null);
    setActionToConfirm("");
  };

  const getConfirmMessage = () => {
    if (!orderToConfirm) return "";

    const messages = {
      completed: 'เปลี่ยนสถานะออเดอร์เป็น "เสร็จสิ้น"',
      cancelled: 'เปลี่ยนสถานะออเดอร์เป็น "ยกเลิก"',
      payment_received:
        orderToConfirm.payment_status === "pending_verification"
          ? `ยืนยันการชำระเงินผ่าน QR Code จากโต๊ะ #${orderToConfirm.table_number} เป็นจำนวน ฿${orderToConfirm.total_amount}`
          : `ยืนยันว่าได้รับเงินสดจากโต๊ะ #${orderToConfirm.table_number} เป็นจำนวน ฿${orderToConfirm.total_amount} แล้ว`,
    };

    return messages[actionToConfirm as keyof typeof messages] || "";
  };

  const getOrderStats = () => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  });

  const canShowPaymentButton = (order: Order) =>
    (order.payment_status === "unpaid" ||
      order.payment_status === "pending_verification") &&
    order.status !== "cancelled";

  const renderOrderImage = (item: OrderItem) => (
    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 mr-4 flex-shrink-0">
      {item.menu_image ? (
        <img
          src={item.menu_image}
          alt={item.menu_name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-gray-500 text-xs">
          No Image
        </div>
      )}
    </div>
  );

  // ฟังก์ชันช่วย format ตัวเลขและ escape ข้อความสำหรับพิมพ์
  const formatAmount = (val: string | number) =>
    Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const escapeHtml = (unsafe: string) =>
    unsafe
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const printReceipt = (order: Order) => {
    try {
      const date = new Date(order.order_time);
      const dateStr = date.toLocaleDateString("th-TH");
      const timeStr = date.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const itemsHtml = (order.items || [])
        .map((it) => {
          const name = escapeHtml(it.menu_name || "");
          const qty = Number(it.quantity || 0);
          const price = formatAmount(it.price_at_order);
          return `<div style="display:flex;justify-content:space-between;margin:6px 0;font-size:14px;">
                    <div style="flex:1">${name}</div>
                    <div style="min-width:140px;text-align:right">จำนวน ${qty} &nbsp; ราคา ${price} บาท</div>
                  </div>`;
        })
        .join("");

      const totalItems = (order.items || []).reduce(
        (s, it) => s + Number(it.quantity || 0),
        0
      );
      const totalAmount = formatAmount(order.total_amount);

      const receiptHtml = `
      <html>
      <head>
        <title>ใบเสร็จ #${order.id}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Arial', sans-serif; padding:20px; color:#111; }
          .center { text-align:center; }
          .divider { border-top:1px dashed #444; margin:12px 0; }
          .small { font-size:12px; color:#555; }
        </style>
      </head>
      <body>
        <div class="center">
          <h2 style="margin:4px 0">ชื่อร้าน</h2>
          <div style="font-weight:bold;margin-bottom:8px">ใบเสร็จ</div>
        </div>
        <div class="divider"></div>
        <div style="margin-bottom:6px">พนักงาน: แคชเชียร์ &nbsp; ออเดอร์ #${order.id}</div>
        <div style="margin-bottom:6px">วันที่: ${dateStr} &nbsp; เวลา: ${timeStr}</div>
        <div class="divider"></div>
        <div style="font-weight:bold;margin-bottom:6px">รายการอาหาร</div>
        ${itemsHtml}
        <div class="divider"></div>
        <div style="display:flex;justify-content:space-between;margin:6px 0;font-weight:600">
          <div>จำนวน: ${totalItems} ชิ้น</div>
          <div>รวม: ${totalAmount} บาท</div>
        </div>
        <div style="margin-top:6px;font-size:16px;font-weight:bold">ยอดสุทธิ: ${totalAmount} บาท</div>
        <div class="divider"></div>
        <div class="center small">โอกาสหน้าแวะมาอีกนะครับ</div>
      </body>
      </html>
      `;

      const w = window.open("", "_blank", "width=420,height=720");
      if (!w) {
        alert("ไม่สามารถเปิดหน้าปริ้นท์ได้ กรุณาปิด popup blocker");
        return;
      }
      w.document.open();
      w.document.write(receiptHtml);
      w.document.close();
      w.focus();
      // รอเล็กน้อยให้หน้าเรนเดอร์ก่อนสั่งพิมพ์
      setTimeout(() => {
        w.print();
      }, 500);
    } catch (err) {
      console.error("printReceipt error:", err);
      alert("เกิดข้อผิดพลาดขณะพิมพ์ใบเสร็จ");
    }
  };

  const handleCleanupDeletedMenuOrders = async () => {
    const confirmMessage =
      "คำเตือน: การกระทำนี้จะลบออเดอร์ที่มีเมนูถูกลบออกถาวร\n\n" +
      "คุณแน่ใจหรือไม่ที่จะดำเนินการ?";

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      const result = await cleanupOrdersWithDeletedMenus();

      if (result.count > 0) {
        alert(
          `สำเร็จ!\n\n${
            result.message
          }\n\nรายการที่ลบ:\n${result.deleted_orders.join("\n")}`
        );
      } else {
        alert("ไม่มีออเดอร์ที่ต้องลบ");
      }

      // รีเฟรชข้อมูลออเดอร์
      fetchOrders();
    } catch (error: any) {
      console.error("Failed to cleanup orders:", error);
      alert(
        `เกิดข้อผิดพลาด:\n${
          error.response?.data?.error || "ไม่สามารถลบออเดอร์ได้"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const generateDailyReport = async () => {
    try {
      const today = new Date();
      const todayStr = today.toLocaleDateString("en-CA"); // format: YYYY-MM-DD

      const todayOrders = orders.filter((order) => {
        const orderDate = new Date(order.order_time).toLocaleDateString(
          "en-CA"
        );
        return orderDate === todayStr;
      });

      // Calculate daily stats
      const totalOrders = todayOrders.length;
      const completedOrders = todayOrders.filter(
        (o) => o.status === "completed"
      );
      const totalRevenue = completedOrders.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      );
      const cancelledOrders = todayOrders.filter(
        (o) => o.status === "cancelled"
      ).length;
      const pendingOrders = todayOrders.filter(
        (o) => o.status === "pending"
      ).length;

      // Payment method breakdown
      const cashOrders = completedOrders.filter(
        (o) => !o.qr_code_url || o.qr_code_url === "None"
      );
      const qrOrders = completedOrders.filter(
        (o) => o.qr_code_url && o.qr_code_url !== "None"
      );

      const cashRevenue = cashOrders.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      );
      const qrRevenue = qrOrders.reduce(
        (sum, order) => sum + Number(order.total_amount),
        0
      );

      setDailyReportData({
        date: today,
        totalOrders,
        completedOrders: completedOrders.length,
        pendingOrders,
        cancelledOrders,
        totalRevenue,
        cashRevenue,
        qrRevenue,
        avgOrderValue:
          completedOrders.length > 0
            ? totalRevenue / completedOrders.length
            : 0,
        orders: todayOrders,
      });

      setShowDailyReport(true);
    } catch (error) {
      console.error("Error generating daily report:", error);
      alert("เกิดข้อผิดพลาดในการสร้างรายงาน");
    }
  };

  const printDailyReport = () => {
    if (!dailyReportData) return;

    const reportDate = new Date(dailyReportData.date).toLocaleDateString(
      "th-TH"
    );

    const reportHtml = `
    <html>
    <head>
      <title>รายงานประจำวัน ${reportDate}</title>
      <meta charset="utf-8" />
      <style>
        body { font-family: 'Arial', sans-serif; padding:20px; color:#111; }
        .center { text-align:center; }
        .divider { border-top:1px solid #444; margin:12px 0; }
        .summary { background:#f9f9f9; padding:15px; margin:10px 0; border-radius:5px; }
      </style>
    </head>
    <body>
      <div class="center">
        <h1>รายงานยอดขายประจำวัน</h1>
        <h2>${reportDate}</h2>
      </div>
      <div class="divider"></div>
      
      <div class="summary">
        <h3>สรุปยอดขาย</h3>
        <p><strong>ออเดอร์ทั้งหมด:</strong> ${
          dailyReportData.totalOrders
        } ออเดอร์</p>
        <p><strong>ออเดอร์เสร็จสิ้น:</strong> ${
          dailyReportData.completedOrders
        } ออเดอร์</p>
        <p><strong>ออเดอร์รอดำเนินการ:</strong> ${
          dailyReportData.pendingOrders
        } ออเดอร์</p>
        <p><strong>ออเดอร์ยกเลิก:</strong> ${
          dailyReportData.cancelledOrders
        } ออเดอร์</p>
        <p><strong>ยอดขายรวม:</strong> ฿${dailyReportData.totalRevenue.toLocaleString()}</p>
        <p><strong>ยอดขายเฉลี่ยต่อออเดอร์:</strong> ฿${dailyReportData.avgOrderValue.toFixed(
          2
        )}</p>
      </div>

      <div class="summary">
        <h3>แยกตามวิธีการชำระเงิน</h3>
        <p><strong>เงินสด:</strong> ฿${dailyReportData.cashRevenue.toLocaleString()}</p>
        <p><strong>QR Code:</strong> ฿${dailyReportData.qrRevenue.toLocaleString()}</p>
      </div>

      <div class="divider"></div>
      <div class="center" style="margin-top:20px">
        <small>รายงานสร้างเมื่อ: ${new Date().toLocaleString("th-TH")}</small>
      </div>
    </body>
    </html>
    `;

    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) {
      alert("ไม่สามารถเปิดหน้าปริ้นท์ได้ กรุณาปิด popup blocker");
      return;
    }
    w.document.open();
    w.document.write(reportHtml);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 500);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) fetchOrders();
    }, 20000); // ปรับเป็นค่าอื่นได้ (ms)
    return () => clearInterval(interval);
  }, [loading]);

  const stats = getOrderStats();

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#FF6500]">จัดการออเดอร์</h1>
        <div className="flex gap-3">
          <button
            onClick={generateDailyReport}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow transition font-semibold flex items-center gap-2">
            <FileText size={16} />
            รายงานประจำวัน
          </button>
          <button
            onClick={handleCleanupDeletedMenuOrders}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl shadow transition font-semibold flex items-center gap-2">
            <Trash2 size={16} />
            ลบออเดอร์เมนูที่ถูกลบ
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-blue-100">ออเดอร์ทั้งหมด</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">{stats.pending}</div>
          <div className="text-yellow-100">รอดำเนินการ</div>
        </div>
        <div className="bg-gradient-to-br from-green-400 to-green-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">{stats.completed}</div>
          <div className="text-green-100">เสร็จสิ้น</div>
        </div>
        <div className="bg-gradient-to-br from-red-400 to-red-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">{stats.cancelled}</div>
          <div className="text-red-100">ยกเลิก</div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="bg-white shadow-lg rounded-2xl p-6">
        <h2 className="text-xl font-bold text-[#FF6500] mb-6">รายการออเดอร์</h2>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#FF6500] border-t-transparent mx-auto mb-4"></div>
            <div className="text-lg text-gray-600">กำลังโหลดออเดอร์...</div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">ไม่มีออเดอร์</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border-2 border-gray-200 hover:border-[#FF6500] rounded-2xl shadow-md hover:shadow-xl transition-all p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                    ออเดอร์ #{order.id}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]
                        ?.color
                    }`}>
                    {
                      STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG]
                        ?.text
                    }
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">โต๊ะ:</span>
                    <span className="font-semibold text-[#FF6500] text-lg">
                      #{order.table_number}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">วันที่-เวลา:</span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-800">
                        {new Date(order.order_time).toLocaleDateString("th-TH")}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.order_time).toLocaleTimeString(
                          "th-TH",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">ยอดรวม:</span>
                    <span className="font-bold text-lg text-gray-800">
                      ฿{order.total_amount}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">การชำระ:</span>
                    <div className="flex gap-2 items-center">
                      <span
                        className={`px-2 py-1 rounded-xl text-xs font-semibold ${
                          PAYMENT_STATUS_CONFIG[
                            order.payment_status as keyof typeof PAYMENT_STATUS_CONFIG
                          ]?.color
                        }`}>
                        {
                          PAYMENT_STATUS_CONFIG[
                            order.payment_status as keyof typeof PAYMENT_STATUS_CONFIG
                          ]?.text
                        }
                      </span>
                      {order.payment_status === "paid" && (
                        <span
                          className={`px-2 py-1 rounded-xl text-xs font-semibold ${
                            order.qr_code_url && order.qr_code_url !== "None"
                              ? PAYMENT_METHOD_CONFIG.qr_code.color
                              : PAYMENT_METHOD_CONFIG.cash.color
                          }`}>
                          {order.qr_code_url && order.qr_code_url !== "None"
                            ? PAYMENT_METHOD_CONFIG.qr_code.text
                            : PAYMENT_METHOD_CONFIG.cash.text}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* เพิ่มแสดงรายการอาหารย่อในการ์ด */}
                <div className="border-t pt-4 mt-4">
                  <div className="text-sm text-gray-600 mb-2">รายการอาหาร</div>
                  <ul className="text-sm space-y-1">
                    {order.items && order.items.length > 0 ? (
                      <>
                        {order.items.slice(0, 3).map((it, idx) => (
                          <li key={idx} className="flex justify-between">
                            <span className="truncate mr-2">
                              {it.menu_name}
                            </span>
                            <span className="text-gray-600">
                              จำนวน: {it.quantity}
                            </span>
                          </li>
                        ))}
                        {order.items.length > 3 && (
                          <li className="text-xs text-gray-400">
                            และอีก {order.items.length - 3} รายการ
                          </li>
                        )}
                      </>
                    ) : (
                      <li className="text-sm text-gray-500">ไม่มีรายการ</li>
                    )}
                  </ul>
                </div>

                <button
                  className="w-full mt-4 bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-4 py-2 rounded-xl shadow transition font-semibold"
                  onClick={() => setSelectedOrder(order)}>
                  ดูรายละเอียด
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && orderToConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-[#FF6500] mb-4">
              ยืนยันการกระทำ
            </h2>
            <p className="mb-6 text-gray-700">
              คุณแน่ใจหรือไม่ที่จะ{getConfirmMessage()}?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-6 py-2 rounded-xl bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold transition"
                onClick={closeConfirmModal}>
                ยกเลิก
              </button>
              <button
                className={`px-6 py-2 rounded-xl text-white font-semibold transition ${
                  ACTION_BUTTON_CONFIG[
                    actionToConfirm as keyof typeof ACTION_BUTTON_CONFIG
                  ]?.color || "bg-gradient-to-r from-gray-500 to-gray-600"
                }`}
                onClick={handleConfirmAction}>
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Items Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-40">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white p-4 rounded-xl mb-6">
              <h2 className="text-2xl font-bold">รายการอาหาร</h2>
              <div className="flex justify-between mt-2">
                <span>โต๊ะ #{selectedOrder.table_number}</span>
                <span className="font-bold">
                  ยอดรวม ฿{selectedOrder.total_amount}
                </span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm text-orange-100">
                  วันที่:{" "}
                  {new Date(selectedOrder.order_time).toLocaleDateString(
                    "th-TH"
                  )}
                </span>
                <span className="text-sm text-orange-100">
                  เวลา:{" "}
                  {new Date(selectedOrder.order_time).toLocaleTimeString(
                    "th-TH",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </span>
              </div>
              <div className="mt-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedOrder.payment_status === "paid"
                      ? "bg-green-500 text-white"
                      : selectedOrder.payment_status === "pending_verification"
                      ? "bg-yellow-500 text-white"
                      : "bg-red-500 text-white"
                  }`}>
                  {selectedOrder.payment_status === "paid"
                    ? "ชำระเงินแล้ว"
                    : selectedOrder.payment_status === "pending_verification"
                    ? "รอยืนยันการชำระ QR Code"
                    : "ยังไม่ชำระเงิน"}
                </span>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {selectedOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start border-2 border-gray-200 rounded-2xl p-4 hover:border-[#FF6500] transition">
                  {renderOrderImage(item)}

                  <div className="flex-1">
                    <h4 className="font-bold text-lg text-gray-800 mb-1">
                      {item.menu_name}
                    </h4>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">
                        จำนวน: {item.quantity}
                      </span>
                      <span className="font-bold text-[#FF6500]">
                        ฿{item.price_at_order}
                      </span>
                    </div>
                    {item.notes && (
                      <div className="text-sm text-gray-600 bg-yellow-50 p-2 rounded-lg">
                        <span className="font-medium">หมายเหตุ:</span>{" "}
                        {item.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3">
              {/* Payment Button */}
              {canShowPaymentButton(selectedOrder) && (
                <button
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow transition font-semibold flex items-center gap-2"
                  onClick={() => {
                    // เพิ่ม log เพื่อตรวจสอบ
                    console.log(
                      "Payment Status:",
                      selectedOrder.payment_status
                    );
                    console.log("QR Code URL:", selectedOrder.qr_code_url);
                    handleActionClick(selectedOrder, "payment_received");
                  }}>
                  <Check size={16} />
                  {selectedOrder.payment_status === "pending_verification"
                    ? "ยืนยันการชำระ QR"
                    : "ยืนยันรับเงินสด"}
                </button>
              )}

              {/* Print Receipt Button */}
              <button
                className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-6 py-3 rounded-xl shadow transition font-semibold"
                onClick={() => printReceipt(selectedOrder)}>
                ปริ้นใบเสร็จ
              </button>

              {/* Order Status Buttons */}
              {selectedOrder.status === "pending" && (
                <>
                  <button
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl shadow transition font-semibold"
                    onClick={() =>
                      handleActionClick(selectedOrder, "completed")
                    }>
                    เสร็จสิ้น
                  </button>
                  <button
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl shadow transition font-semibold"
                    onClick={() =>
                      handleActionClick(selectedOrder, "cancelled")
                    }>
                    ยกเลิก
                  </button>
                </>
              )}

              <button
                className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-6 py-3 rounded-xl shadow transition font-semibold"
                onClick={() => setSelectedOrder(null)}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Report Modal */}
      {showDailyReport && dailyReportData && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl mb-6">
              <h2 className="text-2xl font-bold">รายงานประจำวัน</h2>
              <p className="text-blue-100">
                วันที่:{" "}
                {new Date(dailyReportData.date).toLocaleDateString("th-TH")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-green-400 to-green-600 text-white p-4 rounded-xl">
                <div className="text-2xl font-bold">
                  ฿{dailyReportData.totalRevenue.toLocaleString()}
                </div>
                <div className="text-green-100">ยอดขายรวม</div>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-4 rounded-xl">
                <div className="text-2xl font-bold">
                  {dailyReportData.completedOrders}
                </div>
                <div className="text-blue-100">ออเดอร์เสร็จสิ้น</div>
              </div>
              <div className="bg-gradient-to-br from-purple-400 to-purple-600 text-white p-4 rounded-xl">
                <div className="text-2xl font-bold">
                  ฿{dailyReportData.avgOrderValue.toFixed(0)}
                </div>
                <div className="text-purple-100">ยอดเฉลี่ยต่อออเดอร์</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="font-bold text-lg mb-3">สถานะออเดอร์</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>เสร็จสิ้น:</span>
                    <span className="font-semibold text-green-600">
                      {dailyReportData.completedOrders}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>รอดำเนินการ:</span>
                    <span className="font-semibold text-yellow-600">
                      {dailyReportData.pendingOrders}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ยกเลิก:</span>
                    <span className="font-semibold text-red-600">
                      {dailyReportData.cancelledOrders}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl">
                <h4 className="font-bold text-lg mb-3">วิธีการชำระเงิน</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>เงินสด:</span>
                    <span className="font-semibold text-green-600">
                      ฿{dailyReportData.cashRevenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>QR Code:</span>
                    <span className="font-semibold text-blue-600">
                      ฿{dailyReportData.qrRevenue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow transition font-semibold"
                onClick={printDailyReport}>
                ปริ้นรายงาน
              </button>
              <button
                className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-6 py-3 rounded-xl shadow transition font-semibold"
                onClick={() => setShowDailyReport(false)}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// เพิ่มใน orderApi.ts หรือในไฟล์ API ที่เกี่ยวข้อง
export const cleanupOrdersWithDeletedMenus = async () => {
  try {
    const response = await api.post("/orders/cleanup-deleted-menus");
    return response.data;
  } catch (error) {
    console.error("Error cleaning up orders:", error);
    throw error;
  }
};
