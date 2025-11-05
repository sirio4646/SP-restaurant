import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../utils/axiosConfig";
import {
  Package,
  Plus,
  AlertTriangle,
  Edit,
  Trash2,
  Calendar,
  X,
  Save,
  ArrowLeft,
  Search,
  SortAsc,
  SortDesc,
} from "lucide-react";

interface Ingredient {
  id: number;
  name: string;
  minimum_stock: number;
  total_stock: number;
  batch_count: number;
  supplier_info?: string;
  description?: string;
  // unit is derived from stocks (most recent / available lot)
  unit?: string;
}

interface Stock {
  id: number;
  ingredient_id: number;
  ingredient_name: string;
  quantity: number;
  received_date: string;
  expiry_date?: string;
  purchase_price?: number;
  supplier?: string;
  unit?: string; // added unit
  status: "fresh" | "near_expiry" | "expired" | "used_up";
  notes?: string;
}

// เพิ่ม interface สำหรับ form data
interface NewIngredient {
  name: string;
  minimum_stock: string;
  supplier_info: string;
  description: string;
}

interface NewStock {
  ingredient_id: string;
  unit: string;
  quantity: string;
  received_date: string;
  expiry_date: string;
  purchase_price: string;
  supplier: string;
  notes: string;
}

// เพิ่ม helper functions ก่อน component
const formatNumber = (num: any): number => {
  const parsed = Number(num);
  return isNaN(parsed) ? 0 : parsed;
};

export default function StockManagementPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // เปลี่ยนจาก modal states เป็น view states
  const [currentView, setCurrentView] = useState<
    "main" | "add-ingredient" | "add-stock"
  >("main");

  const [viewMode, setViewMode] = useState<"ingredients" | "stock">(
    "ingredients"
  );

  // เพิ่ม states สำหรับ forms
  const [newIngredient, setNewIngredient] = useState<NewIngredient>({
    name: "",
    minimum_stock: "",
    supplier_info: "",
    description: "",
  });

  const [newStock, setNewStock] = useState<NewStock>({
    ingredient_id: "",
    unit: "",
    quantity: "",
    received_date: "",
    expiry_date: "",
    purchase_price: "",
    supplier: "",
    notes: "",
  });

  // เพิ่ม states สำหรับ edit mode
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null
  );
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [showEditIngredient, setShowEditIngredient] = useState(false);
  const [showEditStock, setShowEditStock] = useState(false);

  // เพิ่ม states สำหรับ edit forms
  const [editIngredientForm, setEditIngredientForm] = useState<NewIngredient>({
    name: "",
    minimum_stock: "",
    supplier_info: "",
    description: "",
  });

  const [editStockForm, setEditStockForm] = useState<NewStock>({
    ingredient_id: "",
    unit: "",
    quantity: "",
    received_date: "",
    expiry_date: "",
    purchase_price: "",
    supplier: "",
    notes: "",
  });

  // เพิ่ม states สำหรับการกรองและค้นหา
  const [searchTerm, setSearchTerm] = useState("");
  // price sort removed (no unit_cost on ingredients)
  const [sortBy, setSortBy] = useState<"name" | "stock">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const navigate = useNavigate();

  // เพิ่ม functions สำหรับกรองและเรียงข้อมูล ภายใน component
  const getFilteredAndSortedIngredients = () => {
    let filtered = ingredients.filter((ingredient) => {
      const matchesSearch =
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ingredient.description
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    // เรียงข้อมูล
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "stock":
          aValue = a.total_stock;
          bValue = b.total_stock;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        const result = aValue.localeCompare(bValue as string);
        return sortOrder === "asc" ? result : -result;
      } else {
        const result = (aValue as number) - (bValue as number);
        return sortOrder === "asc" ? result : -result;
      }
    });

    return filtered;
  };

  const getFilteredAndSortedStocks = () => {
    let filtered = stocks.filter((stock) => {
      const matchesSearch =
        stock.ingredient_name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        stock.supplier?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });

    // เรียงข้อมูลสต็อก
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.ingredient_name.toLowerCase();
          bValue = b.ingredient_name.toLowerCase();
          break;
        case "stock":
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        default:
          aValue = a.ingredient_name.toLowerCase();
          bValue = b.ingredient_name.toLowerCase();
      }

      if (typeof aValue === "string") {
        const result = aValue.localeCompare(bValue as string);
        return sortOrder === "asc" ? result : -result;
      } else {
        const result = (aValue as number) - (bValue as number);
        return sortOrder === "asc" ? result : -result;
      }
    });

    return filtered;
  };

  // เพิ่ม function สำหรับ reset filters ภายใน component
  const resetFilters = () => {
    setSearchTerm("");
    setSortBy("name");
    setSortOrder("asc");
  };

  useEffect(() => {
    // ตรวจสอบ token ก่อน
    const token =
      sessionStorage.getItem("jwtToken") || localStorage.getItem("jwtToken");

    if (!token) {
      navigate("/login");
      return;
    }

    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([fetchIngredients(), fetchStocks()]);
    } catch (err: any) {
      // ถ้าเป็น 401 หรือ token หมดอายุ
      if (err.response?.status === 401) {
        setError("กรุณาเข้าสู่ระบบใหม่");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setError(
          "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + (err.message || "Unknown error")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchIngredients = async () => {
    try {
      const response = await api.get("/ingredients");

      // ปรับแต่งข้อมูลให้เป็น type ที่ถูกต้อง
      const processedIngredients = (response.data || []).map(
        (ingredient: any) => ({
          ...ingredient,
          minimum_stock: formatNumber(ingredient.minimum_stock),
          total_stock: formatNumber(ingredient.total_stock),
          batch_count: formatNumber(ingredient.batch_count),
        })
      );

      setIngredients(processedIngredients);
    } catch (error) {
      throw error;
    }
  };

  const fetchStocks = async () => {
    try {
      const response = await api.get("/ingredient-stock");
      setStocks(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      throw error;
    }
  };

  // เพิ่ม function สำหรับลบวัตถุดิบ
  const handleDeleteIngredient = async (
    ingredientId: number,
    ingredientName: string
  ) => {
    const confirmed = window.confirm(
      `คุณต้องการลบวัตถุดิบ "${ingredientName}" ใช่หรือไม่?\n\nข้อมูลสต็อกที่เกี่ยวข้องจะถูกลบด้วย`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/ingredients/${ingredientId}/hard-delete`);
      fetchData();
      alert("ลบวัตถุดิบสำเร็จ!");
    } catch (error) {
      console.error("Error deleting ingredient:", error);
      alert("เกิดข้อผิดพลาดในการลบวัตถุดิบ");
    }
  };

  // เพิ่ม function สำหรับลบสต็อก
  const handleDeleteStock = async (stockId: number, ingredientName: string) => {
    const batchInfo = "";
    const confirmed = window.confirm(
      `คุณต้องการลบสต็อก "${ingredientName}${batchInfo}" ใช่หรือไม่?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/ingredient-stock/${stockId}`);
      fetchData();
      alert("ลบสต็อกสำเร็จ!");
    } catch (error) {
      console.error("Error deleting stock:", error);
      alert("เกิดข้อผิดพลาดในการลบสต็อก");
    }
  };

  const getStockStatus = (ingredient: Ingredient) => {
    if (ingredient.total_stock <= 0) return "out";
    if (ingredient.total_stock <= ingredient.minimum_stock) return "low";
    return "good";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "out":
        return "bg-red-100 text-red-800 border-red-200";
      case "low":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "good":
        return "bg-green-100 text-green-800 border-green-200";
      case "near_expiry":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "expired":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "out":
        return "หมดสต็อก";
      case "low":
        return "สต็อกต่ำ";
      case "good":
        return "สต็อกดี";
      case "near_expiry":
        return "ใกล้หมดอายุ";
      case "expired":
        return "หมดอายุ";
      case "fresh":
        return "สดใหม่";
      default:
        return status;
    }
  };

  // Functions สำหรับจัดการ ingredient form
  const handleAddIngredient = async () => {
    try {
      // Validation
      if (!newIngredient.name || !newIngredient.minimum_stock) {
        alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
        return;
      }

      const ingredientData = {
        ...newIngredient,
        minimum_stock: parseInt(newIngredient.minimum_stock),
      };

      await api.post("/ingredients", ingredientData);

      // Reset form และกลับหน้าหลัก
      setNewIngredient({
        name: "",
        minimum_stock: "",
        supplier_info: "",
        description: "",
      });
      setCurrentView("main");

      // Refresh data
      fetchData();
      alert("เพิ่มวัตถุดิบสำเร็จ!");
    } catch (error) {
      console.error("Error adding ingredient:", error);
      alert("เกิดข้อผิดพลาดในการเพิ่มวัตถุดิบ");
    }
  };

  // Functions สำหรับจัดการ stock form
  const handleAddStock = async () => {
    try {
      // Validation
      if (
        !newStock.ingredient_id ||
        !newStock.quantity ||
        !newStock.received_date
      ) {
        alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
        return;
      }

      const stockData = {
        ...newStock,
        ingredient_id: parseInt(newStock.ingredient_id),
        quantity: parseFloat(newStock.quantity),
        purchase_price: newStock.purchase_price
          ? parseFloat(newStock.purchase_price)
          : null,
      };

      // ensure unit included
      if (newStock.unit) stockData.unit = newStock.unit;

      await api.post("/ingredient-stock", stockData);

      // Reset form และกลับหน้าหลัก
      setNewStock({
        ingredient_id: "",
        unit: "",
        quantity: "",
        received_date: "",
        expiry_date: "",
        purchase_price: "",
        supplier: "",
        notes: "",
      });
      setCurrentView("main");

      // Refresh data
      fetchData();
      alert("เพิ่มสต็อกสำเร็จ!");
    } catch (error) {
      console.error("Error adding stock:", error);
      alert("เกิดข้อผิดพลาดในการเพิ่มสต็อก");
    }
  };

  // Function เปิด modal แก้ไขวัตถุดิบ
  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setEditIngredientForm({
      name: ingredient.name,
      minimum_stock: ingredient.minimum_stock.toString(),
      supplier_info: ingredient.supplier_info || "",
      description: ingredient.description || "",
    });
    setShowEditIngredient(true);
  };

  // Function บันทึกการแก้ไขวัตถุดิบ
  const handleUpdateIngredient = async () => {
    if (!editingIngredient) return;

    try {
      // Validation
      if (!editIngredientForm.name || !editIngredientForm.minimum_stock) {
        alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
        return;
      }

      const ingredientData = {
        ...editIngredientForm,
        minimum_stock: parseInt(editIngredientForm.minimum_stock),
      };

      await api.put(`/ingredients/${editingIngredient.id}`, ingredientData);

      // Reset และปิด modal
      setEditingIngredient(null);
      setShowEditIngredient(false);
      setEditIngredientForm({
        name: "",
        minimum_stock: "",
        supplier_info: "",
        description: "",
      });

      // Refresh data
      fetchData();
      alert("แก้ไขวัตถุดิบสำเร็จ!");
    } catch (error) {
      console.error("Error updating ingredient:", error);
      alert("เกิดข้อผิดพลาดในการแก้ไขวัตถุดิบ");
    }
  };

  // Function เปิด modal แก้ไขสต็อก
  const handleEditStock = (stock: Stock) => {
    setEditingStock(stock);
    setEditStockForm({
      ingredient_id: stock.ingredient_id.toString(),
      unit: stock.unit || "",
      quantity: stock.quantity.toString(),
      received_date: stock.received_date,
      expiry_date: stock.expiry_date || "",
      purchase_price: stock.purchase_price?.toString() || "",
      supplier: stock.supplier || "",
      notes: stock.notes || "",
    });
    setShowEditStock(true);
  };

  // Function บันทึกการแก้ไขสต็อก
  const handleUpdateStock = async () => {
    if (!editingStock) return;

    try {
      // Validation
      if (
        !editStockForm.ingredient_id ||
        !editStockForm.quantity ||
        !editStockForm.received_date
      ) {
        alert("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
        return;
      }

      const stockData = {
        ...editStockForm,
        ingredient_id: parseInt(editStockForm.ingredient_id),
        quantity: parseFloat(editStockForm.quantity),
        purchase_price: editStockForm.purchase_price
          ? parseFloat(editStockForm.purchase_price)
          : null,
      };

      // include unit if provided
      if (editStockForm.unit !== undefined) stockData.unit = editStockForm.unit;

      await api.put(`/ingredient-stock/${editingStock.id}`, stockData);

      // Reset และปิด modal
      setEditingStock(null);
      setShowEditStock(false);
      setEditStockForm({
        ingredient_id: "",
        unit: "",
        quantity: "",
        received_date: "",
        expiry_date: "",
        purchase_price: "",
        supplier: "",
        notes: "",
      });

      // Refresh data
      fetchData();
      alert("แก้ไขสต็อกสำเร็จ!");
    } catch (error) {
      console.error("Error updating stock:", error);
      alert("เกิดข้อผิดพลาดในการแก้ไขสต็อก");
    }
  };

  // Error state
  if (error) {
    return (
      <div
        className="flex justify-center items-center min-h-screen bg-gray-50"
        style={{ fontFamily: "Carlito, sans-serif" }}>
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            เกิดข้อผิดพลาด
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchData}
              className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white px-6 py-2 rounded-xl hover:scale-105 transition-all">
              ลองใหม่
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div
        className="flex justify-center items-center min-h-screen bg-gray-50"
        style={{ fontFamily: "Carlito, sans-serif" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#FF6500] border-t-transparent mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">กำลังโหลดข้อมูลสต็อก...</div>
        </div>
      </div>
    );
  }

  // เพิ่มวัตถุดิบใหม่ View
  if (currentView === "add-ingredient") {
    return (
      <div
        className="flex flex-col min-h-screen bg-gray-50 p-6 text-gray-800"
        style={{ fontFamily: "Carlito, sans-serif" }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] rounded-2xl p-6 shadow-xl mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView("main")}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                เพิ่มวัตถุดิบใหม่
              </h1>
              <p className="text-white/90">
                กรอกข้อมูลวัตถุดิบที่ต้องการเพิ่มในระบบ
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ชื่อวัตถุดิบ */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ชื่อวัตถุดิบ *
              </label>
              <input
                type="text"
                value={newIngredient.name}
                onChange={(e) =>
                  setNewIngredient({ ...newIngredient, name: e.target.value })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
                placeholder="เช่น หมูสามชั้น"
                required
              />
            </div>

            {/* สต็อกขั้นต่ำ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                สต็อกขั้นต่ำ *
              </label>
              <input
                type="number"
                value={newIngredient.minimum_stock}
                onChange={(e) =>
                  setNewIngredient({
                    ...newIngredient,
                    minimum_stock: e.target.value,
                  })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
                placeholder="0"
                required
              />
            </div>

            {/* ข้อมูลผู้จำหน่าย */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ข้อมูลผู้จำหน่าย
              </label>
              <input
                type="text"
                value={newIngredient.supplier_info}
                onChange={(e) =>
                  setNewIngredient({
                    ...newIngredient,
                    supplier_info: e.target.value,
                  })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
                placeholder="เช่น ตลาดสดบางปู"
              />
            </div>

            {/* คำอธิบาย */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                คำอธิบาย
              </label>
              <textarea
                value={newIngredient.description}
                onChange={(e) =>
                  setNewIngredient({
                    ...newIngredient,
                    description: e.target.value,
                  })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition h-24 resize-none"
                placeholder="รายละเอียดเพิ่มเติม"
              />
            </div>
          </div>

          {/* ปุ่มดำเนินการ */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={handleAddIngredient}
              className="flex-1 bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-8 py-4 rounded-xl font-semibold shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2">
              <Save size={20} />
              เพิ่มวัตถุดิบ
            </button>
            <button
              onClick={() => setCurrentView("main")}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg transition-all hover:scale-105">
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    );
  }

  // เพิ่มสต็อก View
  if (currentView === "add-stock") {
    return (
      <div
        className="flex flex-col min-h-screen bg-gray-50 p-6 text-gray-800"
        style={{ fontFamily: "Carlito, sans-serif" }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] rounded-2xl p-6 shadow-xl mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView("main")}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                เพิ่มสต็อกใหม่
              </h1>
              <p className="text-white/90">
                เพิ่มจำนวนสต็อกสำหรับวัตถุดิบที่มีอยู่
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* เลือกวัตถุดิบ */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                เลือกวัตถุดิบ *
              </label>
              <select
                value={newStock.ingredient_id}
                onChange={(e) =>
                  setNewStock({ ...newStock, ingredient_id: e.target.value })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
                required>
                <option value="">-- เลือกวัตถุดิบ --</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
            </div>

            {/* จำนวน */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                จำนวน *
              </label>
              <input
                type="number"
                step="0.01"
                value={newStock.quantity}
                onChange={(e) =>
                  setNewStock({ ...newStock, quantity: e.target.value })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
                placeholder="0.00"
                required
              />
            </div>

            {/* หน่วย */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                หน่วย
              </label>
              <input
                type="text"
                value={newStock.unit}
                onChange={(e) =>
                  setNewStock({ ...newStock, unit: e.target.value })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
                placeholder="เช่น กก., ชิ้น, ขวด"
              />
            </div>

            {/* วันที่รับ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                วันที่รับ *
              </label>
              <input
                type="date"
                value={newStock.received_date}
                onChange={(e) =>
                  setNewStock({ ...newStock, received_date: e.target.value })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
                required
              />
            </div>

            {/* วันหมดอายุ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                วันหมดอายุ
              </label>
              <input
                type="date"
                value={newStock.expiry_date}
                onChange={(e) =>
                  setNewStock({ ...newStock, expiry_date: e.target.value })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
              />
            </div>

            {/* ราคาซื้อ (บาท) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ราคาซื้อ (บาท)
              </label>
              <input
                type="number"
                step="0.01"
                value={newStock.purchase_price}
                onChange={(e) =>
                  setNewStock({ ...newStock, purchase_price: e.target.value })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
                placeholder="0.00"
              />
            </div>

            {/* ผู้จำหน่าย */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                ผู้จำหน่าย
              </label>
              <input
                type="text"
                value={newStock.supplier}
                onChange={(e) =>
                  setNewStock({ ...newStock, supplier: e.target.value })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
                placeholder="เช่น ตลาดสดบางปู"
              />
            </div>

            {/* หมายเหตุ */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                หมายเหตุ
              </label>
              <textarea
                value={newStock.notes}
                onChange={(e) =>
                  setNewStock({ ...newStock, notes: e.target.value })
                }
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition h-24 resize-none"
                placeholder="หมายเหตุเพิ่มเติม"
              />
            </div>
          </div>

          {/* ปุ่มดำเนินการ */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={handleAddStock}
              className="flex-1 bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-8 py-4 rounded-xl font-semibold shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2">
              <Save size={20} />
              เพิ่มสต็อก
            </button>
            <button
              onClick={() => setCurrentView("main")}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg transition-all hover:scale-105">
              ยกเลิก
            </button>
          </div>
        </div>
      </div>
    );
  }

  // หน้าหลัก (Main View)
  return (
    <div
      className="flex flex-col min-h-screen bg-gray-50 p-6 text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              จัดการสต็อกวัตถุดิบ
            </h1>
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex items-center gap-2">
                <Package size={18} />
                <span className="text-sm md:text-base">
                  วัตถุดิบทั้งหมด: {ingredients.length} รายการ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} />
                <span className="text-sm md:text-base">
                  สต็อกต่ำ:{" "}
                  {
                    ingredients.filter((i) => getStockStatus(i) === "low")
                      .length
                  }{" "}
                  รายการ
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentView("add-ingredient")}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all hover:scale-105 shadow-lg flex items-center gap-2">
              <Plus size={18} />
              <span className="hidden sm:inline">เพิ่มวัตถุดิบ</span>
            </button>
            <button
              onClick={() => setCurrentView("add-stock")}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all hover:scale-105 shadow-lg flex items-center gap-2">
              <Package size={18} />
              <span className="hidden sm:inline">เพิ่มสต็อก</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Toggle และ Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
        {/* View Mode Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <button
            onClick={() => setViewMode("ingredients")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all transform ${
              viewMode === "ingredients"
                ? "bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-102"
            }`}>
            <Package className="inline mr-2" size={18} />
            รายการวัตถุดิบ
          </button>
          <button
            onClick={() => setViewMode("stock")}
            className={`px-6 py-3 rounded-xl font-semibold transition-all transform ${
              viewMode === "stock"
                ? "bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white shadow-lg scale-105"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-102"
            }`}>
            <Calendar className="inline mr-2" size={18} />
            สต็อกแยกตามล็อต
          </button>
        </div>

        {/* Search และ Filter Bar */}
        <div className="border-t pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* ช่องค้นหา */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Search className="inline mr-1" size={16} />
                ค้นหา
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
                placeholder={
                  viewMode === "ingredients"
                    ? "ค้นหาชื่อวัตถุดิบ..."
                    : "ค้นหาชื่อวัตถุดิบหรือผู้จำหน่าย..."
                }
              />
            </div>

            {/* เรียงลำดับ */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {sortOrder === "asc" ? (
                  <SortAsc className="inline mr-1" size={16} />
                ) : (
                  <SortDesc className="inline mr-1" size={16} />
                )}
                เรียงตาม
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "name" | "stock")
                  }
                  className="flex-1 p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-[#FF6500] transition">
                  <option value="name">ชื่อ</option>
                  <option value="stock">สต็อก</option>
                </select>
                <button
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                  className="p-3 border-2 border-gray-300 rounded-xl hover:border-[#FF6500] transition-colors"
                  title={`เรียง${
                    sortOrder === "asc" ? "จากน้อยไปมาก" : "จากมากไปน้อย"
                  }`}>
                  {sortOrder === "asc" ? (
                    <SortAsc size={18} className="text-gray-600" />
                  ) : (
                    <SortDesc size={18} className="text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ปุ่มเคลียร์ Filter และสรุปผลการค้นหา */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="text-sm text-gray-600">
              {viewMode === "ingredients" ? (
                <>
                  แสดง {getFilteredAndSortedIngredients().length} จาก{" "}
                  {ingredients.length} รายการ
                  {searchTerm && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      ค้นหา: "{searchTerm}"
                    </span>
                  )}
                </>
              ) : (
                <>
                  แสดง {getFilteredAndSortedStocks().length} จาก {stocks.length}{" "}
                  รายการ
                  {searchTerm && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      ค้นหา: "{searchTerm}"
                    </span>
                  )}
                </>
              )}
            </div>
            {(searchTerm || sortBy !== "name" || sortOrder !== "asc") && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors text-sm">
                <X className="inline mr-1" size={14} />
                เคลียร์ตัวกรอง
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === "ingredients" ? (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex-1">
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Package size={24} className="text-[#FF6500]" />
              รายการวัตถุดิบ
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-800">
                    ชื่อวัตถุดิบ
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-800">
                    สต็อกปัจจุบัน
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-800">
                    สต็อกขั้นต่ำ (ใช้งานประมาณ 2 วัน)
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-800">
                    สถานะ
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-800">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAndSortedIngredients().map((ingredient, index) => {
                  const status = getStockStatus(ingredient);
                  // Returns the most common or latest unit for the ingredient, or "-"
                  function getUnitForIngredient(
                    id: number
                  ): import("react").ReactNode {
                    // Find all stocks for this ingredient
                    const ingredientStocks = stocks.filter(
                      (s) => s.ingredient_id === id && s.unit
                    );
                    if (ingredientStocks.length === 0) return "-";
                    // Try to get the unit from the most recent (latest received_date) stock
                    ingredientStocks.sort(
                      (a, b) =>
                        new Date(b.received_date).getTime() -
                        new Date(a.received_date).getTime()
                    );
                    return ingredientStocks[0].unit || "-";
                  }

                  return (
                    <tr
                      key={ingredient.id}
                      className={`border-b hover:bg-gray-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-25"
                      }`}>
                      <td className="p-4">
                        <div>
                          <div className="font-semibold text-gray-800">
                            {ingredient.name}
                          </div>
                          {ingredient.description && (
                            <div className="text-sm text-gray-500 mt-1">
                              {ingredient.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="font-semibold text-lg">
                          {ingredient.total_stock}{" "}
                          <span className="text-base font-medium text-gray-600">
                            {getUnitForIngredient(ingredient.id)}
                          </span>
                        </div>
                        {ingredient.batch_count > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            ({ingredient.batch_count} ล็อต)
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center text-gray-600">
                        <div className="font-medium">
                          {ingredient.minimum_stock}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(
                            status
                          )}`}>
                          {getStatusText(status)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEditIngredient(ingredient)}
                            className="bg-green-100 hover:bg-green-200 text-green-600 p-2 rounded-lg transition-all hover:scale-110"
                            title="แก้ไข">
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteIngredient(
                                ingredient.id,
                                ingredient.name
                              )
                            }
                            className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-all hover:scale-110"
                            title="ลบ">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {getFilteredAndSortedIngredients().length === 0 &&
            ingredients.length > 0 && (
              <div className="text-center py-12">
                <Search size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  ไม่พบข้อมูลที่ค้นหา
                </h3>
                <p className="text-gray-500 mb-6">
                  ลองเปลี่ยนคำค้นหาหรือหมวดหมู่
                </p>
                <button
                  onClick={resetFilters}
                  className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105">
                  <X className="inline mr-2" size={18} />
                  เคลียร์ตัวกรอง
                </button>
              </div>
            )}

          {getFilteredAndSortedIngredients().length === 0 &&
            ingredients.length === 0 && (
              <div className="text-center py-12">
                <Package size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  ยังไม่มีข้อมูลวัตถุดิบ
                </h3>
                <p className="text-gray-500 mb-6">
                  เริ่มต้นด้วยการเพิ่มวัตถุดิบแรกของคุณ
                </p>
                <button
                  onClick={() => setCurrentView("add-ingredient")}
                  className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105">
                  <Plus className="inline mr-2" size={18} />
                  เพิ่มวัตถุดิบแรก
                </button>
              </div>
            )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden flex-1">
          <div className="p-6 border-b bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Calendar size={24} className="text-[#FF6500]" />
              สต็อกแยกตามล็อต
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-800">
                    วัตถุดิบ
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-800">
                    จำนวน
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-800">
                    หน่วย
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-800">
                    วันที่รับ
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-800">
                    วันหมดอายุ
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-800">
                    ราคาต่อหน่วย
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-800">
                    ผู้จำหน่าย
                  </th>
                  <th className="text-center p-4 font-semibold text-gray-800">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {getFilteredAndSortedStocks().map((stock, index) => (
                  <tr
                    key={stock.id}
                    className={`border-b hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-25"
                    }`}>
                    <td className="p-4">
                      <div className="font-semibold text-gray-800">
                        {stock.ingredient_name}
                      </div>
                    </td>

                    {/* จำนวน มาก่อน แล้วตามด้วย หน่วย */}
                    <td className="p-4 text-center">
                      <div className="font-semibold text-lg">
                        {stock.quantity}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-sm text-gray-600">
                        {stock.unit || "-"}
                      </div>
                    </td>

                    <td className="p-4 text-center">{stock.received_date}</td>
                    <td className="p-4 text-center">
                      {stock.expiry_date || "-"}
                    </td>

                    <td className="p-4 text-center">
                      <div className="text-[#FF6500] font-semibold">
                        ฿{Number(stock.purchase_price ?? 0).toFixed(2)}
                      </div>
                    </td>

                    <td className="p-4 text-center text-gray-600">
                      {stock.supplier || "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEditStock(stock)}
                          className="bg-green-100 hover:bg-green-200 text-green-600 p-2 rounded-lg transition-all hover:scale-110"
                          title="แก้ไข">
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteStock(stock.id, stock.ingredient_name)
                          }
                          className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-all hover:scale-110"
                          title="ลบ">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {stocks.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-gray-500">
                      ยังไม่มีข้อมูลสต็อก
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {getFilteredAndSortedStocks().length === 0 && stocks.length > 0 && (
            <div className="text-center py-12">
              <Search size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                ไม่พบข้อมูลที่ค้นหา
              </h3>
              <p className="text-gray-500 mb-6">
                ลองเปลี่ยนคำค้นหาหรือหมวดหมู่
              </p>
              <button
                onClick={resetFilters}
                className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105">
                <X className="inline mr-2" size={18} />
                เคลียร์ตัวกรอง
              </button>
            </div>
          )}

          {getFilteredAndSortedStocks().length === 0 && stocks.length === 0 && (
            <div className="text-center py-12">
              <Calendar size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                ยังไม่มีข้อมูลสต็อก
              </h3>
              <p className="text-gray-500 mb-6">
                เริ่มต้นด้วยการเพิ่มสต็อกใหม่
              </p>
              <button
                onClick={() => setCurrentView("add-stock")}
                className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105">
                <Package className="inline mr-2" size={18} />
                เพิ่มสต็อกแรก
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal แก้ไขวัตถุดิบ */}
      {showEditIngredient && editingIngredient && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border-2 border-gray-200">
            <div className="bg-gradient-to-r from-green-400 to-green-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit size={24} />
                  แก้ไขวัตถุดิบ
                </h3>
                <button
                  onClick={() => {
                    setShowEditIngredient(false);
                    setEditingIngredient(null);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* ชื่อวัตถุดิบ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ชื่อวัตถุดิบ *
                </label>
                <input
                  type="text"
                  value={editIngredientForm.name}
                  onChange={(e) =>
                    setEditIngredientForm({
                      ...editIngredientForm,
                      name: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                  required
                />
              </div>

              {/* สต็อกขั้นต่ำ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  สต็อกขั้นต่ำ *
                </label>
                <input
                  type="number"
                  value={editIngredientForm.minimum_stock}
                  onChange={(e) =>
                    setEditIngredientForm({
                      ...editIngredientForm,
                      minimum_stock: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                  required
                />
              </div>

              {/* ข้อมูลผู้จำหน่าย */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ข้อมูลผู้จำหน่าย
                </label>
                <input
                  type="text"
                  value={editIngredientForm.supplier_info}
                  onChange={(e) =>
                    setEditIngredientForm({
                      ...editIngredientForm,
                      supplier_info: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                />
              </div>

              {/* คำอธิบาย */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  คำอธิบาย
                </label>
                <textarea
                  value={editIngredientForm.description}
                  onChange={(e) =>
                    setEditIngredientForm({
                      ...editIngredientForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition h-20 resize-none"
                />
              </div>

              {/* ปุ่มดำเนินการ */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateIngredient}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2">
                  <Save size={18} />
                  บันทึกการแก้ไข
                </button>
                <button
                  onClick={() => {
                    setShowEditIngredient(false);
                    setEditingIngredient(null);
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105">
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal แก้ไขสต็อก */}
      {showEditStock && editingStock && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border-2 border-gray-200">
            <div className="bg-gradient-to-r from-green-400 to-green-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Edit size={24} />
                  แก้ไขสต็อก
                </h3>
                <button
                  onClick={() => {
                    setShowEditStock(false);
                    setEditingStock(null);
                  }}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* เลือกวัตถุดิบ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  เลือกวัตถุดิบ *
                </label>
                <select
                  value={editStockForm.ingredient_id}
                  onChange={(e) =>
                    setEditStockForm({
                      ...editStockForm,
                      ingredient_id: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                  required>
                  <option value="">-- เลือกวัตถุดิบ --</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* จำนวน */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  จำนวน *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editStockForm.quantity}
                  onChange={(e) =>
                    setEditStockForm({
                      ...editStockForm,
                      quantity: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* หน่วย */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  หน่วย
                </label>
                <input
                  type="text"
                  value={editStockForm.unit}
                  onChange={(e) =>
                    setEditStockForm({ ...editStockForm, unit: e.target.value })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                  placeholder="เช่น กก., ชิ้น, ขวด"
                />
              </div>

              {/* วันที่รับ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  วันที่รับ *
                </label>
                <input
                  type="date"
                  value={editStockForm.received_date}
                  onChange={(e) =>
                    setEditStockForm({
                      ...editStockForm,
                      received_date: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                  required
                />
              </div>

              {/* วันหมดอายุ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  วันหมดอายุ
                </label>
                <input
                  type="date"
                  value={editStockForm.expiry_date}
                  onChange={(e) =>
                    setEditStockForm({
                      ...editStockForm,
                      expiry_date: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                />
              </div>

              {/* ราคาต่อหน่วย */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ราคาต่อหน่วย (บาท)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editStockForm.purchase_price}
                  onChange={(e) =>
                    setEditStockForm({
                      ...editStockForm,
                      purchase_price: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                />
              </div>

              {/* ผู้จำหน่าย */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ผู้จำหน่าย
                </label>
                <input
                  type="text"
                  value={editStockForm.supplier}
                  onChange={(e) =>
                    setEditStockForm({
                      ...editStockForm,
                      supplier: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition"
                />
              </div>

              {/* หมายเหตุ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  หมายเหตุ
                </label>
                <textarea
                  value={editStockForm.notes}
                  onChange={(e) =>
                    setEditStockForm({
                      ...editStockForm,
                      notes: e.target.value,
                    })
                  }
                  className="w-full p-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 transition h-20 resize-none"
                />
              </div>

              {/* ปุ่มดำเนินการ */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateStock}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105 flex items-center justify-center gap-2">
                  <Save size={18} />
                  บันทึกการแก้ไข
                </button>
                <button
                  onClick={() => {
                    setShowEditStock(false);
                    setEditingStock(null);
                  }}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105">
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
