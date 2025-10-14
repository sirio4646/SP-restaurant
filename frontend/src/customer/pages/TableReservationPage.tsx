import { formatDateTime } from "../../utils/formatDateTime";
import TableCard from "../../components/TableCard";
import { useEffect, useMemo, useState } from "react";
import { useTableController } from "../controllers/TableControllers";
import { useNavigate } from "react-router-dom";
import "../../css/Tablereserv.css";

interface Props {
  userType?: string;
}

export default function TableReservationPage({ userType = "ลูกค้า" }: Props) {
  const [now, setNow] = useState(new Date());
  const { tables, toggleTable } = useTableController(20);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const navigate = useNavigate();

  const timeLabel = useMemo(() => formatDateTime(now), [now]);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(tick);
  }, []);

  const handleTableSelect = (tableId: number, isOccupied: boolean) => {
    if (isOccupied) return;

    if (selectedTable === tableId) {
      setSelectedTable(null);
      toggleTable(tableId, false);
    } else if (selectedTable === null) {
      setSelectedTable(tableId);
      toggleTable(tableId, true);
    } else {
      setSnackbar("คุณสามารถเลือกโต๊ะได้ครั้งละ 1 โต๊ะเท่านั้น");
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  const handleConfirm = () => {
    if (selectedTable !== null) {
      navigate(`/order/${selectedTable}`);
      setSnackbar(`จองโต๊ะ ${selectedTable} เรียบร้อยแล้ว 🎉`);
      setTimeout(() => setSnackbar(null), 5000);
    } else {
      setSnackbar("กรุณาเลือกโต๊ะก่อนกดยืนยัน");
      setTimeout(() => setSnackbar(null), 3000);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 md:p-6 text-gray-800 ">
      {/* Top bar */}
      <div className="relative rounded-2xl border border-orange-400 bg-orange-400 px-4 sm:px-6 py-4 shadow-md flex-shrink-0">
        <div className="absolute top-4 right-4">
          
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">ร้านนายสมชาย</h1>
        <div className="mt-2 text-xs sm:text-sm md:text-base text-white">
          เวลา: <span className="font-medium">{timeLabel}</span>
        </div>
      </div>

      {/* ตารางโต๊ะ scrollable */}
      <div className="flex-1 overflow-y-auto mt-4">
        <div className="grid grid-cols-5 gap-4 pb-4 auto-rows-fr">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onToggle={() => handleTableSelect(table.id, table.status !== "free")}
              isSelected={selectedTable === table.id}
              userType={userType}
            />
          ))}
        </div>
      </div>

      {/* ปุ่มยืนยัน */}
      <div className="flex-shrink-0 flex justify-end mt-4">
        <button
          onClick={handleConfirm}
          className="rounded-full bg-orange-500 px-6 py-3 text-white font-semibold shadow-lg hover:bg-orange-400 transition"
        >
          ยืนยันการจอง
        </button>
      </div>

      {/* Snackbar */}
      {snackbar && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 rounded bg-red-500 px-4 py-3 text-white shadow-lg max-w-xs sm:max-w-sm">
          {snackbar}
        </div>
      )}
    </div>

  );
}
