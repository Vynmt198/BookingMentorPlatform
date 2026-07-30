import * as mentorsService from "../services/mentorsService.js";
import * as mentorMeService from "../services/mentorMeService.js";

/**
 * HTTP layer — gọi `mentorsService`.
 */
export class MentorsController {
  /**
   * GET /api/mentors/commission-policy — công khai, không cần đăng nhập.
   *
   * Trả cấu hình hoa hồng THẬT (đọc từ env qua `mentorCommissionConfig`) để trang đăng ký hiển
   * thị đúng số đang áp dụng. Hardcode ở frontend sẽ lệch ngay khi ai đó đổi biến môi trường.
   */
  static async commissionPolicy(_req, res, next) {
    try {
      const { mentorCommissionConfig, MIN_PAYOUT_VND } = await import(
        "../services/mentorCommissionService.js"
      );
      const { EARNINGS_HOLD_DAYS } = await import("../services/mentorEarningsService.js");
      const { Mentor } = await import("../models/Mentor.js");

      const cfg = mentorCommissionConfig();
      const earlyTaken = await Mentor.countDocuments({ "pricing.isEarlyMentor": true }).catch(() => 0);

      res.json({
        success: true,
        policy: {
          booking: { standardRate: cfg.bookingStandardRate, earlyRate: cfg.bookingEarlyRate },
          course: { standardRate: cfg.courseStandardRate, earlyRate: cfg.courseEarlyRate },
          early: {
            slots: cfg.earlySlots,
            taken: earlyTaken,
            remaining: Math.max(0, cfg.earlySlots - earlyTaken),
            durationYears: cfg.earlyYears,
          },
          payout: { holdDays: EARNINGS_HOLD_DAYS, minAmountVnd: MIN_PAYOUT_VND },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async apply(req, res, next) {
    try {
      const result = await mentorMeService.applyForMentor(req.userId, req.body ?? {});
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({
        success: true,
        message: "Đã gửi hồ sơ mentor, vui lòng chờ admin duyệt.",
        mentor: result.mentor,
      });
    } catch (err) {
      next(err);
    }
  }

  static async list(_req, res, next) {
    try {
      const result = await mentorsService.listMentors();
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, mentors: result.mentors });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const result = await mentorsService.getMentorById(req.params.id);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, mentor: result.mentor });
    } catch (err) {
      next(err);
    }
  }

  static async getAvailability(req, res, next) {
    try {
      const result = await mentorMeService.getAvailabilityByMentorId(req.params.id);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, availability: result.availability });
    } catch (err) {
      next(err);
    }
  }

  static async getReviews(req, res, next) {
    try {
      const result = await mentorMeService.listReviewsForMentor(req.params.id);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, reviews: result.reviews });
    } catch (err) {
      next(err);
    }
  }
}
