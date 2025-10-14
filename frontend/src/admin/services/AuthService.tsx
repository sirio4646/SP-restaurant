import axios from "axios";

const api = "http://localhost:5000/api/";

export interface UserProfileToken {
  token: string;
  username: string;
  role: string;
}

export const loginApi = async (
  username: string,
  password: string
): Promise<UserProfileToken | null> => {
  try {
    const response = await axios.post<UserProfileToken>(api + "account/login", {
      username,
      password,
    });
    return response.data;
  } catch (error) {
    console.error("Login failed:", error);
    return null;
  }
};
