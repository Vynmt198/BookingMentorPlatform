import * as mentorsService from "../services/mentorsService.js";
import * as mentorMeService from "../services/mentorMeService.js";

/**
 * HTTP layer — gọi `mentorsService`.
 */
export class MentorsController {
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
