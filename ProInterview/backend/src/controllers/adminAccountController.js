/**
 * Vòng đời tài khoản phía admin: xem trước tác động khi khóa/đóng, đóng tài khoản qua cổng,
 * và tạo yêu cầu rút tiền thay mặt mentor đang bị tạm ngưng.
 *
 * Tách khỏi `adminController.js` để phần này không chạm vào file đang có thay đổi song song.
 */
import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";
import { Course } from "../models/Course.js";
import { Enrollment } from "../models/Enrollment.js";
import { Mentor } from "../models/Mentor.js";
import { Payment } from "../models/Payment.js";
import { PayoutRequest } from "../models/PayoutRequest.js";
import { User } from "../models/User.js";
import { canCloseAccount, closeAccount } from "../services/accountClosureService.js";
import { previewSuspensionRefunds } from "../services/mentorSuspensionRefundService.js";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export const AdminAccountController = {
  /**
   * GET /api/admin/users/:id/impact
   * Chỉ đọc + đếm — an toàn gọi thoải mái từ UI trước khi khóa hoặc đóng.
   */
  getAccountImpact: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, error: "userId không hợp lệ." });
      }
      const user = await User.findById(id).select("name email role isActive plan planExpiresAt").lean();
      if (!user) return res.status(404).json({ success: false, error: "Không tìm thấy người dùng." });

      const mentor = await Mentor.findOne({ userId: id }).select("finance status").lean();

      let mentorImpact = null;
      if (mentor) {
        const f = mentor.finance || {};
        const clearing = Math.round(Number(f.clearingBalance) || 0);
        const available = Math.round(Number(f.availableBalance) || 0);
        const pending = Math.round(Number(f.pendingBalance) || 0);
        const courseIds = await Course.find({ mentorId: mentor._id }).distinct("_id");

        const [openPayouts, unclearedB, unclearedE, failedB, failedE, upcoming] = await Promise.all([
          PayoutRequest.countDocuments({ mentorId: mentor._id, status: { $in: ["pending", "approved"] } }),
          Booking.countDocuments({
            mentorId: mentor._id,
            earningsClearAt: { $ne: null },
            earningsClearedAt: { $in: [null, undefined] },
          }),
          courseIds.length
            ? Enrollment.countDocuments({
                courseId: { $in: courseIds },
                earningsClearAt: { $ne: null },
                earningsClearedAt: { $in: [null, undefined] },
              })
            : 0,
          Booking.countDocuments({ mentorId: mentor._id, earningsClearFailedAt: { $ne: null } }),
          courseIds.length
            ? Enrollment.countDocuments({ courseId: { $in: courseIds }, earningsClearFailedAt: { $ne: null } })
            : 0,
          Booking.countDocuments({
            mentorId: mentor._id,
            status: { $in: ["confirmed", "in_progress"] },
            date: { $gte: todayIsoDate() },
          }),
        ]);

        const refundPreview = await previewSuspensionRefunds(mentor._id);

        mentorImpact = {
          mentorId: String(mentor._id),
          status: mentor.status || "active",
          /** Buổi đã bán sẽ bị hủy + hoàn tiền cho học viên ngay khi tạm ngưng. */
          bookingsToRefund: refundPreview.count,
          bookingsToRefundVnd: refundPreview.totalVnd,
          finance: { clearingBalance: clearing, availableBalance: available, pendingBalance: pending, total: clearing + available + pending },
          openPayoutRequests: openPayouts,
          unclearedRows: unclearedB + unclearedE,
          failedClearances: failedB + failedE,
          upcomingBookings: upcoming,
        };
      }

      const [studentUnusedBookings, activeEnrollments, heldPayments] = await Promise.all([
        Booking.countDocuments({
          userId: id,
          paymentStatus: "paid",
          status: { $in: ["pending", "confirmed", "in_progress"] },
          date: { $gte: todayIsoDate() },
        }),
        Enrollment.countDocuments({ userId: id, paymentStatus: "paid" }),
        Payment.countDocuments({ userId: id, status: { $in: ["held_inactive_account", "refund_pending"] } }),
      ]);

      const planActive =
        Boolean(user.plan) && user.plan !== "free" && user.planExpiresAt && new Date(user.planExpiresAt) > new Date();

      const gate = await canCloseAccount(id);

      res.json({
        success: true,
        impact: {
          user: { id: String(user._id), name: user.name, email: user.email, role: user.role, isActive: user.isActive !== false },
          mentor: mentorImpact,
          asStudent: {
            unusedPaidBookings: studentUnusedBookings,
            activeEnrollments,
            heldPayments,
            plan: user.plan || "free",
            planExpiresAt: user.planExpiresAt || null,
            planActive: Boolean(planActive),
          },
          closeChecks: gate.checks,
          canClose: gate.ok,
          blockers: gate.blockers,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/admin/payments/held
   * Hàng đợi giao dịch bị giữ vì người trả đang bị khóa (`held_inactive_account`).
   *
   * CHỈ ĐỌC — không có logic hoàn tiền. Mục đích là để hàng đợi này nhìn thấy được thay vì chỉ
   * nằm trong log; UI duyệt sẽ gắn vào đây khi luồng refund được làm.
   * Query: page, limit (max 100).
   */
  getHeldPayments: async (req, res, next) => {
    try {
      const pageRaw = Number.parseInt(String(req.query?.page ?? "").trim(), 10);
      const limitRaw = Number.parseInt(String(req.query?.limit ?? "").trim(), 10);
      const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
      const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 25;

      const filter = { status: "held_inactive_account" };
      const [payments, total, sum] = await Promise.all([
        Payment.find(filter)
          .sort({ heldAt: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate("userId", "name email isActive")
          .lean(),
        Payment.countDocuments(filter),
        Payment.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
      ]);

      res.json({
        success: true,
        payments,
        totalAmount: Math.round(Number(sum?.[0]?.amount) || 0),
        pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      });
    } catch (error) {
      next(error);
    }
  },

  /** POST /api/admin/users/:id/close — đóng vĩnh viễn (soft), bắt buộc qua cổng. */
  closeAccount: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, error: "userId không hợp lệ." });
      }
      const result = await closeAccount(id, { closedBy: req.userId || null });
      if (!result.ok) {
        return res.status(result.status).json({
          success: false,
          error: result.error,
          ...(result.blockers ? { blockers: result.blockers, checks: result.checks } : {}),
        });
      }
      res.json({ success: true, closedAt: result.closedAt, mentorId: result.mentorId });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/admin/mentors/:id/payouts — admin tạo yêu cầu rút thay mặt mentor.
   *
   * Dành cho mentor `suspended` không đăng nhập được nhưng vẫn còn số dư. Dùng đúng lệnh
   * trừ số dư atomic như luồng mentor tự tạo, rồi chảy vào approve/mark-paid đã có guard.
   */
  createPayoutForMentor: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, error: "mentorId không hợp lệ." });
      }
      const amount = Math.round(Number(req.body?.amount));
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: "amount không hợp lệ." });
      }
      const reason = String(req.body?.reason || "").trim().slice(0, 2000);

      const mentor = await Mentor.findById(id).select("finance status").lean();
      if (!mentor) return res.status(404).json({ success: false, error: "Không tìm thấy mentor." });
      if (mentor.status === "closed") {
        return res.status(400).json({ success: false, error: "Hồ sơ mentor đã đóng — không tạo yêu cầu rút mới." });
      }

      // Chọn tài khoản nhận tiền: theo `bankAccountId` nếu admin chỉ định, không thì lấy mặc định.
      const accounts = Array.isArray(mentor.finance?.bankAccounts) ? mentor.finance.bankAccounts : [];
      // Nhận cả `accountId` cho khớp tên field mà API mentor tự rút đang dùng.
      const wantedId = String(req.body?.bankAccountId || req.body?.accountId || "").trim();
      const picked = wantedId
        ? accounts.find((a) => String(a._id) === wantedId)
        : accounts.find((a) => a.isDefault) || accounts[0];
      if (!picked?.bankName || !picked?.accountNumber) {
        return res.status(400).json({
          success: false,
          error: "Mentor chưa có tài khoản nhận tiền hợp lệ — không thể tạo yêu cầu rút.",
        });
      }

      // Trừ số dư atomic TRƯỚC khi tạo PayoutRequest (cùng pattern mentorDashboardService.requestPayout).
      const debited = await Mentor.updateOne(
        { _id: id, "finance.availableBalance": { $gte: amount } },
        { $inc: { "finance.availableBalance": -amount, "finance.pendingBalance": amount } },
      );
      if (debited.modifiedCount !== 1) {
        return res.status(409).json({ success: false, error: "Số dư khả dụng không đủ." });
      }

      let payout;
      try {
        payout = await PayoutRequest.create({
          mentorId: id,
          amount,
          status: "pending",
          payoutAccount: {
            bankName: picked.bankName,
            accountNumber: picked.accountNumber,
            accountName: picked.accountName || "",
          },
          requestedAt: new Date(),
          createdByAdmin: req.userId || null,
          adminReason: reason,
        });
      } catch (err) {
        // Rollback số dư đã trừ nếu không tạo được yêu cầu.
        await Mentor.updateOne(
          { _id: id },
          { $inc: { "finance.availableBalance": amount, "finance.pendingBalance": -amount } },
        ).catch(() => {});
        throw err;
      }

      res.status(201).json({ success: true, payout });
    } catch (error) {
      next(error);
    }
  },
};
