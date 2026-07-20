import { Cart } from "../models/Cart.js";
import { Course } from "../models/Course.js";

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
    const { itemType, itemId, title, quantity, thumbnail } = req.body;
    let { price } = req.body;

    if (!itemType || !itemId || !title || price === undefined) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin sản phẩm." });
    }

    // Giá khóa học luôn lấy từ server — không tin giá client gửi lên (tránh sửa giá qua request).
    if (itemType === "Course") {
      const course = await Course.findById(itemId).select("price").lean();
      if (!course) return res.status(404).json({ success: false, message: "Không tìm thấy khóa học." });
      price = Number(course.price || 0);
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
    const userId = req.userId;
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
import { resolveCourseAccessForUser } from "../utils/planGuard.js";

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
    let totalDue = 0;
    const grantedCourseIds = [];
    // Tạo Enrollments pending cho từng khóa học — giá luôn tính lại từ Course + gói hiện tại của user
    // (không tin snapshot price trong giỏ, vì Professional được miễn phí, Student được giảm giá).
    for (const item of courseItems) {
      const course = await Course.findById(item.itemId).select("price").lean();
      if (!course) continue;
      const access = await resolveCourseAccessForUser(userId, course.price);

      const existing = await Enrollment.findOne({ userId, courseId: item.itemId });

      if (access.included || access.effectivePrice <= 0) {
        if (existing) {
          existing.pricePaid = access.included ? access.price : 0;
          existing.paymentStatus = "paid";
          existing.paymentMethod = access.included ? "plan_included" : "";
          existing.paidAt = now;
          existing.lastAccessedAt = now;
          await existing.save();
        } else {
          await Enrollment.create({
            userId,
            courseId: item.itemId,
            paymentMethod: access.included ? "plan_included" : "",
            paymentStatus: "paid",
            pricePaid: access.included ? access.price : 0,
            paidAt: now,
            lastAccessedAt: now,
          });
        }
        grantedCourseIds.push(String(item.itemId));
        continue;
      }

      totalDue += access.effectivePrice;
      if (existing) {
        if (existing.paymentStatus === "pending") {
          existing.paymentRef = orderNum;
          existing.paymentMethod = paymentMethod || "transfer";
          existing.pricePaid = access.effectivePrice;
          existing.transferSubmittedAt = now;
          await existing.save();
        }
      } else {
        await Enrollment.create({
          userId,
          courseId: item.itemId,
          paymentMethod: paymentMethod || "transfer",
          paymentStatus: "pending",
          pricePaid: access.effectivePrice,
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

    res.json({ success: true, orderNum, totalDue, grantedCourseIds, message: "Đã gộp đơn hàng thành công." });
  } catch (error) {
    console.error("[Cart] checkoutCart error:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi thanh toán giỏ hàng." });
  }
};
