import express from "express";
import { MentorsController } from "../controllers/mentorsController.js";
import { authJwt } from "../middleware/authJwt.js";
import { requireMentor, requireActiveMentor } from "../middleware/requireMentor.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { MentorMeController } from "../controllers/mentorMeController.js";

export const mentorsRouter = express.Router();

mentorsRouter.get("/", asyncHandler(MentorsController.list));
/** Công khai — trang đăng ký mentor đọc để hiển thị đúng % hoa hồng đang áp dụng. */
mentorsRouter.get("/commission-policy", asyncHandler(MentorsController.commissionPolicy));
mentorsRouter.post("/apply", authJwt, asyncHandler(MentorsController.apply));
/** Đọc hồ sơ mentor của chính mình (kể cả customer đang chờ duyệt) — không dùng requireMentor. */
mentorsRouter.get("/me", authJwt, asyncHandler(MentorMeController.getMe));
mentorsRouter.patch("/me", authJwt, requireMentor, requireActiveMentor("cập nhật hồ sơ cố vấn"), asyncHandler(MentorMeController.patchMe));
mentorsRouter.patch("/me/availability", authJwt, requireMentor, requireActiveMentor("thêm lịch rảnh mới để nhận booking"), asyncHandler(MentorMeController.patchAvailability));
mentorsRouter.patch("/me/availability/block", authJwt, requireMentor, requireActiveMentor("thay đổi lịch bận"), asyncHandler(MentorMeController.blockDates));
mentorsRouter.get("/:id/availability", asyncHandler(MentorsController.getAvailability));
mentorsRouter.get("/:id/reviews", asyncHandler(MentorsController.getReviews));
mentorsRouter.get("/:id", asyncHandler(MentorsController.getById));
