import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Unlock } from "lucide-react";
import { formatDateTime } from "../../utils/formatDateTime";
import TableCard from "../../components/TableCard";
import { useTableController } from "../controllers/TableControllers";

export default function TableReservationPage() {
  const [now, setNow] = useState(new Date());
  const { tables, loading, error, occupyTable, openAllTables } =
    useTableController();
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [snackbarType, setSnackbarType] = useState<
    "success" | "error" | "info"
  >("info");
  const navigate = useNavigate();

  const timeLabel = useMemo(() => formatDateTime(now), [now]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(tick);
  }, []);

  const showSnackbar = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setSnackbar(message);
    setSnackbarType(type);
    setTimeout(() => setSnackbar(null), 3000);
  };

  const handleTableSelect = (tableId: number) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table || table.status !== "free") {
      showSnackbar("โต๊ะนี้ไม่ว่าง", "error");
      return;
    }

    if (selectedTable === tableId) {
      setSelectedTable(null);
    } else if (selectedTable === null) {
      setSelectedTable(tableId);
    } else {
      showSnackbar("คุณสามารถเลือกโต๊ะได้ครั้งละ 1 โต๊ะเท่านั้น", "error");
    }
  };

  const handleConfirm = async () => {
    if (!selectedTable) {
      showSnackbar("กรุณาเลือกโต๊ะก่อนกดยืนยัน", "error");
      return;
    }

    try {
      const table = tables.find((t) => t.id === selectedTable);
      if (!table) {
        showSnackbar("ไม่พบโต๊ะที่เลือก", "error");
        return;
      }

      await occupyTable(selectedTable);
      navigate(`/order/${selectedTable}`);
      showSnackbar(`เลือกโต๊ะ ${table.table_number} เรียบร้อยแล้ว`, "success");
    } catch (err) {
      showSnackbar("ไม่สามารถเลือกโต๊ะได้ กรุณาลองใหม่", "error");
      setSelectedTable(null);
    }
  };

  const handleOpenAllTables = async () => {
    if (!confirm("คุณต้องการเปิดโต๊ะทั้งหมดหรือไม่?")) {
      return;
    }

    try {
      const result = await openAllTables();
      showSnackbar(result.message, "success");
    } catch (error: any) {
      showSnackbar(
        error.message || "ไม่สามารถเปิดโต๊ะได้ กรุณาลองใหม่",
        "error"
      );
    }
  };

  const getSnackbarColor = () => {
    switch (snackbarType) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  if (loading) {
    return (
      <div
        className="flex justify-center items-center min-h-screen bg-gray-50"
        style={{ fontFamily: "Carlito, sans-serif" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#FF6500] border-t-transparent mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">กำลังโหลดข้อมูลโต๊ะ...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col justify-center items-center min-h-screen bg-gray-50 p-6"
        style={{ fontFamily: "Carlito, sans-serif" }}>
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-2xl mb-6 text-center">
          <XCircle size={48} className="mx-auto mb-2 text-red-500" />
          <div className="font-bold text-lg mb-2">เกิดข้อผิดพลาด</div>
          <div>{error}</div>
        </div>
        <button
          onClick={handleOpenAllTables}
          className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-6 py-3 rounded-xl shadow-lg transition font-semibold flex items-center gap-2">
          <Unlock size={20} />
          เปิดโต๊ะทั้งหมด
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col min-h-screen bg-gray-50 md:p-6 text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              ร้านนายสมชาย
            </h1>
            <div className="flex items-center gap-2 text-white/90">
              <Clock size={18} />
              <span className="text-sm md:text-base">
                เวลา: <span className="font-semibold">{timeLabel}</span>
              </span>
            </div>
          </div>
          <button
            onClick={handleOpenAllTables}
            className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-xl transition-all hover:scale-105 shadow-lg"
            title="เปิดโต๊ะทั้งหมด">
            <Unlock size={20} />
          </button>
        </div>
      </div>

      {/* Table Grid */}
      <div className="bg-white rounded-2xl p-6 shadow-lg mb-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">เลือกโต๊ะ</h2>
          {selectedTable && (
            <div className="bg-[#FF6500] text-white px-4 py-2 rounded-xl text-sm font-medium">
              เลือกโต๊ะ{" "}
              {tables.find((t) => t.id === selectedTable)?.table_number}
            </div>
          )}
        </div>

        <div className="grid grid-cols-5 gap-4 auto-rows-fr">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={{ id: table.table_number, status: table.status }}
              onToggle={() => handleTableSelect(table.id)}
              isSelected={selectedTable === table.id}
              userType="ลูกค้า"
            />
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="bg-white rounded-2xl p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {selectedTable ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#FF6500] rounded-full"></div>
                <span>
                  เลือกโต๊ะ{" "}
                  {tables.find((t) => t.id === selectedTable)?.table_number}{" "}
                  แล้ว
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                <span>กรุณาเลือกโต๊ะ</span>
              </div>
            )}
          </div>

          <button
            onClick={handleConfirm}
            disabled={!selectedTable}
            className={`px-8 py-3 rounded-xl font-semibold shadow-lg transition-all transform ${
              selectedTable
                ? "bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white hover:scale-105"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}>
            {selectedTable ? "ยืนยันการเลือกโต๊ะ" : "เลือกโต๊ะก่อน"}
          </button>
        </div>
      </div>

      {/* Snackbar */}
      {snackbar && (
        <div
          className={`fixed bottom-6 right-6 rounded-xl ${getSnackbarColor()} px-6 py-4 text-white shadow-2xl max-w-sm z-50 transform transition-all`}>
          <div className="flex items-center gap-2">
            {snackbarType === "success" && <CheckCircle2 size={20} />}
            {snackbarType === "error" && <XCircle size={20} />}
            <span>{snackbar}</span>
          </div>
        </div>
      )}
    </div>
  );
}
