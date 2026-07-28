import mongoose from "mongoose";
import { Enrollment } from "../models/Enrollment.js";
import { Course } from "../models/Course.js";
import { enrollmentAccessGranted } from "../helpers/enrollmentAccess.js";
import { recordTransferPending, recordTransferSubmitted } from "../services/paymentsService.js";
import { incrementCourseEnrollmentCount } from "../services/courseStatsService.js";
import { serializeCourseForApi } from "../utils/resolveStoredUploadUrl.js";
import { newPaymentExpiresAt } from "../utils/transferPaymentExpiry.js";
import { expireEnrollmentTransferIfNeeded } from "../services/transferPaymentExpiryService.js";
import { resolveCourseAccessForUser } from "../utils/planGuard.js";
import { resolveInvoiceContext, buildInvoicePdfBuffer } from "../services/invoiceService.js";

function genOrderRef() {
  return `PI${Math.floor(Math.random() * 900000 + 100000)}`;
}

function extractOrderPart(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  return s.split("|")[0].trim().slice(0, 120);
}

function mergePaymentRef(orderPart, refRaw) {
  const order = extractOrderPart(orderPart);
  const fallback = extractOrderPart(refRaw);
  return (order || fallback).slice(0, 120);
}

export const EnrollmentController = {
  invoice: async (req, res, next) => {
    try {
      const result = await resolveInvoiceContext({
        type: "course",
        referenceId: req.params.id,
        requesterUserId: req.userId,
        requesterIsAdmin: req.userRole === "admin",
      });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      const buffer = await buildInvoicePdfBuffer(result);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="invoice-${result.payment._id}.pdf"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  },

  enroll: async (req, res, next) => {
    try {
      const { id: courseId } = req.params;
      const userId = req.userId;

      const course = await Course.findById(courseId);
      if (!course) return res.status(404).json({ success: false, error: "Không tìm thấy khóa học" });

      const price = Number(course.price || 0);
      // Professional: khóa học bao gồm trong gói (miễn phí). Student: giảm giá. Còn lại: giá gốc.
      const access = await resolveCourseAccessForUser(userId, price);
      // Ghi danh "expired" (CK quá hạn) không tính là ghi danh hiện hành — vẫn được giữ lại
      // document để đối soát webhook trễ, nên phải loại trừ tường minh ở đây (unique index cũng
      // là partial trên đúng field này — xem models/Enrollment.js).
      const existing = await Enrollment.findOne({ userId, courseId, paymentStatus: { $ne: "expired" } });

      if (existing) {
        if (enrollmentAccessGranted(existing)) {
          return res.json({ success: true, message: "Bạn đã ghi danh khóa học này rồi", enrollment: existing });
        }

        if (access.included) {
          existing.pricePaid = access.price;
          existing.paymentStatus = "paid";
          existing.paymentMethod = "plan_included";
          existing.paidAt = new Date();
          existing.lastAccessedAt = new Date();
          await existing.save();
          await incrementCourseEnrollmentCount(courseId);
          return res.json({ success: true, enrollment: existing, included: true });
        }

        const bodyPm = String(req.body?.paymentMethod || "").trim();
        if (access.effectivePrice > 0 && bodyPm === "transfer") {
          const expired = await expireEnrollmentTransferIfNeeded(existing);
          if (expired.expired) {
            // Ghi danh cũ đã hết hạn — tạo mới bên dưới.
          } else {
            const coursePrice = Math.round(access.effectivePrice);
            const clientOrder = extractOrderPart(req.body?.orderNum);
            let dirty = false;
            if (Math.round(Number(existing.pricePaid ?? 0)) !== coursePrice) {
              existing.pricePaid = coursePrice;
              dirty = true;
            }
            if (clientOrder && extractOrderPart(existing.paymentRef) !== clientOrder) {
              existing.paymentRef = clientOrder;
              dirty = true;
            }
            if (dirty) await existing.save();
            const orderPart = extractOrderPart(existing.paymentRef) || String(existing._id).slice(-8);
            return res.json({
              success: true,
              enrollment: existing,
              orderNum: orderPart,
              awaitingPayment: true,
              paymentExpiresAt: existing.paymentExpiresAt,
              discountPercent: access.discountPercent,
            });
          }
        } else {
          return res.status(400).json({
            success: false,
            error: "Ghi danh đang chờ thanh toán. Mở lại trang thanh toán để hoàn tất chuyển khoản.",
          });
        }
      }

      if (access.included) {
        const enrollment = await Enrollment.create({
          userId,
          courseId,
          pricePaid: access.price,
          paymentStatus: "paid",
          paymentMethod: "plan_included",
          paidAt: new Date(),
          lastAccessedAt: new Date(),
        });
        await incrementCourseEnrollmentCount(courseId);
        return res.status(201).json({ success: true, enrollment, included: true });
      }

      if (access.effectivePrice <= 0) {
        const enrollment = await Enrollment.create({
          userId,
          courseId,
          pricePaid: 0,
          paymentStatus: "paid",
          paymentMethod: "",
          lastAccessedAt: new Date(),
        });
        await incrementCourseEnrollmentCount(courseId);
        return res.status(201).json({ success: true, enrollment });
      }

      const pm = String(req.body?.paymentMethod || "").trim();
      if (pm !== "transfer") {
        return res.status(400).json({
          success: false,
          error: "Khóa học có phí. Vui lòng thanh toán chuyển khoản qua trang thanh toán.",
          requiresPayment: true,
          price: access.effectivePrice,
          discountPercent: access.discountPercent,
        });
      }

      const clientOrder = extractOrderPart(req.body?.orderNum);
      const orderRef = clientOrder || genOrderRef();
      const paymentExpiresAt = newPaymentExpiresAt();

      const enrollment = await Enrollment.create({
        userId,
        courseId,
        pricePaid: access.effectivePrice,
        paymentStatus: "pending",
        paymentMethod: "transfer",
        paymentRef: orderRef,
        paymentExpiresAt,
        lastAccessedAt: new Date(),
      });

      // Ledger pending cho CK khóa học
      const ledgerAmt = Math.round(Number(enrollment.pricePaid ?? 0));
      if (ledgerAmt > 0) {
        const ledger = await recordTransferPending({
          userId: enrollment.userId,
          type: "course",
          referenceModel: "Enrollment",
          referenceId: enrollment._id,
          amount: ledgerAmt,
          paymentExpiresAt,
        });
        if (!ledger.ok && !ledger.idempotent) {
          console.error("[enroll] ledger:", ledger.error);
        }
      }

      return res.status(201).json({
        success: true,
        enrollment,
        orderNum: enrollment.paymentRef,
        paymentExpiresAt: enrollment.paymentExpiresAt,
        discountPercent: access.discountPercent,
      });
    } catch (error) {
      next(error);
    }
  },

  submitTransfer: async (req, res, next) => {
    try {
      const { id: enrollmentId } = req.params;
      const userId = req.userId;
      if (!mongoose.isValidObjectId(enrollmentId)) {
        return res.status(400).json({ success: false, error: "id ghi danh không hợp lệ." });
      }

      const enrollment = await Enrollment.findOne({ _id: enrollmentId, userId });
      if (!enrollment) return res.status(404).json({ success: false, error: "Không tìm thấy ghi danh." });
      if (enrollment.paymentStatus === "paid" || enrollmentAccessGranted(enrollment)) {
        return res.status(400).json({ success: false, error: "Thanh toán đã được xử lý." });
      }
      if (enrollment.paymentMethod !== "transfer") {
        return res.status(400).json({ success: false, error: "Ghi danh này không dùng chuyển khoản." });
      }

      const refRaw = String(req.body?.reference ?? req.body?.transferReference ?? "").trim();
      const orderPart = String(enrollment.paymentRef || "").trim() || String(enrollment._id).slice(-8);
      enrollment.paymentRef = mergePaymentRef(orderPart, refRaw);
      enrollment.transferSubmittedAt = new Date();
      await enrollment.save();

      // Đồng bộ ledger (payments) tương tự booking CK.
      const ledgerAmt = Math.round(Number(enrollment.pricePaid ?? 0));
      if (ledgerAmt > 0) {
        const ensure = await recordTransferPending({
          userId: enrollment.userId,
          type: "course",
          referenceModel: "Enrollment",
          referenceId: enrollment._id,
          amount: ledgerAmt,
        });
        if (!ensure.ok && !ensure.idempotent) {
          console.error("[submitTransfer] ensure ledger:", ensure.error);
        } else {
          const meta = await recordTransferSubmitted({
            userId: enrollment.userId,
            type: "course",
            referenceId: enrollment._id,
            paymentRef: enrollment.paymentRef,
            submittedAt: enrollment.transferSubmittedAt,
          });
          if (!meta.ok) {
            console.error("[submitTransfer] ledger meta:", meta.error);
          }
        }
      }

      res.json({ success: true, enrollment });
    } catch (error) {
      next(error);
    }
  },

  getMyEnrollments: async (req, res, next) => {
    try {
      const enrollments = await Enrollment.find({ userId: req.userId })
        .populate({
          path: "courseId",
          populate: {
            path: "mentorId",
            populate: { path: "userId", select: "name avatar" },
          },
        })
        .sort({ updatedAt: -1 });

      // Ghi danh "pending" chờ chuyển khoản quá hạn (mà không ai còn đứng ở trang Checkout để
      // trigger expire qua polling) sẽ kẹt vĩnh viễn — khóa học không hiện lại "Mua khóa học"/
      // "Thêm vào giỏ hàng" được nữa. Dọn lazy tại đây mỗi lần load danh sách ghi danh.
      const active = [];
      for (const e of enrollments) {
        const { expired } = await expireEnrollmentTransferIfNeeded(e);
        if (!expired) active.push(e);
      }

      res.json({
        success: true,
        enrollments: active.map((e) => {
          const doc = e.toObject ? e.toObject() : e;
          if (doc.courseId) doc.courseId = serializeCourseForApi(doc.courseId);
          return doc;
        }),
      });
    } catch (error) {
      next(error);
    }
  },

  updateProgress: async (req, res, next) => {
    try {
      const { id: enrollmentId } = req.params;
      const { lessonId, isCompleted } = req.body;
      const userId = req.userId;

      const enrollment = await Enrollment.findOne({ _id: enrollmentId, userId });
      if (!enrollment) return res.status(404).json({ success: false, error: "Hồ sơ ghi danh không tồn tại" });
      if (!enrollmentAccessGranted(enrollment)) {
        return res.status(403).json({ success: false, error: "Hoàn tất thanh toán khóa học để cập nhật tiến độ." });
      }

      if (isCompleted) {
        if (!enrollment.completedLessons.includes(lessonId)) {
          enrollment.completedLessons.push(lessonId);
        }
      } else {
        enrollment.completedLessons = enrollment.completedLessons.filter(
          (id) => id.toString() !== lessonId.toString(),
        );
      }

      enrollment.lastLessonId = lessonId;
      enrollment.lastAccessedAt = new Date();

      const course = await Course.findById(enrollment.courseId);
      if (course) {
        let totalLessons = 0;
        if (Array.isArray(course.modules) && course.modules.length > 0) {
          course.modules.forEach((m) => {
            totalLessons += m.lessons?.length || 0;
          });
        } else if (Array.isArray(course.sections) && course.sections.length > 0) {
          course.sections.forEach((s) => {
            totalLessons += s.lessons?.length || 0;
          });
        }
        if (totalLessons > 0) {
          enrollment.progressPercent = Math.round((enrollment.completedLessons.length / totalLessons) * 100);
        }
      }

      await enrollment.save();
      res.json({ success: true, enrollment });
    } catch (error) {
      next(error);
    }
  },

  getCertificate: async (req, res, next) => {
    try {
      const { id: enrollmentId } = req.params;
      const userId = req.userId;

      const enrollment = await Enrollment.findOne({ _id: enrollmentId, userId })
        .populate("courseId")
        .populate("userId", "name");

      if (!enrollment) return res.status(404).json({ success: false, error: "Hồ sơ ghi danh không tồn tại" });
      if (!enrollmentAccessGranted(enrollment)) {
        return res.status(403).json({ success: false, error: "Hoàn tất thanh toán khóa học để nhận chứng chỉ." });
      }

      const course = enrollment.courseId;
      if (!course) return res.status(404).json({ success: false, error: "Không tìm thấy thông tin khóa học" });

      if (course.settings && course.settings.certificateEnabled === false) {
        return res.status(400).json({ success: false, error: "Khóa học này không cấp chứng chỉ" });
      }

      if (enrollment.progressPercent < 100 && !enrollment.isCompleted) {
        return res.status(400).json({ success: false, error: "Bạn cần hoàn thành 100% khóa học để nhận chứng chỉ" });
      }

      if (!enrollment.certificateUrl) {
        const certCode = `CERT-${enrollmentId.toString().slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        enrollment.certificateUrl = `https://prointerview.vn/certificates/${certCode}.pdf`;
        enrollment.certificateIssuedAt = new Date();
        enrollment.isCompleted = true;
        if (!enrollment.completedAt) enrollment.completedAt = new Date();

        await enrollment.save();
      }

      res.json({
        success: true,
        certificate: {
          url: enrollment.certificateUrl,
          issuedAt: enrollment.certificateIssuedAt,
          courseTitle: course.title,
          studentName: enrollment.userId?.name || "Học viên",
          code: enrollment.certificateUrl.split("/").pop().replace(".pdf", ""),
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
