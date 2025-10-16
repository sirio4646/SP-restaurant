import { useEffect, useState } from "react";
import "react";
import type { JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../utils/axiosConfig";
import { Edit3, Trash2, Save, X, UserPlus } from "lucide-react";

interface Employee {
  id: number;
  full_name: string;
  position: string;
  phone_number: string;
  salary: string;
  hire_date: string;
  restaurant_id: number;
}

const REQUIRED_FIELDS = ["full_name", "position", "salary"];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedEmployee, setEditedEmployee] = useState<Partial<Employee>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(
    null
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null
  );

  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const fetchEmployees = async () => {
    try {
      const response = await api.get("/employees");
      setEmployees(response.data);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const validateEmployeeData = (employee: Partial<Employee>) => {
    const missingFields = REQUIRED_FIELDS.filter(
      (field) => !employee[field as keyof Employee]
    );

    if (missingFields.length > 0) {
      setValidationMessage(
        "กรุณากรอกข้อมูลให้ครบถ้วน: ชื่อเต็ม, ตำแหน่ง และเงินเดือน"
      );
      return false;
    }

    setValidationMessage(null);
    return true;
  };

  const createEmployee = async () => {
    if (!validateEmployeeData(newEmployee)) return;

    try {
      const currentISODate = new Date().toISOString().split("T")[0];

      await api.post("/employees", {
        ...newEmployee,
        hire_date: currentISODate,
      });

      fetchEmployees();
      setNewEmployee({});
    } catch (err) {
      console.error("Failed to create employee:", err);
    }
  };

  const handleEditClick = (employee: Employee) => {
    setEditingId(employee.id);
    setEditedEmployee(employee);
  };

  const saveEditedEmployee = async () => {
    try {
      await api.patch(`/employees/${editingId}`, editedEmployee);

      setEditingId(null);
      setEditedEmployee({});
      fetchEmployees();
    } catch (err) {
      console.error("Failed to update employee:", err);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditedEmployee({});
  };

  const deleteEmployee = async (id: number) => {
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (err) {
      console.error("Failed to delete employee:", err);
    }
  };

  const handleDeleteClick = (employee: Employee) => {
    setConfirmDeleteId(employee.id);
    setEmployeeToDelete(employee);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      deleteEmployee(confirmDeleteId);
      setConfirmDeleteId(null);
      setEmployeeToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteId(null);
    setEmployeeToDelete(null);
  };

  const handleLogout = () => {
    ["jwtToken", "username", "role"].forEach((key) =>
      localStorage.removeItem(key)
    );
    logout();
    navigate("/login");
  };

  const updateNewEmployee = (field: keyof Employee, value: string) => {
    setNewEmployee((prev) => ({ ...prev, [field]: value }));
  };

  const updateEditedEmployee = (field: keyof Employee, value: string) => {
    setEditedEmployee((prev) => ({ ...prev, [field]: value }));
  };

  const getTotalSalary = () => {
    return employees.reduce(
      (sum, emp) => sum + parseFloat(emp.salary || "0"),
      0
    );
  };

  const getUniquePositions = () => {
    return new Set(employees.map((emp) => emp.position).filter(Boolean)).size;
  };

  const renderInputField = (
    placeholder: string,
    value: string,
    onChange: (value: string) => void,
    type: string = "text"
  ) => (
    <input
      placeholder={placeholder}
      type={type}
      className="border-2 border-gray-300 p-3 rounded-xl focus:outline-none focus:border-[#FF6500] transition"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  const renderEditableCell = (
    value: string,
    field: keyof Employee,
    type: string = "text",
    formatDisplay?: (val: string) => string | JSX.Element
  ) => {
    if (editingId && editedEmployee.id === editingId) {
      return (
        <input
          type={type}
          value={editedEmployee[field] || ""}
          onChange={(e) => updateEditedEmployee(field, e.target.value)}
          className="border-2 border-gray-300 p-2 w-full rounded-xl focus:outline-none focus:border-[#FF6500] transition"
        />
      );
    }

    return formatDisplay ? formatDisplay(value) : value;
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return (
    <div
      className="p-6 space-y-6 bg-gray-50 min-h-screen text-gray-800"
      style={{ fontFamily: "Carlito, sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#FF6500]">
          จัดการข้อมูลพนักงาน
        </h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl shadow transition">
          Logout
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-400 to-blue-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">{employees.length}</div>
          <div className="text-blue-100">พนักงานทั้งหมด</div>
        </div>
        <div className="bg-gradient-to-br from-green-400 to-green-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">{getUniquePositions()}</div>
          <div className="text-green-100">ตำแหน่งงาน</div>
        </div>
        <div className="bg-gradient-to-br from-purple-400 to-purple-600 text-white p-6 shadow-lg rounded-2xl">
          <div className="text-3xl font-bold">
            ฿{getTotalSalary().toLocaleString()}
          </div>
          <div className="text-purple-100">ค่าจ้างรวม/เดือน</div>
        </div>
      </div>

      {/* Add Employee Form */}
      <div className="bg-white shadow-lg rounded-2xl p-6">
        <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white p-4 rounded-xl mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <UserPlus size={24} />
            เพิ่มพนักงานใหม่
          </h2>
        </div>

        {validationMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
            {validationMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {renderInputField(
            "ชื่อเต็ม *",
            newEmployee.full_name || "",
            (value) => updateNewEmployee("full_name", value)
          )}
          {renderInputField("ตำแหน่ง *", newEmployee.position || "", (value) =>
            updateNewEmployee("position", value)
          )}
          {renderInputField(
            "เบอร์โทร",
            newEmployee.phone_number || "",
            (value) => updateNewEmployee("phone_number", value)
          )}
          {renderInputField(
            "เงินเดือน *",
            newEmployee.salary || "",
            (value) => updateNewEmployee("salary", value),
            "number"
          )}
        </div>

        <button
          onClick={createEmployee}
          className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-6 py-3 rounded-xl shadow-lg transition font-semibold flex items-center gap-2">
          <UserPlus size={20} />
          เพิ่มพนักงาน
        </button>
      </div>

      {/* Employees Table */}
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] text-white p-4">
          <h2 className="text-lg font-bold">รายชื่อพนักงาน</h2>
        </div>

        {employees.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">ยังไม่มีข้อมูลพนักงาน</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead className="bg-[#FF6500]/10">
                <tr className="text-gray-700 text-sm font-semibold text-left">
                  <th className="py-4 px-6">รหัส</th>
                  <th className="py-4 px-6">ชื่อเต็ม</th>
                  <th className="py-4 px-6">ตำแหน่ง</th>
                  <th className="py-4 px-6">เบอร์โทร</th>
                  <th className="py-4 px-6">เงินเดือน</th>
                  <th className="py-4 px-6">วันที่เริ่มงาน</th>
                  <th className="py-4 px-6 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {employees.map((emp, index) => (
                  <tr
                    key={emp.id}
                    className={`border-b hover:bg-[#FFF0E0] transition ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}>
                    <td className="py-4 px-6 font-semibold text-[#FF6500]">
                      {emp.id}
                    </td>

                    <td className="py-4 px-6">
                      {renderEditableCell(emp.full_name, "full_name")}
                    </td>

                    <td className="py-4 px-6">
                      {renderEditableCell(emp.position, "position")}
                    </td>

                    <td className="py-4 px-6">
                      {renderEditableCell(emp.phone_number, "phone_number")}
                    </td>

                    <td className="py-4 px-6">
                      {renderEditableCell(
                        emp.salary,
                        "salary",
                        "number",
                        (val) => (
                          <span className="font-bold text-green-600">
                            ฿{parseFloat(val || "0").toLocaleString()}
                          </span>
                        )
                      )}
                    </td>

                    <td className="py-4 px-6">
                      {renderEditableCell(
                        emp.hire_date,
                        "hire_date",
                        "date",
                        (val) => new Date(val).toLocaleDateString("th-TH")
                      )}
                    </td>

                    <td className="py-4 px-6 text-center">
                      {editingId === emp.id ? (
                        <div className="flex justify-center gap-2">
                          <button
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-2 rounded-xl shadow transition flex items-center gap-1 text-sm"
                            onClick={saveEditedEmployee}>
                            <Save size={14} />
                            บันทึก
                          </button>
                          <button
                            className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white px-3 py-2 rounded-xl shadow transition flex items-center gap-1 text-sm"
                            onClick={cancelEdit}>
                            <X size={14} />
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button
                            className="bg-gradient-to-r from-[#FFB347] to-[#FF6500] hover:from-[#FF6500] hover:to-[#E55A00] text-white px-3 py-2 rounded-xl shadow transition flex items-center gap-1 text-sm"
                            onClick={() => handleEditClick(emp)}>
                            <Edit3 size={14} />
                            แก้ไข
                          </button>
                          <button
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-2 rounded-xl shadow transition flex items-center gap-1 text-sm"
                            onClick={() => handleDeleteClick(emp)}>
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
      {confirmDeleteId && employeeToDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-[#FF6500] mb-4">
              ยืนยันการลบ
            </h2>
            <p className="mb-6 text-gray-700">
              คุณแน่ใจหรือไม่ที่จะลบพนักงาน{" "}
              <span className="font-semibold text-[#FF6500]">
                {employeeToDelete.full_name}
              </span>{" "}
              ออกจากระบบ?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                className="px-6 py-2 rounded-xl bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold transition"
                onClick={handleCancelDelete}>
                ยกเลิก
              </button>
              <button
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold transition"
                onClick={handleConfirmDelete}>
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
