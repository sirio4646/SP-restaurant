import { useNavigate, useParams } from "react-router-dom";
import api from "../../utils/axiosConfig";
import type { CartItem } from "./OrderFoodPage";
import {
  ArrowLeft,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
} from "lucide-react";

interface Props {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export default function CartPage({ cart, setCart }: Props) {
  const navigate = useNavigate();
  const { table_number } = useParams<{ table_number: string }>();
  const parsedTableNumber = Number(table_number);

  const updateItem = (menu_id: number, quantity: number, notes: string) => {
    setCart(
      cart.map((item) =>
        item.menu_id === menu_id ? { ...item, quantity, notes } : item
      )
    );
  };

  const removeFromCart = (menu_id: number) => {
    setCart(cart.filter((item) => item.menu_id !== menu_id));
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.quantity * item.price_at_order,
    0
  );
  const getTotalItems = () =>
    cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert("ตะกร้าว่าง! กรุณาเลือกอาหารก่อนชำระเงิน");
      return;
    }

    try {
      const orderData = {
        table_number: parsedTableNumber,
        total_amount: Number(totalAmount.toFixed(2)),
        status: "pending",
        payment_status: "unpaid",
        items: cart.map((item) => ({
          menu_id: item.menu_id,
          quantity: item.quantity,
          price_at_order: item.price_at_order,
          notes: item.notes || "",
        })),
      };

      const response = await api.post("/orders", orderData);

      if (response.data?.order_id) {
        setCart([]);
        alert("ออเดอร์ถูกสร้างแล้ว");
        navigate(`/payment/${response.data.order_id}`);
      } else {
        alert("สร้างออเดอร์ไม่สำเร็จ กรุณาลองอีกครั้ง");
      }
    } catch (err: any) {
      console.error("Checkout error:", err.response?.data || err);
      alert(
        err.response?.status === 401
          ? "กรุณา login ก่อนสั่งอาหาร"
          : "สร้างออเดอร์ไม่สำเร็จ กรุณาลองอีกครั้ง"
      );
    }
  };

  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] p-6 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all hover:scale-105 shadow-lg">
              <ArrowLeft size={20} />
              กลับ
            </button>

            <div className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-xl">
              <ShoppingCart size={20} />
              <span className="font-semibold">โต๊ะ #{parsedTableNumber}</span>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              ตะกร้าสินค้า
            </h1>
            <div className="text-white/90">
              {cart.length > 0 ? `${getTotalItems()} รายการ` : "ยังไม่มีสินค้า"}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 pb-32">
        {cart.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-lg text-center">
            <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-600 mb-2">
              ตะกร้าว่างเปล่า
            </h2>
            <p className="text-gray-500 mb-6">
              เพิ่มอาหารลงในตะกร้าเพื่อเริ่มสั่งอาหาร
            </p>
            <button
              onClick={() => navigate(`/order/${table_number}`)}
              className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-6 py-3 rounded-xl font-semibold transition-all transform hover:scale-105 shadow-lg">
              เลือกอาหาร
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={item.menu_id}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* รูปอาหาร */}
                  <div className="flex-shrink-0">
                    <img
                      src={item.image_url || "https://via.placeholder.com/120"}
                      alt={item.name}
                      className="w-full md:w-28 h-28 rounded-xl object-cover"
                    />
                  </div>

                  {/* ข้อมูลอาหาร */}
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-1">
                        {item.name}
                      </h3>
                      <div className="text-lg font-semibold text-[#FF6500]">
                        ฿{item.price_at_order.toFixed(0)} / รายการ
                      </div>
                    </div>

                    {/* หมายเหตุ */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        หมายเหตุ
                      </label>
                      <input
                        type="text"
                        value={item.notes}
                        placeholder="เช่น ไม่เผ็ด, ไม่ใส่ผักชี"
                        onChange={(e) =>
                          updateItem(
                            item.menu_id,
                            item.quantity,
                            e.target.value
                          )
                        }
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
                      />
                    </div>

                    {/* จำนวนและปุ่มลบ */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">
                          จำนวน:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              updateItem(
                                item.menu_id,
                                Math.max(item.quantity - 1, 1),
                                item.notes
                              )
                            }
                            className="w-10 h-10 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white rounded-xl flex items-center justify-center transition-all transform hover:scale-105 shadow-lg">
                            <Minus size={16} />
                          </button>

                          {/* เปลี่ยนจาก div เป็น input */}
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Math.max(Number(e.target.value), 1);
                              updateItem(item.menu_id, val, item.notes);
                            }}
                            className="w-16 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-800 text-center border border-gray-300"
                            style={{ appearance: "textfield" }}
                          />

                          <button
                            onClick={() =>
                              updateItem(
                                item.menu_id,
                                item.quantity + 1,
                                item.notes
                              )
                            }
                            className="w-10 h-10 bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white rounded-xl flex items-center justify-center transition-all transform hover:scale-105 shadow-lg">
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">
                            ฿{(item.quantity * item.price_at_order).toFixed(0)}
                          </div>
                          <div className="text-sm text-gray-500">รวม</div>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.menu_id)}
                          className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl flex items-center justify-center transition-all transform hover:scale-105 shadow-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* สรุปรายการ */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-[#FF6500]/20">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                สรุปรายการ
              </h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>จำนวนรายการ</span>
                  <span>{getTotalItems()} รายการ</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ยอดรวม</span>
                  <span>฿{totalAmount.toFixed(0)}</span>
                </div>
              </div>
              <div className="border-t-2 border-gray-200 pt-4">
                <div className="flex justify-between items-center text-xl font-bold text-gray-800">
                  <span>ยอดรวมทั้งสิ้น</span>
                  <span className="text-[#FF6500]">
                    ฿{totalAmount.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 p-4 shadow-2xl z-50">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-gray-600">ยอดรวมทั้งสิ้น</span>
                <span className="text-2xl font-bold text-[#FF6500]">
                  ฿{totalAmount.toFixed(0)}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-xl flex items-center gap-2">
                <CreditCard size={24} />
                ชำระเงิน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
