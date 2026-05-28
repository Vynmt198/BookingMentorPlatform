import { Cart } from "../models/Cart.js";

// Lấy giỏ hàng của user
export const getCart = async (req, res) => {
  try {
    const userId = req.userId;
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    res.json({ success: true, cart });
  } catch (error) {
    console.error("[Cart] getCart error:", error);
    res.status(500).json({ success: false, message: "Lỗi server lấy giỏ hàng." });
  }
};

// Thêm sản phẩm vào giỏ
export const addToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemType, itemId, title, price, quantity, thumbnail } = req.body;

    if (!itemType || !itemId || !title || price === undefined) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin sản phẩm." });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    // Kiểm tra xem sản phẩm đã có trong giỏ chưa
    const existingItemIndex = cart.items.findIndex(
      (item) => item.itemId.toString() === itemId && item.itemType === itemType
    );

    if (existingItemIndex > -1) {
      // Nếu đã có, tăng số lượng
      cart.items[existingItemIndex].quantity += (quantity || 1);
    } else {
      // Nếu chưa có, thêm mới
      cart.items.push({
        itemType,
        itemId,
        title,
        price,
        quantity: quantity || 1,
        thumbnail: thumbnail || ""
      });
    }

    await cart.save();
    res.json({ success: true, cart, message: "Đã thêm vào giỏ hàng." });
  } catch (error) {
    console.error("[Cart] addToCart error:", error);
    res.status(500).json({ success: false, message: "Lỗi server thêm giỏ hàng." });
  }
};

// Cập nhật số lượng
export const updateCartItem = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: "Số lượng không hợp lệ." });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ success: false, message: "Không tìm thấy giỏ hàng." });

    const item = cart.items.find((i) => i._id.toString() === itemId);
    if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm trong giỏ." });

    item.quantity = quantity;
    await cart.save();

    res.json({ success: true, cart });
  } catch (error) {
    console.error("[Cart] updateCartItem error:", error);
    res.status(500).json({ success: false, message: "Lỗi server cập nhật giỏ hàng." });
  }
};

// Xóa sản phẩm khỏi giỏ
export const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ success: false, message: "Không tìm thấy giỏ hàng." });

    cart.items = cart.items.filter((i) => i._id.toString() !== itemId);
    await cart.save();

    res.json({ success: true, cart, message: "Đã xóa khỏi giỏ hàng." });
  } catch (error) {
    console.error("[Cart] removeFromCart error:", error);
    res.status(500).json({ success: false, message: "Lỗi server xóa giỏ hàng." });
  }
};

// Làm trống giỏ hàng
export const clearCart = async (req, res) => {
  try {
    const userId = req.userId;
    
    const cart = await Cart.findOne({ userId });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.json({ success: true, cart, message: "Đã làm trống giỏ hàng." });
  } catch (error) {
    console.error("[Cart] clearCart error:", error);
    res.status(500).json({ success: false, message: "Lỗi server làm trống giỏ hàng." });
  }
};

import { Enrollment } from "../models/Enrollment.js";

// Thanh toán giỏ hàng (tạo pending enrollments cho các khóa học trong giỏ)
export const checkoutCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { orderNum, paymentMethod } = req.body;

    if (!orderNum) {
      return res.status(400).json({ success: false, message: "Thiếu mã đơn hàng (orderNum)." });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Giỏ hàng trống." });
    }

    // Lọc ra các sản phẩm là khóa học
    const courseItems = cart.items.filter(item => item.itemType === "Course");

    if (courseItems.length === 0) {
      return res.status(400).json({ success: false, message: "Chỉ hỗ trợ thanh toán khóa học trong giỏ hàng." });
    }

    const now = new Date();
    // Tạo Enrollments pending cho từng khóa học
    for (const item of courseItems) {
      // Kiểm tra xem đã ghi danh chưa
      const existing = await Enrollment.findOne({ userId, courseId: item.itemId });
      
      if (existing) {
        // Nếu đã có pending với cùng orderNum thì bỏ qua, nếu pending khác orderNum thì update
        if (existing.paymentStatus === "pending") {
          existing.paymentRef = orderNum;
          existing.paymentMethod = paymentMethod || "transfer";
          existing.pricePaid = item.price;
          existing.transferSubmittedAt = now;
          await existing.save();
        }
      } else {
        // Tạo mới
        await Enrollment.create({
          userId,
          courseId: item.itemId,
          paymentMethod: paymentMethod || "transfer",
          paymentStatus: "pending",
          pricePaid: item.price,
          paymentRef: orderNum,
          transferSubmittedAt: now,
          transferForceConfirm: false,
          accessGrantedAt: null,
          progress: []
        });
      }
    }

    // Làm trống giỏ hàng (hoặc chỉ xóa các món đã checkout)
    cart.items = cart.items.filter(item => item.itemType !== "Course");
    await cart.save();

    res.json({ success: true, orderNum, message: "Đã gộp đơn hàng thành công." });
  } catch (error) {
    console.error("[Cart] checkoutCart error:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi thanh toán giỏ hàng." });
  }
};
