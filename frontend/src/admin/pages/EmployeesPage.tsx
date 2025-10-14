'use client';
import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface Employee {
  id: number;
  full_name: string;
  position: string;
  phone_number: string;
  salary: string;
  hire_date: string;
  restaurant_id: number;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedEmployee, setEditedEmployee] = useState<Partial<Employee>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const navigate = useNavigate(); 
  const logout = useAuthStore((state) => state.logout);

  const jwtToken = localStorage.getItem("jwtToken");

  // --- Fetch employees ---
  const fetchEmployees = () => {
    fetch('http://localhost:5000/api/employees', {
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    })
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(err => console.error("Failed to fetch employees:", err));
  };

  useEffect(() => { fetchEmployees(); }, []);

  // --- Create Employee ---
  const createEmployee = () => {
    if (!newEmployee.full_name || !newEmployee.position || !newEmployee.salary) {
      setValidationMessage("กรุณากรอกข้อมูลให้ครบถ้วน: ชื่อเต็ม, ตำแหน่ง และเงินเดือน");
      return;
    }
    setValidationMessage(null);
    const currentISODate = new Date().toISOString().split('T')[0];

    fetch('http://localhost:5000/api/employees', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify({ 
        full_name: newEmployee.full_name,
        position: newEmployee.position,
        phone_number: newEmployee.phone_number,
        salary: newEmployee.salary,
        hire_date: currentISODate
      })
    }).then(() => { 
      fetchEmployees(); 
      setNewEmployee({});
    });
  };

  // --- Edit Employee ---
  const handleEditClick = (employee: Employee) => {
    setEditingId(employee.id);
    setEditedEmployee(employee);
  };

  const saveEditedEmployee = () => {
    fetch(`http://localhost:5000/api/employees/${editingId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`
      },
      body: JSON.stringify(editedEmployee)
    }).then(() => {
      setEditingId(null);
      setEditedEmployee({});
      fetchEmployees();
    });
  };

  // --- Delete Employee ---
  const deleteEmployee = (id: number) => {
    fetch(`http://localhost:5000/api/employees/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    }).then(() => fetchEmployees());
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

  // --- Logout ---
  const handleLogout = () => {
    localStorage.removeItem("jwtToken");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    logout(); 
    navigate("/login");
  };

  return (
   <div className="p-6 bg-gray-50 min-h-screen space-y-6">
  {/* Header + Logout */}
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-3xl font-bold text-[#FF6500]"> จัดการข้อมูลพนักงาน</h1>
    <button
      onClick={handleLogout}
      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-md transition"
    >
      Logout
    </button>
  </div>

  {/* Form */}
  <div className="bg-white shadow-md rounded-2xl p-6">
    <div className="flex flex-wrap gap-3">
      <input
        placeholder="ชื่อเต็ม"
        className="border border-gray-300 p-2 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
        value={newEmployee.full_name || ''}
        onChange={e => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
      />
      <input
        placeholder="ตำแหน่ง"
        className="border border-gray-300 p-2 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
        value={newEmployee.position || ''}
        onChange={e => setNewEmployee({ ...newEmployee, position: e.target.value })}
      />
      <input
        placeholder="เบอร์โทร"
        className="border border-gray-300 p-2 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
        value={newEmployee.phone_number || ''}
        onChange={e => setNewEmployee({ ...newEmployee, phone_number: e.target.value })}
      />
      <input
        placeholder="เงินเดือน"
        className="border border-gray-300 p-2 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
        value={newEmployee.salary || ''}
        onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })}
      />
      <button
        onClick={createEmployee}
        className="bg-[#FF6500] hover:bg-[#FF7F33] text-white px-5 py-2 rounded-lg shadow-md transition font-semibold"
      >
        สร้าง
      </button>
    </div>
  </div>

  {/* Table */}
  <div className="bg-white shadow-md rounded-2xl overflow-hidden">
    <table className="w-full table-auto">
      <thead>
        <tr className="bg-[#FF6500]/20 text-gray-700">
          <th className="py-3 px-4 text-left">รหัส</th>
          <th className="py-3 px-4 text-left">ชื่อเต็ม</th>
          <th className="py-3 px-4 text-left">ตำแหน่ง</th>
          <th className="py-3 px-4 text-right">เงินเดือน</th>
          <th className="py-3 px-4 text-left">เบอร์โทร</th>
          <th className="py-3 px-4 text-left">วันที่เริ่มงาน</th>
          <th className="py-3 px-4 text-center">การดำเนินการ</th>
        </tr>
      </thead>
      <tbody>
        {employees.map(emp => (
          <tr key={emp.id} className="border-t odd:bg-white even:bg-[#FFF5E6] hover:bg-[#FFE0B3] transition">
            <td className="py-3 px-4 font-medium">{emp.id}</td>
            <td className="py-3 px-4">
              {editingId === emp.id ? (
                <input
                  value={editedEmployee.full_name || ''}
                  onChange={e => setEditedEmployee({ ...editedEmployee, full_name: e.target.value })}
                  className="border p-1 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
                />
              ) : emp.full_name}
            </td>
            <td className="py-3 px-4">
              {editingId === emp.id ? (
                <input
                  value={editedEmployee.position || ''}
                  onChange={e => setEditedEmployee({ ...editedEmployee, position: e.target.value })}
                  className="border p-1 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
                />
              ) : emp.position}
            </td>
            <td className="py-3 px-4 text-right">
              {editingId === emp.id ? (
                <input
                  value={editedEmployee.salary || ''}
                  onChange={e => setEditedEmployee({ ...editedEmployee, salary: e.target.value })}
                  className="border p-1 w-full rounded-lg text-right focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
                />
              ) : emp.salary}
            </td>
            <td className="py-3 px-4">
              {editingId === emp.id ? (
                <input
                  value={editedEmployee.phone_number || ''}
                  onChange={e => setEditedEmployee({ ...editedEmployee, phone_number: e.target.value })}
                  className="border p-1 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
                />
              ) : emp.phone_number}
            </td>
            <td className="py-3 px-4">
              {editingId === emp.id ? (
                <input
                  type="date"
                  value={editedEmployee.hire_date || ''}
                  onChange={e => setEditedEmployee({ ...editedEmployee, hire_date: e.target.value })}
                  className="border p-1 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6500]"
                />
              ) : emp.hire_date}
            </td>
            <td className="py-3 px-4 text-center">
              {editingId === emp.id ? (
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm shadow-md transition"
                  onClick={saveEditedEmployee}
                >
                   บันทึก
                </button>
              ) : (
                <div className="flex justify-center gap-2">
                  <button
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm shadow-md transition"
                    onClick={() => handleEditClick(emp)}
                  >
                     แก้ไข
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm shadow-md transition"
                    onClick={() => handleDeleteClick(emp)}
                  >
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
</div>

  );
}
