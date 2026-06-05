import { Mail as EnvelopeSimple, Phone, MessageCircle as ChatCircleDots } from "lucide-react";
import { SUPPORT_EMAIL } from "../../constants/brandVoice";

export function SupportContact() {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "#fff",
        border: "2px solid rgba(128, 55, 244,0.15)",
        boxShadow: "0 4px 16px rgba(128, 55, 244,0.08)",
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(128, 55, 244,0.1)" }}
        >
          <ChatCircleDots className="w-5 h-5" style={{ color: "#8037f4" }} />
        </div>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: "#1F1F1F" }}>
            Cần hỗ trợ?
          </h3>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>
            Chúng tôi luôn sẵn sàng hỗ trợ bạn
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-[#F9FAFB]"
          style={{ border: "1px solid #E5E7EB" }}
        >
          <EnvelopeSimple className="w-5 h-5" style={{ color: "#8037f4" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
              Email
            </p>
            <p className="text-sm font-semibold" style={{ color: "#1F1F1F" }}>
              {SUPPORT_EMAIL}
            </p>
          </div>
        </a>

        <a
          href="tel:+842473003636"
          className="flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-[#F9FAFB]"
          style={{ border: "1px solid #E5E7EB" }}
        >
          <Phone className="w-5 h-5" style={{ color: "#8037f4" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: "#6B7280" }}>
              Hotline
            </p>
            <p className="text-sm font-semibold" style={{ color: "#1F1F1F" }}>
              024 7300 3636
            </p>
          </div>
        </a>
      </div>

      <div
        className="mt-4 p-3 rounded-xl text-xs"
        style={{ background: "#F9FAFB", color: "#6B7280" }}
      >
        <strong>Chính sách buổi mentor:</strong>
        <p className="mt-2 font-semibold text-slate-700">Bạn hủy:</p>
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          <li>Từ 24 giờ trước buổi: hoàn 100%</li>
          <li>12–24 giờ: hoàn 50%</li>
          <li>Dưới 12 giờ hoặc không tham gia: không hoàn</li>
        </ul>
        <p className="mt-2 font-semibold text-slate-700">Mentor hủy / no-show:</p>
        <ul className="mt-1 space-y-0.5 list-disc list-inside">
          <li>Hủy từ 24 giờ trở lên: đổi lịch / đổi mentor / hoàn 100%</li>
          <li>Hủy dưới 24 giờ: hoàn 100% ưu tiên</li>
          <li>No-show: hoàn 100% + vi phạm mentor</li>
        </ul>
        <p className="mt-2">
          Muốn đổi giờ: hủy buổi (hoàn theo mốc) rồi đặt lại. Đổi lịch trên cùng buổi chỉ khi mentor hủy từ 24 giờ trở lên.
        </p>
      </div>
    </div>
  );
}
