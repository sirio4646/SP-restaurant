import { useEffect, useState } from "react";
import api from "../../utils/axiosConfig";
import { Edit3, Check, X } from "lucide-react";

interface Table {
  id: number;
  table_number: number;
  status: "free" | "occupied";
  capacity: number;
}

interface SnackbarState {
  message: string | null;
  type: "success" | "error" | "info";
}

const statusConfig = {
  free: { text: "ว่าง", color: "bg-green-100 text-green-700" },
  occupied: { text: "ไม่ว่าง", color: "bg-red-100 text-red-700" },
};

const snackbarColors = {
  success: "bg-green-500",
  error: "bg-red-500",
  info: "bg-blue-500",
};

export default function AdminTableManagePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTable, setEditingTable] = useState<Partial<Table>>({});
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    message: null,
    type: "info",
  });
  const [loading, setLoading] = useState(true);

  const showSnackbar = (
    message: string,
    type: SnackbarState["type"] = "info"
  ) => {
    setSnackbar({ message, type });
    setTimeout(() => setSnackbar({ message: null, type: "info" }), 3000);
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await api.get("/tables");
      setTables(response.data);
    } catch (error) {
      showSnackbar("ไม่สามารถโหลดข้อมูลโต๊ะได้", "error");
    } finally {
      setLoading(false);
    }
  };

  const validateTableData = () => {
    const { table_number, capacity } = editingTable;

    if (!table_number || !capacity) {
      showSnackbar("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
      return false;
    }

    if (table_number <= 0 || capacity <= 0) {
      showSnackbar("กรุณากรอกตัวเลขที่ถูกต้อง", "error");
      return false;
    }

    const isDuplicate = tables.some(
      (table) => table.table_number === table_number && table.id !== editingId
    );

    if (isDuplicate) {
      showSnackbar("หมายเลขโต๊ะนี้มีอยู่แล้ว", "error");
      return false;
    }

    return true;
  };

  const handleEditTable = (table: Table) => {
    setEditingId(table.id);
    setEditingTable({
      table_number: table.table_number,
      capacity: table.capacity,
    });
  };

  const handleSaveEdit = async () => {
    if (!validateTableData()) return;

    try {
      await api.put(`/tables/${editingId}`, {
        table_number: editingTable.table_number,
        capacity: editingTable.capacity,
      });

      showSnackbar("แก้ไขข้อมูลโต๊ะเรียบร้อย", "success");
      setEditingId(null);
      setEditingTable({});
      fetchTables();
    } catch (err) {
      showSnackbar("ไม่สามารถแก้ไขข้อมูลโต๊ะได้", "error");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingTable({});
  };

  const handleStatusChange = async (
    tableId: number,
    newStatus: "free" | "occupied"
  ) => {
    try {
      await api.put(`/tables/${tableId}/status`, { status: newStatus });

      const table = tables.find((t) => t.id === tableId);
      showSnackbar(
        `อัพเดทโต๊ะ ${table?.table_number} เป็น ${statusConfig[newStatus].text} เรียบร้อย`,
        "success"
      );
      fetchTables();
    } catch (err) {
      showSnackbar("ไม่สามารถอัพเดทสถานะได้", "error");
    }
  };

  const handleBulkStatusChange = async (newStatus: "free" | "occupied") => {
    const targetTables = tables.filter((table) => table.status !== newStatus);

    try {
      await Promise.all(
        targetTables.map((table) =>
          api.put(`/tables/${table.id}/status`, { status: newStatus })
        )
      );

      showSnackbar(
        `${newStatus === "free" ? "ปล่อย" : "ปิด"}โต๊ะทั้งหมดเรียบร้อย`,
        "success"
      );
      fetchTables();
    } catch (err) {
      showSnackbar("ไม่สามารถอัพเดทโต๊ะทั้งหมดได้", "error");
    }
  };

  const updateEditingTable = (field: keyof Table, value: number) => {
    setEditingTable((prev) => ({ ...prev, [field]: value }));
  };

  const getTableStats = () => ({
    total: tables.length,
    free: tables.filter((t) => t.status === "free").length,
    occupied: tables.filter((t) => t.status === "occupied").length,
  });

  useEffect(() => {
    fetchTables();
  }, []);

  if (loading) {
    return (
      <div
        className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-800 flex items-center justify-center"
        style={{ fontFamily: "Carlito, sans-serif" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#FF6500] border-t-transparent mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">กำลังโหลดข้อมูลโต๊ะ...</div>
        </div>
      </div>
    );
  }

  const stats = getTableStats();

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#FF6500]">จัดการโต๊ะ</h1>
          <p className="text-gray-600 mt-1">จัดการสถานะโต๊ะทั้งหมดในร้าน</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-blue-100">โต๊ะทั้งหมด</div>
        </div>
        <div className="bg-gradient-to-br from-green-400 to-green-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">{stats.free}</div>
          <div className="text-green-100">โต๊ะว่าง</div>
        </div>
        <div className="bg-gradient-to-br from-red-400 to-red-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">{stats.occupied}</div>
          <div className="text-red-100">โต๊ะไม่ว่าง</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-lg rounded-2xl p-6">
        <h2 className="text-xl font-bold text-[#FF6500] mb-4">
          การจัดการแบบเร็ว
        </h2>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => handleBulkStatusChange("free")}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl shadow transition font-semibold">
            ปล่อยโต๊ะทั้งหมด
          </button>
          <button
            onClick={() => handleBulkStatusChange("occupied")}
            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl shadow transition font-semibold">
            ปิดโต๊ะทั้งหมด
          </button>
        </div>
      </div>

      {/* Tables */}
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white p-4">
          <h2 className="text-lg font-bold">รายการโต๊ะทั้งหมด</h2>
        </div>

        {tables.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">ไม่มีข้อมูลโต๊ะ</div>
            <p className="text-gray-500 mt-2">
              กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มโต๊ะ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-[#FF6500]/10">
                <tr className="text-gray-700 text-sm font-semibold text-left">
                  <th className="py-4 px-6">หมายเลขโต๊ะ</th>
                  <th className="py-4 px-6">จำนวนที่นั่ง</th>
                  <th className="py-4 px-6">สถานะ</th>
                  <th className="py-4 px-6 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {tables.map((table, index) => (
                  <tr
                    key={table.id}
                    className={`border-b hover:bg-[#FFF0E0] transition ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}>
                    <td className="py-4 px-6">
                      {editingId === table.id ? (
                        <input
                          type="number"
                          value={editingTable.table_number || ""}
                          onChange={(e) =>
                            updateEditingTable(
                              "table_number",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-20 px-2 py-1 border-2 border-[#FF6500] rounded-lg focus:outline-none"
                          min="1"
                        />
                      ) : (
                        <span className="font-semibold text-[#FF6500]">
                          โต๊ะ {table.table_number}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {editingId === table.id ? (
                        <input
                          type="number"
                          value={editingTable.capacity || ""}
                          onChange={(e) =>
                            updateEditingTable(
                              "capacity",
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-20 px-2 py-1 border-2 border-[#FF6500] rounded-lg focus:outline-none"
                          min="1"
                        />
                      ) : (
                        `${table.capacity} ที่นั่ง`
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          statusConfig[table.status].color
                        }`}>
                        {statusConfig[table.status].text}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {editingId === table.id ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={handleSaveEdit}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-1 rounded-lg shadow transition flex items-center gap-1 text-sm font-semibold">
                            <Check size={14} />
                            บันทึก
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-3 py-1 rounded-lg shadow transition flex items-center gap-1 text-sm font-semibold">
                            <X size={14} />
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEditTable(table)}
                            className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-3 py-1 rounded-lg shadow transition flex items-center gap-1 text-sm font-semibold">
                            <Edit3 size={14} />
                            แก้ไข
                          </button>

                          <button
                            onClick={() =>
                              handleStatusChange(
                                table.id,
                                table.status === "free" ? "occupied" : "free"
                              )
                            }
                            className={`${
                              table.status === "free"
                                ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                                : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            } text-white px-3 py-1 rounded-lg shadow transition flex items-center gap-1 text-sm font-semibold`}>
                            {table.status === "free" ? "ปิดโต๊ะ" : "เปิดโต๊ะ"}
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

      {/* Snackbar */}
      {snackbar.message && (
        <div
          className={`fixed bottom-4 right-4 rounded-xl ${
            snackbarColors[snackbar.type]
          } px-6 py-4 text-white shadow-xl max-w-sm z-50 font-medium`}>
          {snackbar.message}
        </div>
      )}
    </div>
  );
}
