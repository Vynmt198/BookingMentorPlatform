import { Booking } from "../models/Booking.js";
import { Enrollment } from "../models/Enrollment.js";
import { Payment } from "../models/Payment.js";
import { enrollmentAccessGranted } from "../helpers/enrollmentAccess.js";
import {
  isTransferPaymentExpired,
  TRANSFER_PAYMENT_EXPIRED_REASON,
} from "../utils/transferPaymentExpiry.js";

async function cancelTransferLedger({ type, referenceId, session }) {
  await Payment.updateOne(
    {
      type,
      referenceId,
      provider: "transfer",
      status: "pending",
    },
    {
      $set: {
        status: "cancelled",
        failureReason: "payment_timeout",
      },
    },
    session ? { session } : {},
  );
}

/** Hủy booking CK pending quá hạn — giải phóng slot mentor. */
export async function expireBookingTransferIfNeeded(booking, { session } = {}) {
  if (!booking) return { expired: false };
  const payStatus = String(booking.paymentStatus || "").toLowerCase();
  const method = String(booking.paymentMethod || "").toLowerCase();
  if (payStatus !== "pending" || method !== "transfer") return { expired: false };
  if (!isTransferPaymentExpired(booking)) return { expired: false };

  booking.paymentStatus = "failed";
  if (String(booking.status || "").toLowerCase() === "pending") {
    booking.status = "cancelled";
    booking.cancelledBy = "system";
    booking.cancelReason = TRANSFER_PAYMENT_EXPIRED_REASON;
    booking.cancelledAt = new Date();
  }
  await booking.save(session ? { session } : undefined);

  await cancelTransferLedger({
    type: "booking",
    referenceId: booking._id,
    session,
  });

  return { expired: true };
}

/** Xóa ghi danh CK pending quá hạn — cho phép ghi danh lại. */
export async function expireEnrollmentTransferIfNeeded(enrollment, { session } = {}) {
  if (!enrollment) return { expired: false };
  if (enrollmentAccessGranted(enrollment)) return { expired: false };
  if (String(enrollment.paymentStatus || "").toLowerCase() !== "pending") return { expired: false };
  if (String(enrollment.paymentMethod || "").toLowerCase() !== "transfer") return { expired: false };
  if (!isTransferPaymentExpired(enrollment)) return { expired: false };

  await cancelTransferLedger({
    type: "course",
    referenceId: enrollment._id,
    session,
  });

  await Enrollment.deleteOne({ _id: enrollment._id }, session ? { session } : undefined);

  return { expired: true };
}

/** Hủy payment subscription CK pending quá hạn. */
export async function expireSubscriptionTransferIfNeeded(payment, { session } = {}) {
  if (!payment) return { expired: false };
  if (String(payment.type || "").toLowerCase() !== "subscription") return { expired: false };
  if (String(payment.provider || "").toLowerCase() !== "transfer") return { expired: false };
  if (String(payment.status || "").toLowerCase() !== "pending") return { expired: false };
  if (!isTransferPaymentExpired(payment)) return { expired: false };

  payment.status = "cancelled";
  payment.failureReason = "payment_timeout";
  const prev =
    payment.providerResponse && typeof payment.providerResponse === "object"
      ? payment.providerResponse
      : {};
  payment.providerResponse = { ...prev, expiredAt: new Date().toISOString() };
  await payment.save(session ? { session } : undefined);

  return { expired: true };
}

export async function expireBookingTransferById(bookingId, opts) {
  const booking = await Booking.findById(bookingId);
  if (!booking) return { expired: false, missing: true };
  return expireBookingTransferIfNeeded(booking, opts);
}

export async function expireEnrollmentTransferById(enrollmentId, opts) {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) return { expired: false, missing: true };
  return expireEnrollmentTransferIfNeeded(enrollment, opts);
}

export async function expireSubscriptionTransferById(paymentId, opts) {
  const payment = await Payment.findById(paymentId);
  if (!payment) return { expired: false, missing: true };
  return expireSubscriptionTransferIfNeeded(payment, opts);
}
