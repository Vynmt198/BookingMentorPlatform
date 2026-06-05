import { getAccessToken } from "./auth.js";
import { apiUrl } from "./api.js";

export const cartApi = {
  checkout: async ({ paymentMethod, orderNum }) => {
    try {
      const res = await fetch(apiUrl("/api/cart/checkout"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ paymentMethod, orderNum }),
      });
      if (!res.ok) {
        let msg = "Lỗi khi thanh toán giỏ hàng";
        try {
          const errData = await res.json();
          msg = errData.message || msg;
        } catch (e) {}
        return { success: false, error: msg };
      }
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Lỗi cart checkout API:", error);
      return { success: false, error: "Lỗi kết nối máy chủ" };
    }
  },
};
