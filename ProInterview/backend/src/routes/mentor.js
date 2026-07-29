import { Router } from "express";
import { authJwt } from "../middleware/authJwt.js";
import { requireMentor, requireActiveMentor } from "../middleware/requireMentor.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { MentorController } from "../controllers/mentorController.js";

export const mentorRouter = Router();

/**
 * Trạng thái hồ sơ của chính mentor đang đăng nhập — để khu /mentor/* hiện banner khi bị tạm
 * ngưng. `requireMentor` đã tính sẵn `req.mentorStatus` nên không cần query thêm.
 */
mentorRouter.get("/status", authJwt, requireMentor, (req, res) => {
  res.json({ success: true, status: req.mentorStatus, mentorId: String(req.mentorId) });
});

mentorRouter.get("/dashboard", authJwt, requireMentor, asyncHandler(MentorController.dashboard));
mentorRouter.get("/finance", authJwt, requireMentor, asyncHandler(MentorController.finance));
mentorRouter.get("/analytics", authJwt, requireMentor, asyncHandler(MentorController.analytics));
/**
 * Hàng chờ đánh giá chéo — KHÔNG trả 403 khi bị tạm ngưng.
 *
 * Đây là route đọc, frontend gọi mỗi lần vào trang; trả lỗi ở đây nghĩa là mỗi lần render lại
 * bắn thêm một toast đỏ. Thay vào đó trả danh sách rỗng kèm cờ `restricted` — mentor không có
 * gì để bấm, banner ở khu /mentor/* đã giải thích lý do. Việc gửi đánh giá vẫn bị chặn ở POST.
 */
mentorRouter.get(
  "/peer-reviews",
  authJwt,
  requireMentor,
  (req, res, next) => {
    if (req.mentorStatus !== "active") {
      return res.json({
        success: true,
        items: [],
        restricted: true,
        reason: "Hồ sơ cố vấn đang tạm ngưng — chưa tham gia đánh giá chéo được.",
      });
    }
    next();
  },
  asyncHandler(MentorController.peerReviewQueue),
);
mentorRouter.post("/peer-reviews/:courseId", authJwt, requireMentor, requireActiveMentor("gửi đánh giá chéo"), asyncHandler(MentorController.submitPeerReview));
mentorRouter.get("/reviews", authJwt, requireMentor, asyncHandler(MentorController.reviews));
mentorRouter.post("/payout", authJwt, requireMentor, asyncHandler(MentorController.payout));
mentorRouter.get("/payouts", authJwt, requireMentor, asyncHandler(MentorController.payoutHistory));
mentorRouter.get("/payout-accounts", authJwt, requireMentor, asyncHandler(MentorController.payoutAccounts));
mentorRouter.post("/payout-accounts", authJwt, requireMentor, asyncHandler(MentorController.addPayoutAccount));
mentorRouter.delete(
  "/payout-accounts/:accountId",
  authJwt,
  requireMentor,
  asyncHandler(MentorController.deletePayoutAccount),
);
mentorRouter.post("/request-price-change", authJwt, requireMentor, requireActiveMentor("gửi yêu cầu đổi giá"), asyncHandler(MentorController.requestPriceChange));
