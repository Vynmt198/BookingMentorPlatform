import mongoose from "mongoose";
import * as bookingsService from "../services/bookingsService.js";
import * as reviewsService from "../services/reviewsService.js";
import { Booking } from "../models/Booking.js";

export class BookingsController {
  static async list(req, res, next) {
    try {
      const result = await bookingsService.listMyBookings(req.userId);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, bookings: result.bookings });
    } catch (err) {
      next(err);
    }
  }

  static async listForMentor(req, res, next) {
    try {
      const result = await bookingsService.listMentorBookings(req.userId);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, bookings: result.bookings });
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      const result = await bookingsService.createBooking(req.userId, req.body ?? {});
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.status(201).json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  static async confirmForMentor(req, res, next) {
    try {
      const result = await bookingsService.confirmMentorBooking(req.userId, req.params.id);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  static async completeForMentor(req, res, next) {
    try {
      const result = await bookingsService.completeMentorBooking(req.userId, req.params.id);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  static async startMeeting(req, res, next) {
    try {
      const result = await bookingsService.startBookingMeeting(req.userId, req.params.id, {
        asMentor: false,
      });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  static async startMeetingForMentor(req, res, next) {
    try {
      const result = await bookingsService.startBookingMeeting(req.userId, req.params.id, {
        asMentor: true,
      });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  static async updateNotesForMentor(req, res, next) {
    try {
      const result = await bookingsService.updateMentorNotes(req.userId, req.params.id, req.body ?? {});
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  static async reschedule(req, res, next) {
    try {
      const result = await bookingsService.rescheduleMyBooking(req.userId, req.params.id, req.body ?? {});
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const result = await bookingsService.getMyBooking(req.userId, req.params.id);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  static async getByIdForMentor(req, res, next) {
    try {
      const result = await bookingsService.getMentorBooking(req.userId, req.params.id);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  static async updateRefundDestination(req, res, next) {
    try {
      const result = await bookingsService.updateMyBookingRefundDestination(
        req.userId,
        req.params.id,
        req.body ?? {},
      );
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  static async getRebookCredit(req, res, next) {
    try {
      const result = await bookingsService.getRebookCreditForUser(req.userId, req.params.id);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, credit: result.credit });
    } catch (err) {
      next(err);
    }
  }

  static async reportNoShow(req, res, next) {
    try {
      const result = await bookingsService.processBookingNoShow(req.params.id, req.body ?? {}, {
        markedBy: "user",
        actorUserId: req.userId,
      });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({
        success: true,
        booking: result.booking,
        refundAmountVnd: result.refundAmountVnd,
      });
    } catch (err) {
      next(err);
    }
  }

  static async resolveMentorCancel(req, res, next) {
    try {
      const result = await bookingsService.resolveMentorCancelBooking(
        req.userId,
        req.params.id,
        req.body ?? {},
      );
      if (!result.ok) {
        return res.status(result.status).json({
          success: false,
          error: result.error,
          needRefundDestination: Boolean(result.needRefundDestination),
        });
      }
      res.json({
        success: true,
        booking: result.booking,
        resolution: result.resolution,
        refundAmountVnd: result.refundAmountVnd,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancel(req, res, next) {
    try {
      const result = await bookingsService.cancelMyBooking(req.userId, req.params.id, req.body ?? {});
      if (!result.ok) {
        return res.status(result.status).json({
          success: false,
          error: result.error,
          needRefundDestination: Boolean(result.needRefundDestination),
        });
      }
      res.json({ success: true, booking: result.booking, cancellationPolicy: result.cancellationPolicy });
    } catch (err) {
      next(err);
    }
  }

  static async cancelForMentor(req, res, next) {
    try {
      const result = await bookingsService.cancelMentorBooking(req.userId, req.params.id, req.body ?? {});
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({
        success: true,
        booking: result.booking,
        lateCancel: Boolean(result.lateCancel),
        refundPending: Boolean(result.refundPending),
      });
    } catch (err) {
      next(err);
    }
  }

  static async rescheduleForMentor(req, res, next) {
    try {
      const result = await bookingsService.rescheduleMentorBooking(req.userId, req.params.id, req.body ?? {});
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  static async getBookedSlots(req, res, next) {
    try {
      const result = await bookingsService.getMentorBookedSlots(req.params.id);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booked: result.booked });
    } catch (err) {
      next(err);
    }
  }

  static async submitTransfer(req, res, next) {
    try {
      const result = await bookingsService.submitBankTransferReference(
        req.userId,
        req.params.id,
        req.body ?? {},
      );
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, booking: result.booking });
    } catch (err) {
      next(err);
    }
  }

  /** Alias contract: POST /api/bookings/:id/review — body { rating, comment?, tags? }; target mentor lấy từ booking. */
  static async createReviewForBooking(req, res, next) {
    try {
      const bookingId = String(req.params.id ?? "").trim();
      if (!mongoose.isValidObjectId(bookingId)) {
        return res.status(400).json({ success: false, error: "booking id không hợp lệ." });
      }
      const b = await Booking.findOne({ _id: bookingId, userId: String(req.userId).trim() })
        .select("mentorId status reviewId")
        .lean();
      if (!b) return res.status(404).json({ success: false, error: "Không tìm thấy booking." });
      const result = await reviewsService.createReview(req.userId, {
        ...(req.body ?? {}),
        targetType: "mentor",
        targetId: String(b.mentorId),
        bookingId,
      });
      if (!result.ok) return res.status(result.status).json({ success: false, error: result.error });
      res.status(201).json({ success: true, review: result.review });
    } catch (err) {
      next(err);
    }
  }
}
