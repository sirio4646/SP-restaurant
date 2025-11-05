import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../utils/axiosConfig";
import { ArrowLeft, ShoppingCart, ChefHat } from "lucide-react";

interface MenuItem {
  id: number;
  name: string;
  description: string;
  base_price: string;
  category: string;
  image_url: string;
  is_available: boolean;
}

export interface CartItem {
  menu_id: number;
  name: string;
  quantity: number;
  price_at_order: number;
  notes: string;
  image_url?: string;
  table_number?: number;
}

interface Props {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

const categories = [
  "ทั้งหมด",
  "อาหารจานเดียว",
  "เส้น",
  "แกง",
  "เครื่องดื่ม",
  "ของหวาน",
];

export default function OrderFoodPage({ cart, setCart }: Props) {
  const { table_number } = useParams<{ table_number: string }>();
  const navigate = useNavigate();

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [filteredMenus, setFilteredMenus] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clickedMenuIds, setClickedMenuIds] = useState<number[]>([]);

  // Drag scroll states
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragDistance, setDragDistance] = useState(0);

  const fetchMenus = async () => {
    try {
      const response = await api.get("/menus");
      setMenus(response.data);
      setFilteredMenus(response.data);
    } catch (err: any) {
      setError(
        err.response?.status === 401
          ? "กรุณา login ก่อนใช้งาน"
          : "ไม่สามารถโหลดเมนูได้ กรุณาตรวจสอบเซิร์ฟเวอร์"
      );
    } finally {
      setLoading(false);
    }
  };

  const clearCartIfDifferentTable = () => {
    const currentTableNumber = Number(table_number);
    const hasItemsFromDifferentTable = cart.some(
      (item) => item.table_number && item.table_number !== currentTableNumber
    );
    if (hasItemsFromDifferentTable) setCart([]);
  };

  const filterMenusByCategory = () => {
    setFilteredMenus(
      selectedCategory === "ทั้งหมด"
        ? menus
        : menus.filter((menu) => menu.category === selectedCategory)
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
    setDragDistance(0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = x - startX;
    setDragDistance(Math.abs(walk));
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseEnd = () => setIsDragging(false);

  const handleCardClick = (menu: MenuItem) => {
    if (dragDistance > 10 || !menu.is_available) return;
    addToCart(menu);
  };

  const addToCart = (menuItem: MenuItem) => {
    if (!menuItem.is_available) return;

    const currentTableNumber = Number(table_number);
    const existingItem = cart.find((item) => item.menu_id === menuItem.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.menu_id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          menu_id: menuItem.id,
          name: menuItem.name,
          quantity: 1,
          price_at_order: parseFloat(menuItem.base_price),
          notes: "",
          image_url: menuItem.image_url,
          table_number: currentTableNumber,
        },
      ]);
    }

    // Show feedback animation
    setClickedMenuIds((prev) => [...prev, menuItem.id]);
    setTimeout(() => {
      setClickedMenuIds((prev) => prev.filter((id) => id !== menuItem.id));
    }, 500);
  };

  const getTotalItems = () =>
    cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    clearCartIfDifferentTable();
  }, [table_number, cart, setCart]);

  useEffect(() => {
    filterMenusByCategory();
  }, [selectedCategory, menus]);

  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex justify-center items-center"
        style={{ fontFamily: "Carlito, sans-serif" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#FF6500] border-t-transparent mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">กำลังโหลดเมนู...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen bg-gray-50 flex justify-center items-center p-6"
        style={{ fontFamily: "Carlito, sans-serif" }}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-2xl text-center">
          <div className="font-bold text-lg mb-2">เกิดข้อผิดพลาด</div>
          <div>{error}</div>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchMenus();
            }}
            className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition">
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] p-6 shadow-lg">
        <div className="max-w-screen-lg mx-auto">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all hover:scale-105 shadow-lg">
              <ArrowLeft size={20} />
              กลับ
            </button>

            <button
              onClick={() => navigate(`/cart/${table_number}`)}
              className="relative flex items-center gap-2 bg-white text-[#FF6500] font-semibold px-6 py-3 rounded-xl shadow-lg hover:bg-gray-100 transition-all hover:scale-105">
              <ShoppingCart size={20} />
              ตรวจสอบออเดอร์
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-sm flex items-center justify-center font-bold">
                  {getTotalItems()}
                </span>
              )}
            </button>
          </div>

          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              เมนูอาหาร
            </h1>
            <div className="flex items-center justify-center gap-2 text-white/90">
              <ChefHat size={18} />
              <span className="text-lg">โต๊ะ #{table_number}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-lg mx-auto p-6">
        {/* Category Filter */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            เลือกประเภทอาหาร
          </h2>
          <div className="flex justify-center">
            <div className="bg-white rounded-2xl p-2 shadow-lg inline-flex gap-2 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`whitespace-nowrap px-6 py-3 rounded-xl font-semibold transition-all transform ${
                    selectedCategory === cat
                      ? "bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white shadow-lg scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                  }`}
                  onClick={() => setSelectedCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {selectedCategory === "ทั้งหมด"
                ? "เมนูทั้งหมด"
                : selectedCategory}
            </h2>
            <div className="text-sm text-gray-600">
              {filteredMenus.length} รายการ
            </div>
          </div>

          {filteredMenus.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">
                ไม่มีเมนูในหมวดหมู่นี้
              </div>
            </div>
          ) : (
            <div
              ref={scrollRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseEnd}
              onMouseUp={handleMouseEnd}
              onMouseMove={handleMouseMove}
              className="overflow-x-auto cursor-grab active:cursor-grabbing select-none pb-4">
              <div className="grid grid-flow-col auto-cols-[160px] gap-3 pb-2">
                {filteredMenus.map((menu) => (
                  <div
                    key={menu.id}
                    onClick={() => handleCardClick(menu)}
                    className={`relative w-[160px] bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 overflow-hidden cursor-pointer flex flex-col ${
                      clickedMenuIds.includes(menu.id)
                        ? "scale-110 shadow-2xl"
                        : ""
                    } ${
                      !menu.is_available ? "opacity-60 cursor-not-allowed" : ""
                    }`}>
                    <div className="relative">
                      <img
                        src={
                          menu.image_url ||
                          "https://via.placeholder.com/400x300"
                        }
                        alt={menu.name}
                        className="w-full h-24 object-cover"
                        draggable={false}
                      />
                      {!menu.is_available && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            หมด
                          </span>
                        </div>
                      )}
                      {clickedMenuIds.includes(menu.id) && (
                        <div className="absolute top-1 right-1 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-bounce">
                          เพิ่มแล้ว!
                        </div>
                      )}
                    </div>

                    <div className="p-3 flex flex-col flex-1">
                      <h3 className="font-bold text-gray-800 text-xs mb-1 line-clamp-1">
                        {menu.name}
                      </h3>

                      {menu.description && (
                        <p className="text-gray-600 text-xs mb-2 line-clamp-2 flex-1">
                          {menu.description}
                        </p>
                      )}

                      <div className="text-center mb-2">
                        <div className="text-base font-bold text-[#FF6500]">
                          ฿{parseFloat(menu.base_price).toFixed(0)}
                        </div>
                      </div>

                      {menu.is_available && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(menu);
                          }}
                          className="w-full bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white py-1.5 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg text-xs mt-auto">
                          เพิ่มลงตะกร้า
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
