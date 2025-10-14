import axios from "axios";
import { toast } from "react-toastify";

export const handleError = (error: any) => {
  if (!axios.isAxiosError(error)) {
    console.error("Unexpected error:", error);
    toast.error("Something went wrong.");
    return;
  }

  const err = error.response;

  if (Array.isArray(err?.data?.errors)) {
    // กรณี errors เป็น array
    err.data.errors.forEach((val: any) => toast.warning(val.description || val));
  } else if (typeof err?.data?.errors === "object") {
    // กรณี errors เป็น object { field: [msg] }
    Object.values(err.data.errors).forEach((messages: any) => {
      if (Array.isArray(messages)) toast.warning(messages[0]);
    });
  } else if (err?.data) {
    // กรณีมีข้อความ error ตรง ๆ
    toast.warning(err.data);
  }

  if (err?.status === 401) {
    toast.warning("Please login");
    window.location.href = "/login"; // ใช้ redirect ดีกว่า pushState
  }
};
