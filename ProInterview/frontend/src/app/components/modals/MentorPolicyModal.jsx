import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  Percent, Clock, Wallet, ShieldCheck, PauseCircle, FileCheck2,
  Loader2, Sparkles, AlertTriangle,
} from "lucide-react";
import { apiUrl } from "../../utils/api";

const vnd = (n) => `${Math.round(Number(n) || 0).toLocaleString("vi-VN")}đ`;
const pct = (r) => `${Math.round(Number(r || 0) * 100)}%`;

function Section({ icon: Icon, title, tone = "slate", children }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50/70",
    violet: "border-violet-200 bg-violet-50/60",
    amber: "border-amber-200 bg-amber-50/70",
    emerald: "border-emerald-200 bg-emerald-50/70",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} className="shrink-0 text-slate-600" />
        <h5 className="text-xs font-black uppercase tracking-widest text-slate-600">{title}</h5>
      </div>
      <div className="space-y-1.5 text-sm leading-relaxed text-slate-700">{children}</div>
    </div>
  );
}

/**
 * Bảng chính sách hiển thị TRƯỚC khi user bấm đăng ký làm mentor.
 *
 * Số % và mốc thời gian đọc từ `GET /api/mentors/commission-policy` (nguồn là biến môi trường
 * backend) — không hardcode, để trang này không nói sai khi cấu hình đổi.
 */
export function MentorPolicyModal({ onClose }) {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/mentors/commission-policy"), {
          headers: { Accept: "application/json" },
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (body?.success) setPolicy(body.policy);
        else setError("Không tải được bảng chính sách. Vui lòng thử lại.");
      } catch {
        if (!cancelled) setError("Không kết nối được máy chủ để tải chính sách.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const early = policy?.early;
  const hasEarlySlots = Number(early?.remaining) > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mentor-policy-title"
        className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-600">
            <FileCheck2 size={20} />
          </div>
          <div className="min-w-0">
            <h4 id="mentor-policy-title" className="text-lg font-black tracking-tight text-slate-900">
              Cần biết trước khi đăng ký làm Cố vấn
            </h4>
            <p className="mt-0.5 text-sm font-semibold text-slate-600">
              Chính sách hoa hồng, thanh toán và các ràng buộc khi trở thành cố vấn.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Đang tải chính sách…
          </div>
        ) : error ? (
          <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            <Section icon={Percent} title="Phí nền tảng (hoa hồng)" tone="violet">
              <p>Mỗi giao dịch thành công, nền tảng giữ lại một phần; phần còn lại là của bạn.</p>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[340px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-violet-200 text-left text-xs font-black uppercase tracking-widest text-slate-500">
                      <th className="py-1.5 pr-3">Nguồn thu</th>
                      <th className="py-1.5 pr-3 text-right">Phí thường</th>
                      <th className="py-1.5 text-right">Cố vấn tiên phong</th>
                    </tr>
                  </thead>
                  <tbody className="font-bold text-slate-800">
                    <tr className="border-b border-violet-100">
                      <td className="py-2 pr-3 font-semibold">Buổi hẹn 1-1</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{pct(policy.booking.standardRate)}</td>
                      <td className="py-2 text-right tabular-nums text-emerald-700">{pct(policy.booking.earlyRate)}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3 font-semibold">Khóa học</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{pct(policy.course.standardRate)}</td>
                      <td className="py-2 text-right tabular-nums text-emerald-700">{pct(policy.course.earlyRate)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="!mt-3 text-xs text-slate-600">
                Ví dụ: buổi hẹn giá <b>1.000.000đ</b> với phí {pct(policy.booking.standardRate)} → bạn nhận{" "}
                <b>{vnd(1_000_000 * (1 - policy.booking.standardRate))}</b>.
              </p>
            </Section>

            <Section icon={Sparkles} title="Ưu đãi cố vấn tiên phong" tone="emerald">
              <p>
                <b>{early.slots} cố vấn</b> được duyệt sớm nhất hưởng mức phí ưu đãi trong{" "}
                <b>{early.durationYears} năm</b> kể từ ngày được kích hoạt.
              </p>
              <p className={hasEarlySlots ? "font-bold text-emerald-800" : "font-bold text-slate-600"}>
                {hasEarlySlots
                  ? `Còn ${early.remaining}/${early.slots} suất.`
                  : `Đã hết suất (${early.taken}/${early.slots}) — bạn sẽ áp mức phí thường.`}
              </p>
            </Section>

            <Section icon={Clock} title="Khi nào nhận được tiền" tone="amber">
              <p>
                Tiền vào ví ngay khi buổi hẹn hoàn thành hoặc học viên mua khóa, nhưng ở trạng thái{" "}
                <b>đang giữ</b> trong <b>{policy.payout.holdDays} ngày</b> rồi mới chuyển sang{" "}
                <b>khả dụng</b>. Khoảng chờ này để xử lý khiếu nại nếu có.
              </p>
              <p>
                Nếu có <b>báo cáo đang mở</b> nhắm vào bạn hoặc buổi/khóa đó, tiền sẽ tiếp tục bị giữ cho
                tới khi quản trị viên xử lý xong.
              </p>
            </Section>

            <Section icon={Wallet} title="Rút tiền">
              <p>
                Rút tối thiểu <b>{vnd(policy.payout.minAmountVnd)}</b> mỗi lần, chỉ rút được từ phần{" "}
                <b>khả dụng</b>.
              </p>
              <p>Cần thêm tài khoản ngân hàng chính chủ trước khi tạo yêu cầu rút.</p>
              <p>Quản trị viên duyệt rồi chuyển khoản tay — không tự động tức thì.</p>
            </Section>

            <Section icon={ShieldCheck} title="Duyệt hồ sơ & giá">
              <p>
                Hồ sơ phải được quản trị viên <b>duyệt</b> mới hoạt động được; có thể bị từ chối kèm lý do
                và bạn được nộp lại.
              </p>
              <p>
                Sau khi hoạt động, <b>đổi giá phải gửi yêu cầu</b> và chờ duyệt, không tự đổi ngay.
              </p>
            </Section>

            <Section icon={PauseCircle} title="Nếu hồ sơ bị tạm ngưng" tone="amber">
              <p>
                Bạn <b>vẫn đăng nhập được</b> và <b>vẫn xem, rút được toàn bộ số dư</b> — tạm ngưng không
                đóng băng tiền của bạn.
              </p>
              <p>
                Nhưng bạn sẽ bị ẩn khỏi tìm kiếm và tạm dừng: nhận lịch mới, đăng/sửa khóa học, đánh giá
                chéo, đổi giá, sửa hồ sơ.
              </p>
              <p className="flex items-start gap-1.5 font-bold text-amber-900">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Các buổi đã bán nhưng chưa diễn ra sẽ bị hủy và hoàn <b>100%</b> cho học viên.
              </p>
            </Section>

            <Section icon={FileCheck2} title="Đóng tài khoản">
              <p>
                Chỉ đóng được khi đã <b>sạch nợ</b>: toàn bộ số dư về 0, không còn yêu cầu rút đang xử lý,
                không còn khoản chờ giải phóng và không còn buổi hẹn sắp tới.
              </p>
              <p>
                Hồ sơ và lịch sử giao dịch được <b>giữ lại</b> để đối soát — không xóa vĩnh viễn.
              </p>
            </Section>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all hover:border-slate-400"
        >
          Đã hiểu
        </button>
      </motion.div>
    </motion.div>
  );
}
