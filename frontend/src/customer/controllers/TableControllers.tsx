// controllers/TableControllers.ts
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// type ของโต๊ะ
export type TableInfo = {
  id: number;
  status: "free" | "occupied";
  selected?: boolean;
};

export function useTableController(total: number = 20) {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableInfo[]>(() =>
    Array.from({ length: total }, (_, i) => ({
      id: i + 1,
      status: Math.random() < 0.25 ? "occupied" : "free",
      selected: false,
    }))
  );

  // toggle สถานะโต๊ะ
  const toggleTable = (id: number, p0: boolean) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id === id && t.status === "free"
          ? { ...t, selected: !t.selected }
          : t
      )
    );
  };


  // confirmBooking
  const confirmBooking = () => {
    const booked = tables.filter((t) => t.selected);
    if (booked.length === 0) {
      alert("กรุณาเลือกโต๊ะก่อน");
      return;
    }

    setTables((prev) =>
      prev.map((t) =>
        t.selected ? {...t, status: "occupied", selected: false} : t
      )
    );
    alert(`คุณจอง ${booked.length} โต๊ะเรียบร้อยแล้ว`);
    navigate("/order-food");
  };

  return { tables, toggleTable, confirmBooking };
}
