import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

interface MenuItem {
  id: number;
  restaurant_id: number;
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
}

interface Props {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

const categories = ["ทั้งหมด", "อาหารจานเดียว", "เส้น", "ซุป", "เครื่องดื่ม", "ของหวาน"];

export default function OrderFoodPage({ cart, setCart }: Props) {
  const { table_number } = useParams<{ table_number: string }>();
  const navigate = useNavigate();

  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [filteredMenus, setFilteredMenus] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clickedMenuIds, setClickedMenuIds] = useState<number[]>([]);

  // drag scroll
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragDistance, setDragDistance] = useState(0);

  const fetchMenus = async () => {
    try {
      const token = localStorage.getItem("jwtToken");
      const response = await axios.get("http://localhost:5000/api/menus", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const menuData: MenuItem[] = response.data;
      setMenus(menuData);
      setFilteredMenus(menuData);
    } catch (err) {
      setError("ไม่สามารถโหลดเมนูได้ กรุณาตรวจสอบเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  useEffect(() => {
    if (selectedCategory === "ทั้งหมด") {
      setFilteredMenus(menus);
    } else {
      setFilteredMenus(menus.filter((menu) => menu.category === selectedCategory));
    }
  }, [selectedCategory, menus]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
    setDragDistance(0);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = (x - startX) * 1;
    setDragDistance(Math.abs(walk));
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleCardClick = (menu: MenuItem) => {
    if (dragDistance > 10) return;
    addToCart(menu);
  };

  const addToCart = (menuItem: MenuItem) => {
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
        },
      ]);
    }

    setClickedMenuIds((prev) => [...prev, menuItem.id]);
    setTimeout(() => {
      setClickedMenuIds((prev) => prev.filter((id) => id !== menuItem.id));
    }, 500);
  };

  if (loading) return <div className="p-4 text-center">กำลังโหลดเมนู...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col max-w-screen-lg mx-auto text-gray-900">

  {/* แถวบน สำหรับปุ่มย้อนกลับ + ปุ่ม Cart */}
  <div className="flex justify-between items-start mb-4">
    {/* ปุ่มย้อนกลับ */}
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-2 px-4 py-2 bg-[#FFB566] text-gray-100 font-semibold rounded-lg hover:bg-[#FFA559] transition"
    >
      ← กลับ
    </button>

    {/* ปุ่ม Cart */}
    <button
      onClick={() => navigate(`/cart/${table_number}`)}
      className="flex items-center gap-2 bg-[#FF6500] text-gray-100 font-semibold px-4 py-2 rounded-full shadow-lg hover:bg-[#FFA559] transition"
    >
      <span>Cart</span>
      {cart.length > 0 && (
        <span className="bg-[#1E3E62] text-[#FF6500] px-2 py-1 rounded-full text-sm font-bold">
          {cart.length}
        </span>
      )}
    </button>
  </div>

  <h1 className="text-3xl font-bold text-center mb-6 text-[#FF6500]">
    สั่งอาหารสำหรับโต๊ะ #{table_number}
  </h1>

  {/* ปุ่มหมวดหมู่ */}
  <div className="flex justify-center gap-3 mb-8 overflow-x-auto pb-2 max-w-full">
    {categories.map((cat) => (
      <button
        key={cat}
        className={`whitespace-nowrap px-5 py-2 rounded-full border ${selectedCategory === cat
          ? "bg-[#FF6500] text-gray-900 font-bold border-[#FF6500]"
          : "bg-[#1E3E62] text-gray-100 font-bold border-[#1E3E62]"
          } hover:bg-[#FFA559] hover:border-[#FFA559] hover:text-gray-900 transition`}
        onClick={() => setSelectedCategory(cat)}
      >
        {cat}
      </button>
    ))}
  </div>

  {/* แนวนอนลากได้ */}
  <div
    ref={scrollRef}
    onMouseDown={handleMouseDown}
    onMouseLeave={handleMouseLeave}
    onMouseUp={handleMouseUp}
    onMouseMove={handleMouseMove}
    className="relative overflow-x-auto cursor-grab active:cursor-grabbing select-none pb-4 touch-pan-x"
  >
    <div className="grid grid-flow-col auto-cols-[150px] grid-rows-2 gap-4">
      {filteredMenus.map((menu) => (
        <div
          key={menu.id}
          onClick={() => handleCardClick(menu)}
          className={`w-[150px] h-[200px] bg-[#FFA559] rounded-lg shadow-md hover:shadow-lg transition-transform transform relative flex-shrink-0 flex flex-col ${clickedMenuIds.includes(menu.id) ? "scale-105" : "hover:scale-105"}`}
        >
          <img
            src={menu.image_url || "https://via.placeholder.com/400x300"}
            alt={menu.name}
            className="w-full h-25 object-cover rounded-t-lg"
            draggable={false}
          />
          <div className="p-2 flex-1 flex flex-col">
            <div>
              <h3 className="text-sm font-bold text-[#000000] line-clamp-1">{menu.name}</h3>
              <p className="text-[#000000] text-xs font-medium line-clamp-2">{menu.description}</p>
            </div>
            
            <div className="mt-auto flex justify-end">
              <span className="text-sm font-extrabold text-[#26355D]">
                ฿{parseFloat(menu.base_price).toFixed(2)}
              </span>
            </div>
          </div>
          
          {clickedMenuIds.includes(menu.id) && (
            <div className="absolute top-1 right-1 bg-[#FF6500] text-gray-900 px-1 py-0.5 rounded animate-pulse text-xs">
              เพิ่มแล้ว!
            </div>
          )}
        </div>
      ))}
    </div>

  </div>
</div>





  );
}
