import React, { createContext, useContext, useState, useEffect } from 'react';

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
      // Assuming a generic token setup, you might need to adapt how token is fetched
      const token = localStorage.getItem('prointerview_access_token');
      if (!token) return;

      setLoading(true);
      const res = await fetch('/api/cart', {
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
      const token = localStorage.getItem('prointerview_access_token');
      if (!token) {
        alert("Vui lòng đăng nhập để thêm vào giỏ hàng");
        return;
      }
      
      const res = await fetch('/api/cart/add', {
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
    } catch (error) {
      console.error("Failed to add to cart:", error);
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const token = localStorage.getItem('prointerview_access_token');
      const res = await fetch(`/api/cart/remove/${itemId}`, {
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
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/cart/clear`, {
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
