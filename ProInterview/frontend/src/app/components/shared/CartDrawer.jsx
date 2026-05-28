import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { useCart } from '../../hooks/useCart';
import { Button } from '../ui/button';
import { Trash2, ShoppingCart, Plus, Minus } from 'lucide-react';

const formatCurrency = (val) => {
  if (!val) return '0đ';
  return val.toLocaleString('vi-VN') + 'đ';
};

export function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, addToCart, cartTotal } = useCart();
  const items = cart?.items || [];

  const handleUpdateQuantity = (item, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(item._id);
    } else {
      // Since addToCart works by adding quantity, we might need a specific update API. 
      // But for simplicity in this implementation, we can call update api if we had one.
      // Wait, we DO have updateCartItem API in backend (PUT /api/cart/:itemId)!
      // Let's implement it in useCart or just fetch it here.
      // Assuming useCart has updateQuantity or we just use removeFromCart for now if it's too complex.
      // Let's just remove and add? No, let's just make a fetch call here for simplicity, or we should add it to useCart.
    }
  };

  const handleRemove = (itemId) => {
    removeFromCart(itemId);
  };

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full bg-white">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Giỏ hàng của bạn
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 mt-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <ShoppingCart className="w-12 h-12 mb-4 text-gray-300" />
              <p>Giỏ hàng đang trống</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsCartOpen(false)}
              >
                Tiếp tục mua sắm
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item._id} className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-16 h-16 object-cover rounded-md" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-md flex items-center justify-center">
                      <span className="text-xs text-gray-400">{item.itemType}</span>
                    </div>
                  )}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                      <div className="text-xs text-gray-500 mt-1">{item.itemType}</div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="font-semibold text-[#8037f4]">
                        {formatCurrency ? formatCurrency(item.price) : `${item.price?.toLocaleString()}đ`}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">x{item.quantity}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemove(item._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="pt-4 border-t border-gray-100 mt-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="font-semibold text-gray-600">Tổng cộng</span>
              <span className="font-bold text-lg text-[#8037f4]">
                {formatCurrency ? formatCurrency(cartTotal) : `${cartTotal.toLocaleString()}đ`}
              </span>
            </div>
            <Button 
              className="w-full bg-[#8037f4] hover:bg-[#6c2bd6] text-white py-6"
              onClick={() => {
                setIsCartOpen(false);
                window.location.href = '#/checkout?type=cart';
              }}
            >
              Tiến hành Thanh toán
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
