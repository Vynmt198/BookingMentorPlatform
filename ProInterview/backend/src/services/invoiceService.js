import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";
import { Payment } from "../models/Payment.js";
import { Booking } from "../models/Booking.js";
import { Enrollment } from "../models/Enrollment.js";
import { Course } from "../models/Course.js";
import { Mentor } from "../models/Mentor.js";
import { User } from "../models/User.js";
import { planKeyFromSubscriptionMeta } from "../utils/planKeys.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** pdfkit dùng Standard 14 fonts (WinAnsi) không hiển thị đúng dấu tiếng Việt — nhúng DejaVu Sans (full Unicode). */
const FONT_REGULAR_PATH = path.join(__dirname, "../assets/fonts/DejaVuSans.ttf");
const FONT_BOLD_PATH = path.join(__dirname, "../assets/fonts/DejaVuSans-Bold.ttf");

const SESSION_TYPE_LABELS = {
  mock_interview: "Phỏng vấn thử",
  cv_review: "Review CV",
  career_consulting: "Tư vấn định hướng",
  custom: "Buổi tư vấn",
};

const PLAN_LABELS = {
  free: "Free",
  student: "Student",
  professional: "Professional",
};

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function vnDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

async function loadReferenceDescription(payment) {
  const t = payment.type;
  if (t === "booking") {
    const booking = await Booking.findById(payment.referenceId).lean();
    if (!booking) return { description: "Buổi mentor", subtotal: payment.amount, vat: 0 };
    const mentor = await Mentor.findById(booking.mentorId).select("name").lean();
    const label = SESSION_TYPE_LABELS[booking.sessionType] || "Buổi mentor";
    const description = `${label} với ${mentor?.name || "mentor"} — ${booking.date} ${booking.timeSlot}`;
    const total = Math.round(Number(booking.totalAmount ?? payment.amount) || 0);
    const vat = Math.round(Number(booking.vat) || 0);
    return { description, subtotal: total - vat, vat };
  }
  if (t === "course") {
    const enrollment = await Enrollment.findById(payment.referenceId).select("courseId").lean();
    const course = enrollment ? await Course.findById(enrollment.courseId).select("title").lean() : null;
    const description = `Khóa học — ${course?.title || "Khóa học"}`;
    return { description, subtotal: payment.amount, vat: 0 };
  }
  if (t === "subscription") {
    const plan = planKeyFromSubscriptionMeta(payment.providerResponse?.plan) || "student";
    const billing = payment.providerResponse?.billing === "yearly" ? "Hàng năm" : "Hàng tháng";
    const description = `Gói ${PLAN_LABELS[plan] || plan} (${billing})`;
    return { description, subtotal: payment.amount, vat: 0 };
  }
  return { description: "Giao dịch", subtotal: payment.amount, vat: 0 };
}

/**
 * Tìm payment + xác thực quyền xem hóa đơn, trả về context đủ để render PDF.
 * Chỉ giao dịch `status: "success"` mới có hóa đơn.
 */
export async function resolveInvoiceContext({
  paymentId,
  type,
  referenceId,
  requesterUserId,
  requesterIsAdmin,
}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: "MongoDB chưa kết nối." };

  let payment;
  if (paymentId) {
    if (!mongoose.isValidObjectId(paymentId)) return { ok: false, status: 400, error: "paymentId không hợp lệ." };
    payment = await Payment.findById(paymentId).lean();
  } else {
    if (!mongoose.isValidObjectId(referenceId)) return { ok: false, status: 400, error: "id không hợp lệ." };
    payment = await Payment.findOne({ type, referenceId, status: "success" })
      .sort({ paidAt: -1, createdAt: -1 })
      .lean();
  }

  if (!payment) return { ok: false, status: 404, error: "Không tìm thấy giao dịch." };
  if (payment.status !== "success") {
    return { ok: false, status: 400, error: "Giao dịch chưa thanh toán thành công." };
  }
  if (!requesterIsAdmin && String(payment.userId) !== String(requesterUserId)) {
    return { ok: false, status: 403, error: "Bạn không có quyền xem hóa đơn này." };
  }

  const buyerUser = await User.findById(payment.userId).select("name email").lean();
  const buyer = {
    name: payment.invoiceName || buyerUser?.name || "",
    email: payment.invoiceEmail || buyerUser?.email || "",
    address: payment.invoiceAddress || "",
  };

  const { description, subtotal, vat } = await loadReferenceDescription(payment);
  const total = Math.round(Number(payment.amount) || 0);

  return {
    ok: true,
    payment,
    buyer,
    description,
    subtotal: Math.max(0, subtotal),
    vat: Math.max(0, vat),
    total,
    paidAt: payment.paidAt || payment.createdAt,
  };
}

const SELLER_NAME = process.env.INVOICE_SELLER_NAME || "ProInterview";
const SELLER_ADDRESS = process.env.INVOICE_SELLER_ADDRESS || "";
const SELLER_EMAIL = process.env.INVOICE_SELLER_EMAIL || "support@prointerview.vn";

function invoiceNumberFor(payment) {
  return `INV-${String(payment._id).slice(-8).toUpperCase()}`;
}

const PROVIDER_LABELS = {
  momo: "MoMo",
  zalopay: "ZaloPay",
  vnpay: "VNPay",
  card: "Thẻ",
  transfer: "Chuyển khoản ngân hàng",
};

function vnd(n) {
  return `${Number(n || 0).toLocaleString("vi-VN")} đ`;
}

/** Sinh PDF hóa đơn từ context trả về bởi `resolveInvoiceContext`. */
export function buildInvoicePdfBuffer(ctx) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.registerFont("AppFont", FONT_REGULAR_PATH);
    doc.registerFont("AppFont-Bold", FONT_BOLD_PATH);
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const invoiceNumber = invoiceNumberFor(ctx.payment);
    const issueDate = vnDate(ctx.paidAt);

    doc.font("AppFont-Bold").fontSize(24).text("HÓA ĐƠN", { align: "left" });
    doc.moveDown(0.5);

    doc.font("AppFont").fontSize(10).fillColor("#444");
    doc.text(`Số hóa đơn: ${invoiceNumber}`);
    doc.text(`Ngày phát hành: ${issueDate}`);
    doc.text(`Phương thức thanh toán: ${PROVIDER_LABELS[ctx.payment.provider] || ctx.payment.provider}`);
    if (ctx.payment.providerRef) doc.text(`Mã tham chiếu: ${ctx.payment.providerRef}`);
    doc.moveDown(1);

    const colX = 50;
    const colWidth = 250;
    const startY = doc.y;

    const lineHeight = 14;
    doc.font("AppFont-Bold").fontSize(10).fillColor("#000").text("Bên bán", colX, startY, { width: colWidth - 10 });
    doc.font("AppFont").fontSize(10).fillColor("#333");
    let sellerY = startY + lineHeight;
    doc.text(SELLER_NAME, colX, sellerY, { width: colWidth - 10 });
    sellerY += lineHeight;
    if (SELLER_ADDRESS) {
      doc.text(SELLER_ADDRESS, colX, sellerY, { width: colWidth - 10 });
      sellerY += lineHeight;
    }
    doc.text(SELLER_EMAIL, colX, sellerY, { width: colWidth - 10 });
    sellerY += lineHeight;

    doc.font("AppFont-Bold").fontSize(10).fillColor("#000").text("Bên mua", colX + colWidth, startY, { width: colWidth - 10 });
    doc.font("AppFont").fontSize(10).fillColor("#333");
    let buyerY = startY + lineHeight;
    doc.text(ctx.buyer.name || "—", colX + colWidth, buyerY, { width: colWidth - 10 });
    buyerY += lineHeight;
    if (ctx.buyer.address) {
      doc.text(ctx.buyer.address, colX + colWidth, buyerY, { width: colWidth - 10 });
      buyerY += lineHeight;
    }
    doc.text(ctx.buyer.email || "", colX + colWidth, buyerY, { width: colWidth - 10 });
    buyerY += lineHeight;

    doc.y = Math.max(sellerY, buyerY) + 20;

    const tableTop = doc.y;
    const tableX = 50;
    const tableWidth = 495;
    doc.font("AppFont-Bold").fontSize(9).fillColor("#fff");
    doc.rect(tableX, tableTop, tableWidth, 22).fill("#1e1b4b");
    doc.fillColor("#fff");
    doc.text("Mô tả", tableX + 10, tableTop + 6, { width: 260 });
    doc.text("SL", tableX + 275, tableTop + 6, { width: 30, align: "center" });
    doc.text("Đơn giá", tableX + 305, tableTop + 6, { width: 90, align: "right" });
    doc.text("Thành tiền", tableX + 395, tableTop + 6, { width: 90, align: "right" });

    const rowY = tableTop + 22;
    doc.font("AppFont").fontSize(9).fillColor("#222");
    doc.text(ctx.description, tableX + 10, rowY + 8, { width: 260 });
    doc.text("1", tableX + 275, rowY + 8, { width: 30, align: "center" });
    doc.text(vnd(ctx.subtotal), tableX + 305, rowY + 8, { width: 90, align: "right" });
    doc.text(vnd(ctx.total), tableX + 395, rowY + 8, { width: 90, align: "right" });
    doc.moveTo(tableX, rowY + 32).lineTo(tableX + tableWidth, rowY + 32).strokeColor("#ddd").stroke();

    let summaryY = rowY + 45;
    const summaryLabelX = tableX + 305;
    const summaryValueW = 90;
    doc.font("AppFont").fontSize(9).fillColor("#444");
    doc.text("Tạm tính", summaryLabelX - 90, summaryY, { width: 90 });
    doc.text(vnd(ctx.subtotal), summaryLabelX + 90 - 90, summaryY, { width: summaryValueW, align: "right" });

    summaryY += 16;
    const vatRatePct = ctx.subtotal > 0 && ctx.vat > 0 ? Math.round((ctx.vat / ctx.subtotal) * 100) : 0;
    doc.text(`VAT${vatRatePct > 0 ? ` (${vatRatePct}%)` : ""}`, summaryLabelX - 90, summaryY, { width: 90 });
    doc.text(vnd(ctx.vat), summaryLabelX + 90 - 90, summaryY, { width: summaryValueW, align: "right" });

    summaryY += 16;
    doc.moveTo(summaryLabelX - 90, summaryY - 4).lineTo(tableX + tableWidth, summaryY - 4).strokeColor("#ddd").stroke();
    doc.font("AppFont-Bold").fontSize(11).fillColor("#000");
    doc.text("Tổng cộng", summaryLabelX - 90, summaryY, { width: 90 });
    doc.text(vnd(ctx.total), summaryLabelX + 90 - 90, summaryY, { width: summaryValueW, align: "right" });

    doc.moveDown(4);
    doc.font("AppFont").fontSize(8).fillColor("#999");
    doc.text("Đây là hóa đơn điện tử được tạo tự động, không cần chữ ký hay con dấu.", tableX, doc.y);

    doc.end();
  });
}
