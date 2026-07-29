import { User } from "../models/User.js";
import { Mentor } from "../models/Mentor.js";

/**
 * Sau `authJwt` — chỉ user có `role: "mentor"` mới qua được.
 *
 * QUAN TRỌNG: mentor đang `suspended` VẪN qua được middleware này. Tạm ngưng là chặn HOẠT ĐỘNG,
 * không chặn TIỀN — họ phải vào được dashboard/ví/rút tiền, nếu không thì bị khóa đồng nghĩa với
 * mất quyền truy cập khoản tiền đã kiếm được. Các route mở rộng hoạt động (tạo/sửa khóa học,
 * upload nội dung, đổi giá) phải gắn thêm `requireActiveMentor`.
 *
 * Gán `req.mentorStatus` và `req.mentorId` để tầng sau khỏi query lại.
 */
export async function requireMentor(req, res, next) {
  try {
    const u = await User.findById(req.userId).select("role").lean();
    if (!u || u.role !== "mentor") {
      return res.status(403).json({
        success: false,
        error: "Chỉ mentor mới được thực hiện thao tác này.",
      });
    }

    const mentor = await Mentor.findOne({ userId: req.userId }).select("isActive isVerified status").lean();
    if (!mentor || mentor.isVerified !== true) {
      return res.status(403).json({
        success: false,
        error: "Hồ sơ mentor đang chờ duyệt, chưa được kích hoạt hoặc chưa được xác minh.",
      });
    }

    // Hồ sơ cũ chưa migrate chưa có `status` — suy từ `isActive` đúng như migration làm.
    const status = mentor.status || (mentor.isActive === false ? "suspended" : "active");
    if (status === "closed") {
      return res.status(403).json({ success: false, error: "Hồ sơ mentor đã đóng." });
    }

    req.mentorStatus = status;
    req.mentorId = mentor._id;
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Sau `requireMentor` — chặn hoạt động khi hồ sơ đang tạm ngưng.
 *
 * Là factory để mỗi route nói đúng việc bị chặn, thay vì một câu chung chung:
 *   requireActiveMentor("thêm lịch rảnh để nhận booking mới")
 *
 * KHÔNG áp cho: khu tài chính (xem ví, rút tiền, tài khoản nhận tiền) và các buổi đã nhận từ
 * trước (bắt đầu/check-in/hoàn thành/ghi chú). Chặn buổi đã bán là làm hại học viên đã trả tiền,
 * trong khi chưa có luồng hoàn tiền tự động.
 */
export function requireActiveMentor(action = "thực hiện thao tác này") {
  return function guard(req, res, next) {
    if (req.mentorStatus !== "active") {
      return res.status(403).json({
        success: false,
        error:
          `Hồ sơ cố vấn của bạn đang bị tạm ngưng — không thể ${action} cho tới khi quản trị viên ` +
          "mở lại. Các hoạt động tài chính (xem số dư, rút tiền) vẫn dùng bình thường.",
        mentorStatus: req.mentorStatus,
      });
    }
    next();
  };
}
