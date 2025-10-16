import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../utils/axiosConfig";
import {
  Edit3,
  Trash2,
  Save,
  X,
  Plus,
  ImageIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

interface Menu {
  id: number;
  name: string;
  description: string;
  category: string;
  base_price: string;
  is_available: boolean;
  image_url: string;
  restaurant_id: number;
}

type SortOrder = "asc" | "desc" | null;

const PREDEFINED_CATEGORIES = [
  "อาหารจานเดียว",
  "เส้น",
  "ซุป",
  "เครื่องดื่ม",
  "ของหวาน",
];

const REQUIRED_FIELDS = ["name", "category", "base_price"];

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [newMenu, setNewMenu] = useState<Partial<Menu>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedMenu, setEditedMenu] = useState<Partial<Menu>>({});
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );
  const [categorySortOrder, setCategorySortOrder] = useState<SortOrder>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);

  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const fetchMenus = async () => {
    try {
      const response = await api.get("/menus");
      setMenus(response.data);
    } catch (error: any) {
      console.error("Failed to fetch menus:", error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const handleCategorySort = () => {
    const newSortOrder: SortOrder =
      categorySortOrder === null || categorySortOrder === "desc"
        ? "asc"
        : "desc";
    setCategorySortOrder(newSortOrder);
  };

  const getSortedMenus = () => {
    if (!categorySortOrder) return menus;

    return [...menus].sort((a, b) => {
      const comparison = a.category.localeCompare(b.category, "th");
      return categorySortOrder === "asc" ? comparison : -comparison;
    });
  };

  const handleLogout = () => {
    ["jwtToken", "username", "role"].forEach((key) =>
      localStorage.removeItem(key)
    );
    logout();
    navigate("/login");
  };

  const validateMenuData = () => {
    const missingFields = REQUIRED_FIELDS.filter(
      (field) => !newMenu[field as keyof Menu]
    );

    if (missingFields.length > 0) {
      setValidationMessage(
        "กรุณากรอกข้อมูลให้ครบถ้วน: ชื่อเมนู, ประเภท และราคา"
      );
      return false;
    }

    setValidationMessage(null);
    return true;
  };

  const createMenu = async () => {
    if (!validateMenuData()) return;

    try {
      const menuToCreate = {
        ...newMenu,
        base_price: parseFloat(newMenu.base_price as string),
      };

      await api.post("/menus", menuToCreate);
      fetchMenus();
      setNewMenu({});
    } catch (err) {
      console.error("Failed to create menu:", err);
    }
  };

  const handleEditClick = (menu: Menu) => {
    setEditingId(menu.id);
    setEditedMenu(menu);
  };

  const saveEditedMenu = async () => {
    try {
      await api.patch(`/menus/${editingId}`, editedMenu);
      setEditingId(null);
      setEditedMenu({});
      fetchMenus();
    } catch (err) {
      console.error("Failed to update menu:", err);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditedMenu({});
  };

  const handleDeleteClick = (menu: Menu) => {
    setMenuToDelete(menu);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!menuToDelete) return;

    try {
      await api.delete(`/menus/${menuToDelete.id}`);
      fetchMenus();
      closeDeleteModal();
    } catch (err) {
      console.error("Failed to delete menu:", err);
      closeDeleteModal();
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setMenuToDelete(null);
  };

  const updateNewMenu = (field: keyof Menu, value: string | boolean) => {
    setNewMenu((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditedMenu = (field: keyof Menu, value: string | boolean) => {
    setEditedMenu((prev) => ({ ...prev, [field]: value }));
  };

  const getMenuStats = () => {
    const availableMenus = menus.filter((m) => m.is_available).length;
    const categories = new Set(menus.map((menu) => menu.category)).size;
    const averagePrice =
      menus.length > 0
        ? Math.round(
            menus.reduce(
              (sum, menu) => sum + parseFloat(menu.base_price || "0"),
              0
            ) / menus.length
          )
        : 0;

    return {
      total: menus.length,
      available: availableMenus,
      categories,
      averagePrice,
    };
  };

  const renderSortIcon = () => {
    if (categorySortOrder === "asc") return <ChevronUp size={14} />;
    if (categorySortOrder === "desc") return <ChevronDown size={14} />;

    return (
      <div className="flex flex-col">
        <ChevronUp size={10} className="-mb-1" />
        <ChevronDown size={10} />
      </div>
    );
  };

  const renderMenuImage = (menu: Menu) => (
    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 flex items-center justify-center">
      {menu.image_url ? (
        <img
          src={menu.image_url}
          alt={menu.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = "none";
            (target.nextElementSibling as HTMLElement).style.display = "flex";
          }}
        />
      ) : null}
      <div
        className="flex items-center justify-center w-full h-full text-gray-400"
        style={{ display: menu.image_url ? "none" : "flex" }}>
        <ImageIcon size={20} />
      </div>
    </div>
  );

  const renderEditableField = (
    currentValue: string,
    field: keyof Menu,
    isEditing: boolean,
    type: "input" | "textarea" | "select" | "checkbox" = "input",
    options?: string[]
  ) => {
    if (!isEditing) {
      if (field === "base_price") {
        return (
          <span className="font-bold text-green-600">
            ฿{parseFloat(currentValue).toFixed(2)}
          </span>
        );
      }
      if (field === "is_available") {
        const isAvailable = currentValue as unknown as boolean;
        return (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isAvailable
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}>
            {isAvailable ? "พร้อมขาย" : "หมด"}
          </span>
        );
      }
      if (field === "category") {
        return (
          <span
            className={`px-2 py-1 rounded-lg text-xs font-medium ${
              categorySortOrder
                ? "bg-[#FF6500]/10 text-[#FF6500]"
                : "bg-gray-100 text-gray-700"
            }`}>
            {currentValue}
          </span>
        );
      }
      return (
        <span
          className={
            field === "name"
              ? "font-medium"
              : "text-sm text-gray-600 line-clamp-2"
          }>
          {currentValue || "-"}
        </span>
      );
    }

    const baseClassName =
      "border-2 border-gray-300 p-2 w-full rounded-xl focus:outline-none focus:border-[#FF6500] transition";

    switch (type) {
      case "textarea":
        return (
          <textarea
            value={(editedMenu[field] as string) || ""}
            onChange={(e) => updateEditedMenu(field, e.target.value)}
            className={`${baseClassName} resize-none`}
            rows={2}
          />
        );
      case "select":
        return (
          <select
            value={(editedMenu[field] as string) || ""}
            onChange={(e) => updateEditedMenu(field, e.target.value)}
            className={`${baseClassName} bg-white`}>
            <option value="" disabled>
              เลือกประเภท
            </option>
            {options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case "checkbox":
        return (
          <input
            type="checkbox"
            checked={!!(editedMenu[field] as boolean)}
            onChange={(e) => updateEditedMenu(field, e.target.checked)}
            className="w-5 h-5 text-[#FF6500] border-2 border-gray-300 rounded focus:ring-[#FF6500]"
          />
        );
      default:
        return (
          <input
            value={(editedMenu[field] as string) || ""}
            onChange={(e) => updateEditedMenu(field, e.target.value)}
            type={field === "base_price" ? "number" : "text"}
            className={baseClassName}
          />
        );
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const stats = getMenuStats();
  const sortedMenus = getSortedMenus();

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#FF6500]">จัดการเมนู</h1>
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
          <div className="text-blue-100">เมนูทั้งหมด</div>
        </div>
        <div className="bg-gradient-to-br from-green-400 to-green-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">{stats.available}</div>
          <div className="text-green-100">พร้อมขาย</div>
        </div>
        <div className="bg-gradient-to-br from-purple-400 to-purple-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">{stats.categories}</div>
          <div className="text-purple-100">หมวดหมู่</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">฿{stats.averagePrice}</div>
          <div className="text-yellow-100">ราคาเฉลี่ย</div>
        </div>
      </div>

      {/* Add Menu Form */}
      <div className="bg-white shadow-lg rounded-2xl p-6">
        <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white p-4 rounded-xl mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Plus size={24} />
            เพิ่มเมนูใหม่
          </h2>
        </div>

        {validationMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
            {validationMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <input
            placeholder="ชื่อเมนู *"
            className="border-2 border-gray-300 p-3 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
            value={newMenu.name || ""}
            onChange={(e) => updateNewMenu("name", e.target.value)}
          />

          <select
            className="border-2 border-gray-300 p-3 rounded-xl focus:outline-none focus:border-[#FF6500] transition bg-white"
            value={newMenu.category || ""}
            onChange={(e) => updateNewMenu("category", e.target.value)}>
            <option value="" disabled>
              เลือกประเภท *
            </option>
            {PREDEFINED_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <input
            placeholder="ราคา *"
            type="number"
            className="border-2 border-gray-300 p-3 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
            value={newMenu.base_price || ""}
            onChange={(e) => updateNewMenu("base_price", e.target.value)}
          />

          <textarea
            placeholder="รายละเอียดเมนู"
            className="border-2 border-gray-300 p-3 rounded-xl focus:outline-none focus:border-[#FF6500] transition md:col-span-2 lg:col-span-3 resize-none"
            rows={3}
            value={newMenu.description || ""}
            onChange={(e) => updateNewMenu("description", e.target.value)}
          />

          <input
            placeholder="Image URL"
            className="border-2 border-gray-300 p-3 rounded-xl focus:outline-none focus:border-[#FF6500] transition md:col-span-2"
            value={newMenu.image_url || ""}
            onChange={(e) => updateNewMenu("image_url", e.target.value)}
          />

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="available"
              checked={!!newMenu.is_available}
              onChange={(e) => updateNewMenu("is_available", e.target.checked)}
              className="w-5 h-5 text-[#FF6500] border-2 border-gray-300 rounded focus:ring-[#FF6500]"
            />
            <label htmlFor="available" className="text-gray-700 font-medium">
              พร้อมขาย
            </label>
          </div>
        </div>

        <button
          onClick={createMenu}
          className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-6 py-3 rounded-xl shadow-lg transition font-semibold flex items-center gap-2">
          <Plus size={20} />
          เพิ่มเมนู
        </button>
      </div>

      {/* Menus Table */}
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white p-4">
          <h2 className="text-lg font-bold">รายการเมนูทั้งหมด</h2>
        </div>

        {menus.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">ยังไม่มีเมนูในระบบ</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-[#FF6500]/10">
                <tr className="text-gray-700 text-sm font-semibold text-left">
                  <th className="py-4 px-6">รหัส</th>
                  <th className="py-4 px-6">รูป</th>
                  <th className="py-4 px-6">ชื่อเมนู</th>
                  <th className="py-4 px-6">รายละเอียด</th>
                  <th className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <span>ประเภท</span>
                      <button
                        onClick={handleCategorySort}
                        className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${
                          categorySortOrder
                            ? "bg-[#FF6500] text-white"
                            : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                        }`}
                        title={
                          categorySortOrder === "asc"
                            ? "เรียงจาก ก-ฮ"
                            : categorySortOrder === "desc"
                            ? "เรียงจาก ฮ-ก"
                            : "เรียงประเภท"
                        }>
                        {renderSortIcon()}
                      </button>
                    </div>
                  </th>
                  <th className="py-4 px-6">ราคา</th>
                  <th className="py-4 px-6">สถานะ</th>
                  <th className="py-4 px-6 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {sortedMenus.map((menu, index) => (
                  <tr
                    key={menu.id}
                    className={`border-b hover:bg-[#FFF0E0] transition ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}>
                    <td className="py-4 px-6 font-semibold text-[#FF6500]">
                      {menu.id}
                    </td>
                    <td className="py-4 px-6">{renderMenuImage(menu)}</td>
                    <td className="py-4 px-6">
                      {renderEditableField(
                        menu.name,
                        "name",
                        editingId === menu.id
                      )}
                    </td>
                    <td className="py-4 px-6 max-w-xs">
                      {renderEditableField(
                        menu.description,
                        "description",
                        editingId === menu.id,
                        "textarea"
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {renderEditableField(
                        menu.category,
                        "category",
                        editingId === menu.id,
                        "select",
                        PREDEFINED_CATEGORIES
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {renderEditableField(
                        menu.base_price,
                        "base_price",
                        editingId === menu.id
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {renderEditableField(
                        String(menu.is_available),
                        "is_available",
                        editingId === menu.id,
                        "checkbox"
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {editingId === menu.id ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={saveEditedMenu}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-2 rounded-xl shadow transition flex items-center gap-1 text-sm">
                            <Save size={14} />
                            บันทึก
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-3 py-2 rounded-xl shadow transition flex items-center gap-1 text-sm">
                            <X size={14} />
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(menu)}
                            className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-3 py-2 rounded-xl shadow transition flex items-center gap-1 text-sm">
                            <Edit3 size={14} />
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleDeleteClick(menu)}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 rounded-xl shadow transition flex items-center gap-1 text-sm">
                            <Trash2 size={14} />
                            ลบ
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && menuToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-red-600 mb-4">ยืนยันการลบ</h2>

            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                คุณแน่ใจหรือไม่ที่จะลบเมนูนี้ออกจากระบบ?
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  {renderMenuImage(menuToDelete)}
                  <div className="flex-1">
                    <h3 className="font-bold text-[#FF6500]">
                      {menuToDelete.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {menuToDelete.category}
                    </p>
                    <p className="text-sm font-semibold text-green-600">
                      ฿{parseFloat(menuToDelete.base_price).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">
                <strong>คำเตือน:</strong> การลบเมนูจะไม่สามารถย้อนกลับได้
                และอาจมีผลต่อออเดอร์ที่อ้างอิงถึงเมนูนี้
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDeleteModal}
                className="px-6 py-2 rounded-xl bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold transition">
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold transition">
                ลบเมนู
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
