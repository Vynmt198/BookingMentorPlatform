import {
  MENTOR_CANCEL_POLICY_ROWS,
  USER_CANCEL_POLICY_ROWS,
  USER_CHANGE_SLOT_NOTE,
  getUserCancelPolicyFromHours,
} from "../../constants/bookingPolicy";
import { UserCancelPolicyBrief } from "./UserCancelPolicyBrief";

/**
 * Bảng chính sách hủy/hoàn, `full` khi xác nhận đặt lịch; `compact` rút gọn.
 */
export function BookingPolicySummary({
  variant = "full",
  hoursLeft = null,
  className = "",
}) {
  if (variant === "compact") {
    return <UserCancelPolicyBrief variant="icons" hoursLeft={hoursLeft} className={className} />;
  }

  const activeTier =
    hoursLeft != null && Number.isFinite(hoursLeft)
      ? getUserCancelPolicyFromHours(hoursLeft).tierId
      : null;

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      <PolicyBlock
        title="Đối với bạn (học viên)"
        rows={USER_CANCEL_POLICY_ROWS}
        activeId={activeTier}
        footer={USER_CHANGE_SLOT_NOTE}
      />
      <PolicyBlock title="Khi mentor hủy / no-show" rows={MENTOR_CANCEL_POLICY_ROWS} />
    </div>
  );
}

function PolicyBlock({ title, rows, activeId, footer }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-600">{title}</p>
      <ul className="space-y-1.5 text-xs text-slate-600">
        {rows.map((row) => (
          <li
            key={row.id}
            className={
              activeId === row.id
                ? "rounded-lg border border-emerald-200 bg-emerald-50/90 px-2 py-1.5 font-medium text-emerald-900"
                : "px-0.5"
            }
          >
            <span className="text-slate-800">• {row.when}:</span>{" "}
            <strong className="text-slate-900">{row.policy}</strong>
          </li>
        ))}
      </ul>
      {footer ? (
        <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-500">{footer}</p>
      ) : null}
    </div>
  );
}
