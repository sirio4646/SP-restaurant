import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../utils/axiosConfig";
import { Check, X } from "lucide-react";

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
  table_number: number;
  total_amount: string;
  status: string;
  payment_status: string;
  items: OrderItem[];
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

  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

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

  const updatePaymentStatus = async (id: number, payment_status: string) => {
    try {
      await api.patch(`/orders/${id}`, { payment_status });
      fetchOrders();
    } catch (err) {
      console.error("Failed to update payment status:", err);
    }
  };

  const handleLogout = () => {
    ["jwtToken", "username", "role", "restaurant_id"].forEach((key) =>
      localStorage.removeItem(key)
    );
    logout();
    navigate("/login");
  };

  const handleActionClick = (order: Order, action: string) => {
    setOrderToConfirm(order);
    setActionToConfirm(action);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    if (!orderToConfirm || !actionToConfirm) return;

    if (actionToConfirm === "payment_received") {
      updatePaymentStatus(orderToConfirm.id, "paid");
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

  useEffect(() => {
    fetchOrders();
  }, []);

  const stats = getOrderStats();

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#FF6500]">จัดการออเดอร์</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl shadow transition">
          Logout
        </button>
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
                    <span className="text-gray-600">ยอดรวม:</span>
                    <span className="font-bold text-lg text-gray-800">
                      ฿{order.total_amount}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">การชำระ:</span>
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
                  </div>
                </div>

                <button
                  className="w-full bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-4 py-2 rounded-xl shadow transition font-semibold"
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
                  onClick={() =>
                    handleActionClick(selectedOrder, "payment_received")
                  }>
                  <Check size={16} />
                  {selectedOrder.payment_status === "pending_verification"
                    ? "ยืนยันการชำระ QR"
                    : "ยืนยันรับเงินสด"}
                </button>
              )}

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
    </div>
  );
}
