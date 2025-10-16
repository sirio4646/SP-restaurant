import { useNavigate } from "react-router-dom";
import { CheckCircle2, Home } from "lucide-react";

export default function PaymentSuccess() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-gray-50 flex items-center justify-center p-6"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle2 size={48} className="text-white" />
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          ชำระเงินสำเร็จ!
        </h1>

        {/* Details */}
        <div className="bg-green-50 rounded-xl p-4 mb-6">
          <p className="text-gray-700">
            ขอบคุณที่ใช้บริการ ระบบได้บันทึกการชำระเงินของคุณเรียบร้อยแล้ว
            <br />
            <span className="font-semibold text-green-700">
              กรุณารอการเสิร์ฟอาหาร
            </span>
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate("/")}
          className="w-full bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2">
          <Home size={20} />
          กลับไปหน้าหลัก
        </button>
      </div>
    </div>
  );
}
