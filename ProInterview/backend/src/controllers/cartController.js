import { Cart } from "../models/Cart.js";
import { Enrollment } from "../models/Enrollment.js";
import mongoose from "mongoose";
import { enrollmentAccessGranted } from "../helpers/enrollmentAccess.js";
import { recordTransferPending } from "../services/paymentsService.js";
import { newPaymentExpiresAt } from "../utils/transferPaymentExpiry.js";

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

    const itemIdStr = String(itemId).trim();
    if (!mongoose.isValidObjectId(itemIdStr)) {
      return res.status(400).json({
        success: false,
        message: "Mã khóa học không hợp lệ. Tải lại danh sách khóa học.",
      });
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
        itemId: itemIdStr,
        title,
        price: Number(price) || 0,
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

function extractOrderPart(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  return s.split("|")[0].trim().slice(0, 120);
}

// Thanh toán giỏ hàng (tạo pending enrollments + ledger CK cho SePay)
export const checkoutCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { orderNum, paymentMethod } = req.body;
    const pm = String(paymentMethod || "transfer").trim() || "transfer";

    const orderRef = extractOrderPart(orderNum);
    if (!orderRef) {
      return res.status(400).json({ success: false, message: "Thiếu mã đơn hàng (orderNum)." });
    }
    if (pm !== "transfer") {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng hiện chỉ hỗ trợ thanh toán chuyển khoản.",
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Giỏ hàng trống." });
    }

    const courseItems = cart.items.filter((item) => item.itemType === "Course");
    if (courseItems.length === 0) {
      return res.status(400).json({ success: false, message: "Chỉ hỗ trợ thanh toán khóa học trong giỏ hàng." });
    }

    const paymentExpiresAt = newPaymentExpiresAt();
    const enrollmentIds = [];
    let cartTotal = 0;

    for (const item of courseItems) {
      const linePrice = Math.round(Number(item.price) || 0) * Math.max(1, Number(item.quantity) || 1);
      cartTotal += linePrice;

      const existing = await Enrollment.findOne({ userId, courseId: item.itemId });
      if (existing) {
        if (enrollmentAccessGranted(existing)) continue;
        if (existing.paymentStatus === "pending") {
          existing.paymentRef = orderRef;
          existing.paymentMethod = pm;
          existing.pricePaid = linePrice;
          existing.paymentExpiresAt = paymentExpiresAt;
          await existing.save();
          enrollmentIds.push(String(existing._id));
        }
        continue;
      }

      const created = await Enrollment.create({
        userId,
        courseId: item.itemId,
        paymentMethod: pm,
        paymentStatus: "pending",
        pricePaid: linePrice,
        paymentRef: orderRef,
        paymentExpiresAt,
        transferForceConfirm: false,
        lastAccessedAt: new Date(),
      });
      enrollmentIds.push(String(created._id));
    }

    if (enrollmentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tất cả khóa học trong giỏ đã được ghi danh hoặc đang chờ thanh toán khác.",
      });
    }

    const firstEnrollmentId = enrollmentIds[0];
    const isCartBatch = enrollmentIds.length > 1;

    if (isCartBatch) {
      const ledger = await recordTransferPending({
        userId,
        type: "course",
        referenceModel: "Enrollment",
        referenceId: firstEnrollmentId,
        amount: cartTotal,
        providerRef: orderRef,
        paymentExpiresAt,
      });
      if (!ledger.ok && !ledger.idempotent) {
        console.error("[Cart] cart batch ledger:", ledger.error);
        return res.status(500).json({ success: false, message: "Không tạo được giao dịch chờ chuyển khoản." });
      }
      if (ledger.paymentId) {
        await PaymentCartMeta(ledger.paymentId, enrollmentIds);
      }
    } else {
      const ledgerAmt = Math.round(cartTotal);
      if (ledgerAmt > 0) {
        const ledger = await recordTransferPending({
          userId,
          type: "course",
          referenceModel: "Enrollment",
          referenceId: firstEnrollmentId,
          amount: ledgerAmt,
          providerRef: orderRef,
          paymentExpiresAt,
        });
        if (!ledger.ok && !ledger.idempotent) {
          console.error("[Cart] single ledger:", ledger.error);
        }
      }
    }

    cart.items = cart.items.filter((item) => item.itemType !== "Course");
    await cart.save();

    res.json({
      success: true,
      orderNum: orderRef,
      cartTotal,
      enrollmentIds,
      cartBatch: isCartBatch,
      paymentExpiresAt,
      message: "Đã gộp đơn hàng thành công.",
    });
  } catch (error) {
    console.error("[Cart] checkoutCart error:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi thanh toán giỏ hàng." });
  }
};

async function PaymentCartMeta(paymentId, enrollmentIds) {
  const { Payment } = await import("../models/Payment.js");
  await Payment.updateOne(
    { _id: paymentId },
    {
      $set: {
        "providerResponse.cartCheckout": true,
        "providerResponse.enrollmentIds": enrollmentIds.map(String),
        "providerResponse.channel": "bank_transfer",
      },
    },
  );
}
