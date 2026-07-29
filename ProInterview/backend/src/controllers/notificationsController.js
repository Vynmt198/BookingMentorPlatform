import { Notification, Mentor, User } from "../models/index.js";
import { ensureMentorPendingNotification } from "../services/mentorMeService.js";
import { ensureWelcomeNotification } from "../services/notificationDeliveryService.js";

export const NotificationsController = {
  /** Lấy danh sách thông báo của user hiện tại */
  list: async (req, res, next) => {
    try {
      const userId = req.userId;
      const mentorPending = await Mentor.findOne({
        userId,
        "adminReview.status": "pending",
      })
        .select("_id")
        .lean();
      if (mentorPending) {
        try {
          await ensureMentorPendingNotification(userId);
        } catch {
          /* ignore */
        }
      }
      try {
        const u = await User.findById(userId).select("name").lean();
        await ensureWelcomeNotification(userId, { name: u?.name });
      } catch {
        /* ignore */
      }
      const rawLimit = Number(req.query?.limit);
      const limit = Number.isFinite(rawLimit)
        ? Math.min(Math.max(Math.floor(rawLimit), 1), 200)
        : 100;
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
      res.json({ success: true, notifications });
    } catch (error) {
      console.error("[Notifications Error] list:", error);
      next(error);
    }
  },

  /** Đánh dấu đã đọc */
  markAsRead: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.userId;

      const notification = await Notification.findOneAndUpdate(
        { _id: id, userId },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ success: false, error: "Thông báo không tồn tại" });
      }

      res.json({ success: true, notification });
    } catch (error) {
      next(error);
    }
  },

  /** Đánh dấu tất cả đã đọc */
  markAllRead: async (req, res, next) => {
    try {
      const userId = req.userId;
      await Notification.updateMany(
        { userId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  /** Đếm số lượng chưa đọc */
  getUnreadCount: async (req, res, next) => {
    try {
      const userId = req.userId;
      const count = await Notification.countDocuments({ userId, isRead: false });
      res.json({ success: true, count });
    } catch (error) {
      next(error);
    }
  },

  /** Xóa thông báo */
  delete: async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.userId;
      const deleted = await Notification.findOneAndDelete({ _id: id, userId });
      if (!deleted) return res.status(404).json({ success: false, error: "Không tìm thấy thông báo để xóa" });
      res.json({ success: true, message: "Đã xóa thông báo" });
    } catch (error) {
      next(error);
    }
  },
};
