import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

import dns from "node:dns";

export function isMailConfigured() {
  const user = (process.env.MAIL_USER || process.env.EMAIL_USER || "").trim();
  const pass = (process.env.MAIL_PASS || process.env.EMAIL_PASS || "").trim();
  return Boolean(user && pass);
}

const getTransporter = () => {
  const user = (process.env.MAIL_USER || process.env.EMAIL_USER || "").trim();
  const pass = (process.env.MAIL_PASS || process.env.EMAIL_PASS || "").trim();

  if (!user || !pass) {
    throw new Error(
      "Thiếu MAIL_USER hoặc MAIL_PASS trong backend/.env (Gmail: dùng App Password, không phải mật khẩu đăng nhập thường).",
    );
  }

  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
    auth: { user, pass },
  });
};

/**
 * Gửi email xác nhận tài khoản
 */
export async function sendVerificationEmail(to, name, verifyUrl) {
  const mailOptions = {
    from: process.env.MAIL_FROM || '"ProInterview" <prointerview.ai@gmail.com>',
    to,
    subject: "Xác thực tài khoản ProInterview của bạn",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Chào mừng đến với ProInterview!</h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #333333; line-height: 1.6;">
          <p>Chào <strong>${name}</strong>,</p>
          <p>Để bắt đầu hành trình của mình, vui lòng xác nhận email bằng cách nhấn vào nút bên dưới:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Xác thực Email</a>
          </div>
        </div>
      </div>
    `,
  };

  return new Promise((resolve) => {
    try {
      const transporter = getTransporter();
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("[emailService] sendVerificationEmail error:", error);
          resolve({ ok: false, error: error.message });
        } else {
          resolve({ ok: true, info });
        }
      });
    } catch (error) {
      console.error("[emailService] sendVerificationEmail exception:", error);
      resolve({ ok: false, error: error.message });
    }
  });
}

/**
 * Gửi email đặt lại mật khẩu
 */
export async function sendResetPasswordEmail(to, name, resetUrl) {
  const mailOptions = {
    from: process.env.MAIL_FROM || '"ProInterview" <prointerview.ai@gmail.com>',
    to,
    subject: "Đặt lại mật khẩu ProInterview",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #dc2626; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Đặt lại mật khẩu</h1>
        </div>
        <div style="padding: 32px; background-color: #ffffff; color: #333333; line-height: 1.6;">
          <p>Chào <strong>${name}</strong>,</p>
          <p>Vui lòng nhấn vào nút bên dưới để thiết lập mật khẩu mới:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">Đặt lại mật khẩu</a>
          </div>
        </div>
      </div>
    `,
  };

  return new Promise((resolve) => {
    try {
      const transporter = getTransporter();
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("[emailService] sendResetPasswordEmail error:", error);
          resolve({ ok: false, error: error.message });
        } else {
          resolve({ ok: true, info });
        }
      });
    } catch (error) {
      console.error("[emailService] sendResetPasswordEmail exception:", error);
      resolve({ ok: false, error: error.message });
    }
  });
}

/**
 * Gửi email thông báo có nhận xét mới từ Mentor
 */
export async function sendMentorFeedbackEmail(to, studentName, mentorName, sessionType, notes) {
  const mailOptions = {
    from: process.env.MAIL_FROM || '"ProInterview" <prointerview.ai@gmail.com>',
    to,
    subject: `[ProInterview] Nhận xét buổi học từ Mentor ${mentorName}`,
    html: `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #1e293b; line-height: 1.5;">
        <div style="padding: 40px 0; border-bottom: 1px solid #f1f5f9;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;">BÁO CÁO ĐÁNH GIÁ CHI TIẾT</h2>
          <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;">Hệ thống cố vấn nghề nghiệp ProInterview</p>
        </div>
        
        <div style="padding: 40px 0;">
          <p style="font-size: 16px; margin: 0 0 24px;">Chào <strong>${studentName}</strong>,</p>
          <p style="font-size: 15px; color: #334155; margin-bottom: 32px;">
            Mentor <strong>${mentorName}</strong> đã hoàn tất bản đánh giá cho buổi <strong>${sessionType === "mock_interview" ? "Phỏng vấn giả định" : "Tư vấn lộ trình"}</strong> của bạn.
          </p>
          
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 32px; border: 1px solid #f1f5f9;">
            <div style="white-space: pre-wrap; font-size: 14px; line-height: 1.8; color: #334155;">${notes}</div>
          </div>

          <div style="margin-top: 48px;">
            <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/#/dashboard" 
               style="background-color: #1e293b; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
              XEM CHI TIẾT TRÊN HỆ THỐNG
            </a>
          </div>
        </div>

        <div style="padding: 40px 0; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">© 2026 ProInterview. All rights reserved.</p>
          <p style="margin: 4px 0 0;">Email này được gửi tự động từ hệ thống quản lý học tập.</p>
        </div>
      </div>
    `,
  };

  return new Promise((resolve) => {
    try {
      const transporter = getTransporter();
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("[EmailService] Error sending feedback email:", error);
          resolve({ ok: false, error: error.message });
        } else {
          console.log("[EmailService] Feedback email sent successfully:", info.messageId);
          resolve({ ok: true, info });
        }
      });
    } catch (error) {
      console.error("[EmailService] Exception sending feedback email:", error);
      resolve({ ok: false, error: error.message });
    }
  });
}

// Kiểm tra SMTP khi khởi động — bỏ qua nếu chưa cấu hình (dev vẫn chạy API/DB)
(async function verifyMailConfig() {
  if (!isMailConfigured()) {
    console.warn(
      "⚠️ SMTP chưa cấu hình (MAIL_USER / MAIL_PASS trống). Quên mật khẩu / xác thực email sẽ không gửi được.",
    );
    return;
  }
  try {
    const initTransporter = getTransporter();
    await initTransporter.verify();
    console.log("✔️ Server đã sẵn sàng gửi mail (SMTP OK)!");
  } catch (error) {
    console.error("❌ LỖI CẤU HÌNH MAIL TRÊN SERVER:", error.message || error);
    console.error(
      "   Gợi ý: Gmail → bật 2FA → tạo App Password → dán vào MAIL_PASS (có thể bọc ngoặc kép nếu có dấu cách).",
    );
  }
})();
