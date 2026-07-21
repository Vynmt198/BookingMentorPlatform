import { Cart } from "../models/Cart.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { resolveCourseAccessForUser } from "../utils/planGuard.js";
import { expireEnrollmentTransferIfNeeded } from "../services/transferPaymentExpiryService.js";

// Giá khóa học hiển thị/lưu trong giỏ luôn là giá ĐÃ áp ưu đãi % theo gói hiện tại của user
// (student -5%, professional -10%) — khớp với giá hiển thị ở trang khóa học và số tiền thực tế
// checkoutCart() sẽ tính khi tạo đơn, tránh giỏ hàng hiện giá gốc còn nơi khác hiện giá đã giảm.
async function priceCourseForCart(userId, courseId) {
  const course = await Course.findById(courseId).select("price").lean();
  if (!course) return null;
  const access = await resolveCourseAccessForUser(userId, course.price);
  return access.effectivePrice;
}

// Lấy giỏ hàng của user
export const getCart = async (req, res) => {
  try {
    const userId = req.userId;
    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    let dirty = false;

    // Khóa học đã mua xong (paymentStatus "paid") không được phép còn nằm trong giỏ — dọn luôn
    // tại đây để tự phục hồi các giỏ hàng cũ (thêm vào giỏ từ trước khi mua, hoặc mua qua nơi
    // khác) trước khi user có thể bấm thanh toán trùng cho khóa học đã sở hữu.
    const cartCourseIds = cart.items.filter((i) => i.itemType === "Course").map((i) => i.itemId);
    if (cartCourseIds.length > 0) {
      const paidEnrollments = await Enrollment.find({
        userId,
        courseId: { $in: cartCourseIds },
        paymentStatus: "paid",
      }).select("courseId").lean();
      const paidCourseIds = new Set(paidEnrollments.map((e) => String(e.courseId)));
      if (paidCourseIds.size > 0) {
        const before = cart.items.length;
        cart.items = cart.items.filter(
          (item) => !(item.itemType === "Course" && paidCourseIds.has(String(item.itemId)))
        );
        if (cart.items.length !== before) dirty = true;
      }
    }

    // Tính lại giá hiện hành cho từng khóa học trong giỏ (gói của user hoặc giá khóa có thể đã
    // đổi từ lúc thêm vào giỏ), đồng thời dọn luôn quantity sai (khóa học chỉ ghi danh 1 lần/user,
    // không có khái niệm "mua nhiều số lượng") — sửa thẳng trong DB để các nơi khác (checkoutCart)
    // cũng nhất quán, không chỉ che ở lần hiển thị này.
    for (const item of cart.items) {
      if (item.itemType !== "Course") continue;
      const livePrice = await priceCourseForCart(userId, item.itemId);
      if (livePrice !== null && item.price !== livePrice) {
        item.price = livePrice;
        dirty = true;
      }
      if (item.quantity !== 1) {
        item.quantity = 1;
        dirty = true;
      }
    }
    if (dirty) await cart.save();

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

    // Giá khóa học luôn lấy từ server, đã áp ưu đãi % theo gói — không tin giá client gửi lên.
    if (itemType === "Course") {
      const livePrice = await priceCourseForCart(userId, itemId);
      if (livePrice === null) return res.status(404).json({ success: false, message: "Không tìm thấy khóa học." });
      price = livePrice;

      // Đã sở hữu khóa học rồi thì không cho thêm lại vào giỏ (tránh mua/thanh toán trùng).
      const alreadyOwned = await Enrollment.exists({ userId, courseId: itemId, paymentStatus: "paid" });
      if (alreadyOwned) {
        return res.status(400).json({ success: false, message: "Bạn đã sở hữu khóa học này rồi." });
      }
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
      // Khóa học: mỗi user chỉ ghi danh 1 lần cho 1 khóa (unique userId+courseId) — "mua thêm số
      // lượng" là vô nghĩa, giữ nguyên quantity = 1, không cộng dồn như sản phẩm thông thường.
      if (itemType !== "Course") {
        cart.items[existingItemIndex].quantity += (quantity || 1);
      }
    } else {
      // Nếu chưa có, thêm mới
      cart.items.push({
        itemType,
        itemId,
        title,
        price,
        quantity: itemType === "Course" ? 1 : (quantity || 1),
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

    // Khóa học chỉ ghi danh 1 lần/user (unique userId+courseId) — không cho đổi số lượng.
    if (item.itemType === "Course" && quantity !== 1) {
      return res.status(400).json({ success: false, message: "Khóa học chỉ có thể mua với số lượng 1." });
    }

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

// Thanh toán giỏ hàng (tạo pending enrollments cho các khóa học trong giỏ)
export const checkoutCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { orderNum: clientOrderNum, paymentMethod } = req.body;

    if (!clientOrderNum) {
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

    // Nếu giỏ đang có khóa học nào thuộc 1 đơn "pending" chờ chuyển khoản mà CHƯA hết hạn
    // (ví dụ user vừa bấm Thanh toán, đang chờ QR, rồi thêm khóa khác vào giỏ và bấm Thanh
    // toán lần nữa) — gộp lần thanh toán này vào CÙNG mã đơn cũ đó thay vì phát mã mới, để
    // không làm "mồ côi" một giao dịch mà user có thể đã chuyển khoản ghi nội dung mã đơn cũ.
    let orderNum = clientOrderNum;
    for (const item of courseItems) {
      const existingPending = await Enrollment.findOne({
        userId,
        courseId: item.itemId,
        paymentStatus: "pending",
        paymentMethod: "transfer",
      });
      if (!existingPending) continue;
      const { expired } = await expireEnrollmentTransferIfNeeded(existingPending);
      if (expired || !existingPending.paymentRef) continue;
      orderNum = existingPending.paymentRef;
      break;
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

      // Đã mua/sở hữu khóa học rồi (paymentStatus "paid") — không tính lại tiền, chỉ đánh dấu
      // để dọn khỏi giỏ. Trường hợp này chỉ xảy ra với giỏ hàng cũ từ trước khi addToCart/getCart
      // chặn thêm/tự dọn khóa đã sở hữu.
      if (existing && existing.paymentStatus === "paid") {
        grantedCourseIds.push(String(item.itemId));
        continue;
      }

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

    // Chỉ xóa khỏi giỏ các khóa học đã được cấp quyền NGAY (miễn phí/nằm trong gói).
    // Khóa học đang chờ chuyển khoản ("pending") vẫn giữ nguyên trong giỏ — chỉ bị xóa khi
    // thanh toán thực sự được xác nhận (xem confirmEnrollmentTransferByAdmin trong paymentsService.js).
    // Nếu xóa ngay tại đây, user thoát trang thanh toán trước khi chuyển khoản sẽ mất giỏ hàng oan.
    cart.items = cart.items.filter(
      (item) => !(item.itemType === "Course" && grantedCourseIds.includes(String(item.itemId)))
    );
    await cart.save();

    res.json({ success: true, orderNum, totalDue, grantedCourseIds, message: "Đã gộp đơn hàng thành công." });
  } catch (error) {
    console.error("[Cart] checkoutCart error:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi thanh toán giỏ hàng." });
  }
};
