import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/axiosConfig";
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  QrCode,
  X,
  CheckCircle2,
} from "lucide-react";

interface Order {
  id: number;
  total_amount: string;
  payment_status: string;
}

export default function PaymentPage() {
  const { order_id } = useParams<{ order_id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"qrcode" | "cash" | null>(null);
  const [generatedQrCodeUrl, setGeneratedQrCodeUrl] = useState<string | null>(
    null
  );
  const [showQrPopup, setShowQrPopup] = useState(false);

  const fetchOrder = async () => {
    if (!order_id) {
      setError("order_id ไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    try {
      const response = await api.get(`/orders/${order_id}`);
      setOrder(response.data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setError("กรุณา login ก่อนใช้งาน");
      } else {
        setError("ไม่สามารถดึงข้อมูลออเดอร์ได้");
      }
    } finally {
      setLoading(false);
    }
  };

  // แก้ไขฟังก์ชัน handleCashPayment
  const handleCashPayment = async () => {
    try {
      await api.patch(`/orders/${order?.id}`, {
        payment_status: "paid",
        payment_method: "cash",
        qr_code_url: null,
      });
      navigate("/payment-success");
    } catch (err) {
      console.error("Failed to process cash payment:", err);
      alert("เกิดข้อผิดพลาดในการชำระเงิน");
    }
  };

  // แก้ไขฟังก์ชัน handleManualConfirm
  const handleManualConfirm = async () => {
    if (!order || !generatedQrCodeUrl) {
      alert("ไม่พบข้อมูลออเดอร์หรือ QR Code");
      return;
    }

    try {
      await api.patch(`/orders/${order.id}`, {
        payment_status: "pending_verification",
        payment_method: "qr_code",
        qr_code_url: generatedQrCodeUrl,
      });
      setShowQrPopup(false);
      navigate("/payment-success");
    } catch (err) {
      console.error("Failed to process QR payment:", err);
      alert("เกิดข้อผิดพลาดในการชำระเงิน");
    }
  };

  // แก้ไขฟังก์ชัน confirmPayment
  const confirmPayment = () => {
    if (!order || !method) return;

    if (method === "cash") {
      handleCashPayment();
    } else if (method === "qrcode") {
      const promptPayId = "0910762733";
      const totalAmountNumber = parseFloat(order.total_amount);
      const url = `https://promptpay.io/${promptPayId}/${totalAmountNumber.toFixed(
        2
      )}.png`;
      setGeneratedQrCodeUrl(url);
      setShowQrPopup(true);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [order_id]);

  if (loading) {
    return (
      <div
        className="flex justify-center items-center min-h-screen bg-gray-50"
        style={{ fontFamily: "Carlito, sans-serif" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#FF6500] border-t-transparent mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">
            กำลังโหลดข้อมูลการชำระเงิน...
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div
        className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-6"
        style={{ fontFamily: "Carlito, sans-serif" }}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-2xl text-center">
          <div className="font-bold text-lg mb-2">เกิดข้อผิดพลาด</div>
          <div>{error || "ไม่พบออเดอร์"}</div>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchOrder();
            }}
            className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition">
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  const totalAmountNumber = parseFloat(order.total_amount);

  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] p-6 shadow-lg">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all hover:scale-105 shadow-lg mb-4">
            <ArrowLeft size={20} />
            กลับ
          </button>

          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              ชำระเงิน
            </h1>
            <div className="flex items-center justify-center gap-2 text-white/90">
              <CreditCard size={18} />
              <span className="text-lg">Order #{order.id}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-6">
        {/* ยอดเงิน */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 text-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            ยอดชำระทั้งหมด
          </h2>
          <div className="text-4xl font-bold text-[#FF6500] mb-4">
            ฿{totalAmountNumber.toFixed(0)}
          </div>
          <div className="text-sm text-gray-500">รวมภาษีและค่าบริการ</div>
        </div>

        {/* วิธีการชำระเงิน */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <h3 className="text-xl font-bold text-gray-800 mb-6">
            เลือกวิธีการชำระเงิน
          </h3>

          <div className="space-y-4">
            {/* QR Code พร้อมเพย์ */}
            <div
              className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all transform ${
                method === "qrcode"
                  ? "border-[#FF6500] bg-gradient-to-br from-[#FFF2E0] to-white shadow-lg scale-[1.02]"
                  : "border-gray-300 hover:border-[#FFB347] hover:shadow-md hover:scale-[1.01]"
              }`}
              onClick={() => setMethod("qrcode")}>
              <div className="flex items-center gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    method === "qrcode" ? "border-[#FF6500]" : "border-gray-400"
                  }`}>
                  {method === "qrcode" && (
                    <div className="w-3 h-3 bg-[#FF6500] rounded-full"></div>
                  )}
                </div>

                <div className="p-3 bg-blue-100 rounded-xl">
                  <QrCode size={24} className="text-blue-600" />
                </div>

                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">QR พร้อมเพย์</h4>
                  <p className="text-sm text-gray-600">
                    สแกน QR Code เพื่อชำระเงิน
                  </p>
                </div>

                {method === "qrcode" && (
                  <CheckCircle2 size={24} className="text-[#FF6500]" />
                )}
              </div>
            </div>

            {/* เงินสด */}
            <div
              className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all transform ${
                method === "cash"
                  ? "border-[#FF6500] bg-gradient-to-br from-[#FFF2E0] to-white shadow-lg scale-[1.02]"
                  : "border-gray-300 hover:border-[#FFB347] hover:shadow-md hover:scale-[1.01]"
              }`}
              onClick={() => setMethod("cash")}>
              <div className="flex items-center gap-4">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    method === "cash" ? "border-[#FF6500]" : "border-gray-400"
                  }`}>
                  {method === "cash" && (
                    <div className="w-3 h-3 bg-[#FF6500] rounded-full"></div>
                  )}
                </div>

                <div className="p-3 bg-green-100 rounded-xl">
                  <Banknote size={24} className="text-green-600" />
                </div>

                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">เงินสด</h4>
                  <p className="text-sm text-gray-600">ชำระเงินสดที่หน้าร้าน</p>
                </div>

                {method === "cash" && (
                  <CheckCircle2 size={24} className="text-[#FF6500]" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ปุ่มชำระเงิน */}
        <div className="space-y-3">
          <button
            disabled={!method}
            onClick={confirmPayment}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform ${
              method
                ? "bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white shadow-lg hover:scale-105"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}>
            {method === "qrcode"
              ? "สร้าง QR Code"
              : method === "cash"
              ? "ยืนยันการสั่ง"
              : "เลือกวิธีชำระเงิน"}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-all">
            ยกเลิก
          </button>
        </div>
      </div>

      {/* QR Code Popup */}
      {showQrPopup && generatedQrCodeUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#FF6500]">
                สแกนเพื่อชำระเงิน
              </h3>
              <button
                onClick={() => setShowQrPopup(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} className="text-gray-500" />
              </button>
            </div>

            <div className="text-center mb-4">
              <div className="text-sm text-gray-600 mb-2">
                Order #{order.id}
              </div>
              <div className="text-2xl font-bold text-[#FF6500]">
                ฿{totalAmountNumber.toFixed(0)}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <img
                src={generatedQrCodeUrl}
                alt="PromptPay QR"
                className="mx-auto w-48 h-48 object-cover rounded-lg"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={handleManualConfirm}
                className="w-full py-3 bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white rounded-xl font-semibold transition-all">
                ยืนยันการชำระเงิน
              </button>
              <button
                onClick={() => setShowQrPopup(false)}
                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-all">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const processPayment = async (
  orderId: number,
  paymentMethod: string,
  qrCodeUrl?: string
) => {
  try {
    const response = await api.post(`/orders/${orderId}/payment`, {
      payment_method: paymentMethod,
      qr_code_url: qrCodeUrl,
    });
    return response.data;
  } catch (error) {
    console.error("Error processing payment:", error);
    throw error;
  }
};
