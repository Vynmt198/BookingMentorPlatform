import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl } from '../utils/api.js';
import { getAccessToken } from '../utils/auth.js';

const CartContext = createContext();

export const useCart = () => {
  return useContext(CartContext);
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      setLoading(true);
      const res = await fetch(apiUrl('/api/cart'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCart(data.cart);
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const addToCart = async (itemType, itemId, title, price, quantity = 1, thumbnail = '') => {
    try {
      const token = getAccessToken();
      if (!token) {
        alert("Vui lòng đăng nhập để thêm vào giỏ hàng");
        return;
      }

      const res = await fetch(apiUrl('/api/cart/add'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemType, itemId, title, price, quantity, thumbnail })
      });
      const data = await res.json();
      if (data.success) {
        setCart(data.cart);
        setIsCartOpen(true); // Mở giỏ hàng khi thêm thành công
      }
      return data;
    } catch (error) {
      console.error("Failed to add to cart:", error);
      return { success: false };
    }
  };

  const updateCartItemQuantity = async (itemId, quantity) => {
    try {
      const token = getAccessToken();
      const res = await fetch(apiUrl(`/api/cart/${itemId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ quantity })
      });
      const data = await res.json();
      if (data.success) {
        setCart(data.cart);
      }
    } catch (error) {
      console.error("Failed to update cart item:", error);
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const token = getAccessToken();
      const res = await fetch(apiUrl(`/api/cart/remove/${itemId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCart(data.cart);
      }
    } catch (error) {
      console.error("Failed to remove from cart:", error);
    }
  };

  const clearCart = async () => {
    try {
      const token = getAccessToken();
      const res = await fetch(apiUrl('/api/cart/clear'), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCart(data.cart);
      }
    } catch (error) {
      console.error("Failed to clear cart:", error);
    }
  };

  const cartItemsCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) || 0;
  const cartTotal = cart?.items?.reduce((total, item) => total + (item.price * item.quantity), 0) || 0;

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      updateCartItemQuantity,
      removeFromCart,
      clearCart,
      cartItemsCount,
      cartTotal,
      fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
};
