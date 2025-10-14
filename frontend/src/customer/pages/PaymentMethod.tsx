import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "../../store/authStore";

interface Order {
  id: number;
  total_amount: string;
  payment_status: string;
}

export default function PaymentPage() {
  const { order_id } = useParams<{ order_id: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<"qrcode" | "cash" | null>(null);
  const [generatedQrCodeUrl, setGeneratedQrCodeUrl] = useState<string | null>(null);
  const [showQrPopup, setShowQrPopup] = useState(false);

  // ดึงข้อมูล order
  const fetchOrder = async () => {
    if (!token || !order_id) {
      setError("คุณยังไม่ได้ login หรือ order_id ไม่ถูกต้อง");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:5000/api/orders/${order_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setOrder(response.data);
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถดึงข้อมูลออเดอร์ได้ หรือออเดอร์ไม่ใช่ของร้านคุณ");
    } finally {
      setLoading(false);
    }
  };

  // จ่ายเงินสด → redirect เลย
  const handleCashPayment = () => {
    alert("ออเดอร์ถูกสร้างแล้ว");
    navigate("/payment-success");
  };

  // ยืนยันการชำระเงิน
  const confirmPayment = () => {
    if (!order || !method) return;

    if (method === "cash") {
      handleCashPayment();
    } else if (method === "qrcode") {
      const promptPayId = "0909634366"; // TODO: เปลี่ยนเป็น env
      const totalAmountNumber = parseFloat(order.total_amount);
      const url = `https://promptpay.io/${promptPayId}/${totalAmountNumber.toFixed(2)}.png`;
      setGeneratedQrCodeUrl(url);
      setShowQrPopup(true);

      // Polling ตรวจสอบ payment_status ทุก 3 วินาที
      const interval = setInterval(async () => {
        try {
          const res = await axios.get(
            `http://localhost:5000/api/orders/${order.id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.data.payment_status === "paid") {
            clearInterval(interval);
            setShowQrPopup(false);
            navigate("/payment-success");
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [order_id, token]);

  if (loading)
    return (
      <div className="flex justify-center items-center min-h-screen text-lg font-semibold">
        กำลังโหลด...
      </div>
    );

  if (error || !order)
    return (
      <div className="flex justify-center items-center min-h-screen text-red-500 text-lg font-semibold">
        {error || "ไม่พบออเดอร์"}
      </div>
    );

  const totalAmountNumber = parseFloat(order.total_amount);

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center font-sans text-gray-800">

  {/* ปุ่มย้อนกลับ */}
  <button
    onClick={() => navigate(-1)}
    className="self-start mb-4 flex items-center gap-2 px-4 py-2 bg-[#FFB566] text-white rounded-lg hover:bg-[#FFA559] transition"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-6 h-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
      />
    </svg>
    กลับ
  </button>

  <div className="bg-white shadow-xl rounded-3xl p-8 w-full max-w-lg">
    <h2 className="text-2xl font-bold mb-6 text-center text-[#FF6500]">ชำระเงิน</h2>

    <div className="mb-8 text-center">
      <p className="text-lg font-medium">ยอดชำระทั้งหมด</p>
      <p className="text-3xl font-extrabold text-[#FF6500] mt-2">
        ฿{totalAmountNumber.toFixed(2)}
      </p>
    </div>

    <div className="grid grid-cols-1 gap-6">
      {/* QR Code */}
      <div
        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all transform
        ${method === "qrcode"
            ? "border-[#FF6500] bg-[#FFF2E0] shadow-md scale-[1.02]"
            : "border-gray-300 hover:border-[#FFB566] hover:shadow-sm hover:scale-[1.01]"}`
        }
        onClick={() => setMethod("qrcode")}
      >
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4
        ${method === "qrcode" ? "border-[#FF6500]" : "border-gray-400"}`}>
          {method === "qrcode" && <div className="w-2.5 h-2.5 bg-[#FF6500] rounded-full"></div>}
        </div>

        <div className="flex items-center gap-3">
          <img
            src="https://www.bot.or.th/content/dam/bot/icons/icon-thaiqr.png"
            alt="QR Code"
            className="w-10 h-10 object-contain"
          />
          <p className="text-lg font-medium text-gray-800">QR พร้อมเพย์</p>
        </div>
      </div>

      {/* Cash */}
      <div
        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all
        ${method === "cash"
            ? "border-[#FF6500] bg-[#FFF2E0] shadow-md scale-[1.02]"
            : "border-gray-300 hover:border-[#FFB566] hover:shadow-sm hover:scale-[1.01]"}`
        }
        onClick={() => setMethod("cash")}
      >
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-4
        ${method === "cash" ? "border-[#FF6500]" : "border-gray-400"}`}>
          {method === "cash" && <div className="w-2.5 h-2.5 bg-[#FF6500] rounded-full"></div>}
        </div>

        <div className="flex items-center gap-3">
          <img
            src="https://static.vecteezy.com/system/resources/previews/040/137/950/non_2x/minimalist-money-logo-design-template-cash-money-for-business-finance-money-investing-logo-vector.jpg"
            alt="Cash"
            className="w-10 h-10 object-contain rounded-md"
          />
          <p className="text-lg font-medium text-gray-800">เงินสด</p>
        </div>
      </div>
    </div>

    <div className="mt-8 flex justify-center gap-6">
      <button
        className="px-6 py-3 bg-[#FFB566] text-white rounded-xl font-medium hover:bg-[#FFA559] transition"
        onClick={() => navigate(-1)}
      >
        ยกเลิก
      </button>
      <button
        disabled={!method}
        onClick={confirmPayment}
        className={`px-6 py-3 rounded-xl font-medium transition ${
          method
            ? "bg-[#FF6500] text-white hover:bg-[#FFA559]"
            : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        ชำระเงิน
      </button>
    </div>
  </div>

  {/* QR Code Popup */}
  {showQrPopup && generatedQrCodeUrl && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-xl p-6 w-80 text-center">
        <h3 className="text-xl font-bold mb-4 text-[#FF6500]">สแกนเพื่อชำระเงิน</h3>
        <p className="text-gray-600 mb-2">
          Order ID: {order.id} | ยอดเงิน: ฿{totalAmountNumber.toFixed(2)}
        </p>
        <img
          src={generatedQrCodeUrl}
          alt="PromptPay QR"
          className="mx-auto mb-4 w-48 h-48 object-cover"
        />
        <button
          className="px-6 py-2 bg-[#FF6500] text-white rounded-xl hover:bg-[#FFA559] transition"
          onClick={() => setShowQrPopup(false)}
        >
          ปิด
        </button>
      </div>
    </div>
  )}
</div>

  );
}
