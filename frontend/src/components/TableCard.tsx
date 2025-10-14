// components/TableCard.tsx
import type { TableInfo } from "../customer/controllers/TableControllers";

interface Props {
  table: TableInfo;
  onToggle: (id: number) => void;
  isSelected?: boolean;
  userType?: string;
}

export default function TableCard({ table, onToggle, userType, isSelected = false }: Props) {
  const isFree = table.status === "free";

  return (
    <button
      onClick={() => isFree && onToggle(table.id)}
      disabled={!isFree}
      className={[
        "relative h-28 w-full sm:w-24 md:w-28 lg:w-32 rounded-lg p-4 shadow-sm transition flex flex-col justify-center items-center",
        isSelected
          ? "bg-[#FF6000] text-black"          // โต๊ะเลือก → สีส้ม
          : isFree
            ? "bg-[#273F4F] text-white hover:ring-2 hover:ring-[#FF6000]" // โต๊ะว่าง → น้ำเงินเข้ม + hover ส้ม
            : "bg-[#000000] text-gray-400 cursor-not-allowed opacity-100", // โต๊ะมีคน → ดำ
        "focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
      ].join(" ")}
      aria-pressed={isSelected ? "true" : "false"}
      aria-label={`โต๊ะ ${table.id} ${isFree ? "ว่าง" : "มีคน"}`}
    >
      {/* เลขโต๊ะ */}
      <div className="flex flex-col justify-center items-center h-full">
        <span className="text-3xl sm:text-4xl md:text-5xl font-bold">{table.id}</span>
        
      </div>

      {/* สถานะ X ถ้าไม่ว่าง */}
      {!isFree && (
        <span className="text-xl mt-1 font-semibold text-red-600">X</span>
      )}

      {/* hover ring สำหรับโต๊ะว่าง */}
      {isFree && (
        <div className="pointer-events-none absolute inset-0 rounded-lg ring-0 group-hover:ring-2 transition-all" />
      )}
    </button>
  );
}
