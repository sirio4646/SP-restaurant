import { create } from "zustand";

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  setAuth: (token: string, username: string, role: string) => void;
  logout: () => void;
  checkAuth: () => void;
}

const clearStorage = () => {
  const keysToRemove = ["jwtToken", "username", "restaurant_id", "is_customer"];

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

const getAuthFromStorage = () => {
  // ลองใน sessionStorage ก่อน (customer) แล้วค่อย localStorage (admin)
  const token =
    sessionStorage.getItem("jwtToken") || localStorage.getItem("jwtToken");
  const username =
    sessionStorage.getItem("username") || localStorage.getItem("username");

  return { token, username };
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  username: null,
  role: null,

  setAuth: (token, username, role) => {
    set({ token, username, role });
  },

  logout: () => {
    clearStorage();
    set({ token: null, username: null, role: null });
  },

  checkAuth: () => {
    const { token, username } = getAuthFromStorage();

    if (token && username) {
      set({ token, username, role: "" });
    }
  },
}));
