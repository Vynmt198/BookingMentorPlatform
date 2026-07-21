import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { useCart } from '../../hooks/useCart';
import { Trash2, ShoppingCart, Plus, Minus, ArrowRight } from 'lucide-react';

const formatCurrency = (val) => {
  if (!val) return '0đ';
  return val.toLocaleString('vi-VN') + 'đ';
};

export function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateCartItemQuantity, cartTotal } = useCart();
  const items = cart?.items || [];
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const handleUpdateQuantity = (item, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(item._id);
    } else {
      updateCartItemQuantity(item._id, newQuantity);
    }
  };

  const handleRemove = (itemId) => {
    removeFromCart(itemId);
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent
        className="w-full sm:max-w-md flex flex-col h-full bg-white p-0 gap-0
          [&>*:last-child]:text-white [&>*:last-child]:opacity-80 [&>*:last-child]:hover:opacity-100
          [&>*:last-child]:hover:bg-white/15 [&>*:last-child]:data-[state=open]:bg-white/15"
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[#8037f4] to-[#9d5cf5] px-5 py-4">
          <div className="pointer-events-none absolute -top-10 -right-8 w-28 h-28 rounded-full bg-white/10 blur-2xl" />
          <SheetHeader className="relative p-0 gap-1.5">
            <SheetTitle className="flex items-center gap-3 text-base text-white">
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/15 shrink-0">
                <ShoppingCart className="w-4 h-4 text-white" />
              </span>
              <span>
                Giỏ hàng của bạn
                {itemCount > 0 && (
                  <span className="block text-xs font-normal text-white/70 mt-0.5">
                    {itemCount} sản phẩm
                  </span>
                )}
              </span>
            </SheetTitle>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 bg-[#f7f5fc]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4 shadow-sm">
                <ShoppingCart className="w-8 h-8 text-[#8037f4]/40" />
              </div>
              <p className="font-medium text-gray-700">Giỏ hàng đang trống</p>
              <p className="text-sm text-gray-400 mt-1">Hãy thêm khóa học hoặc gói dịch vụ bạn thích</p>
              <button
                type="button"
                className="mt-5 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setIsCartOpen(false)}
              >
                Tiếp tục mua sắm
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="flex gap-3 p-3 bg-white rounded-2xl shadow-[0_2px_10px_rgba(128,55,244,0.08)] hover:shadow-[0_6px_18px_rgba(128,55,244,0.14)] transition-shadow"
                >
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-16 h-16 aspect-square object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 aspect-square bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-gray-400 text-center px-1">{item.itemType}</span>
                    </div>
                  )}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <h4 className="font-normal text-sm text-gray-700 leading-snug line-clamp-2">{item.title}</h4>
                      <span className="inline-block text-[11px] font-medium text-[#8037f4] bg-[#8037f4]/10 rounded-full px-2 py-0.5 mt-1.5">
                        {item.itemType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="font-semibold text-sm text-[#8037f4]">
                        {formatCurrency(item.price)}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.itemType === "Course" ? (
                          // Khóa học chỉ ghi danh 1 lần/user — không có khái niệm số lượng, nên
                          // không cho tăng/giảm như sản phẩm thông thường.
                          <span className="text-xs text-gray-400 px-2">Số lượng: 1</span>
                        ) : (
                          <div className="flex items-center bg-[#f7f5fc] rounded-full border border-gray-100">
                            <button
                              type="button"
                              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#8037f4] transition-colors"
                              onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-semibold text-gray-700 w-5 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#8037f4] transition-colors"
                              onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          onClick={() => handleRemove(item._id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[#8037f4] to-[#9d5cf5] px-5 py-4">
            <div className="relative flex justify-between items-center mb-4">
              <span className="text-sm text-white/70">Tổng cộng</span>
              <span className="font-bold text-2xl text-white">
                {formatCurrency(cartTotal)}
              </span>
            </div>
            <button
              type="button"
              className="relative w-full flex items-center justify-center gap-2 rounded-full py-3.5 text-sm font-black text-black transition-all hover:brightness-105 active:scale-[0.99]"
              style={{ background: '#93f72b', boxShadow: '0 8px 20px rgba(0,0,0,0.25)' }}
              onClick={() => {
                setIsCartOpen(false);
                window.location.href = '#/checkout?type=cart';
              }}
            >
              Tiến hành Thanh toán
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
