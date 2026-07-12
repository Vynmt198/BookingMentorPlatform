import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: Number(process.env.MAIL_PORT) === 465,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function testEmail() {
  console.log("Testing email with user:", process.env.MAIL_USER);
  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: "vietvanphan04@gmail.com", // Gửi thử cho mail học viên
      subject: "Test Email from ProInterview System",
      text: "Nếu bạn nhận được mail này, nghĩa là hệ thống gửi mail đã hoạt động chính xác!",
    });
    console.log("Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Email test failed:", error);
  }
}

testEmail();
