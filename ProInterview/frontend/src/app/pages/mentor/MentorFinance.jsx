import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Wallet,
  Calendar,
  BookOpen,
  CheckCircle2 as CheckCircle,
  Clock,
  TrendingUp,
  BadgeCheck,
  ShieldCheck,
  X,
  PenLine,
  Trash2,
  Plus,
  AlertTriangle,
  ChevronLeft,
} from "lucide-react";
import { MentorListExpandButton } from "../../components/mentor/MentorListExpandButton.jsx";
import { useMentorListExpand } from "../../hooks/useMentorListExpand.js";
import { MentorScrollFadeRow } from "../../components/mentor/MentorScrollFadeRow.jsx";
import { getUser, getDisplayName } from "../../utils/auth.js";
import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import { MentorStatPanel, MentorStatFrame } from "../../components/mentor/MentorStatFrames";
import { MentorMoneyText } from "../../utils/moneyDisplay.jsx";
import {
  fetchMentorFinance,
  requestMentorPayout,
  addMentorPayoutAccount,
  deleteMentorPayoutAccount,
  requestMentorPriceChange,
} from "../../utils/mentorApi.js";
import { toastApiError, toastApiSuccess } from "../../utils/apiToast.js";
import { formatVnd } from "../../utils/formatVnd.js";
import { AppSelect } from "../../components/ui/AppSelect";
import { SUPPORTED_BANKS, BANK_OTHER, getBankBadge } from "../../constants/vietnamBanks.js";

const MENTOR_FINANCE_EXTRA_CSS = `
        .glass-tag {
           display: inline-flex;
           align-items: center;
           justify-content: center;
           max-width: 100%;
           white-space: nowrap;
           padding: 4px 10px;
           border-radius: 9999px;
           font-size: 10px;
           font-weight: 700;
           line-height: 1.25;
           letter-spacing: 0;
        }
        @media (min-width: 640px) {
          .glass-tag {
            padding: 5px 12px;
            font-size: 11px;
          }
        }
        .withdraw-modal-card {
           background: #ffffff;
           border-radius: 16px;
           border: 1px solid rgba(128, 55, 244, 0.14);
           box-shadow:
             0 24px 64px rgba(128, 55, 244, 0.1),
             0 8px 24px rgba(15, 23, 42, 0.06);
           overflow: hidden;
        }
        @keyframes mentor-finance-tx-pulse {
          0% { transform: scale3d(1, 1, 1); }
          50% { transform: scale3d(1.008, 1.008, 1.008); }
          100% { transform: scale3d(1, 1, 1); }
        }
        .mentor-finance-tx-row {
          transform-origin: center center;
          transition: background-color 0.2s ease;
        }
        .mentor-finance-tx-row:hover {
          background-color: rgba(248, 250, 252, 0.95);
          animation: mentor-finance-tx-pulse 0.85s ease-in-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .mentor-finance-tx-row:hover { animation: none; }
        }
        @keyframes mentor-withdraw-cta-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(147, 247, 43, 0.45), 0 12px 32px rgba(147, 247, 43, 0.28); }
          50% { box-shadow: 0 0 0 6px rgba(147, 247, 43, 0.12), 0 16px 40px rgba(147, 247, 43, 0.38); }
        }
        .mentor-withdraw-cta-ready {
          animation: mentor-withdraw-cta-glow 2.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .mentor-withdraw-cta-ready { animation: none; }
        }
`;

const TX_FILTER_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "income", label: "Thu nhập" },
  { id: "withdraw", label: "Rút tiền" },
];

function formatMoney(amount) {
  return `${Number(amount || 0).toLocaleString("vi-VN")} Đ`;
}

const withdrawFieldLabel =
  "mb-1.5 block text-xs font-semibold text-slate-700";
const withdrawFieldInput =
  "w-full rounded-lg border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#8037f4] focus:bg-[#faf8ff] focus:ring-2 focus:ring-[#8037f4]/12";

function isValidBankName(name) {
  const n = String(name || "").trim();
  if (!n || n.length < 2 || n.length > 80) return false;
  if (SUPPORTED_BANKS.includes(n)) return true;
  return /^[\p{L}\p{N}\s.&()-]+$/u.test(n);
}

function percentLabel(rate) {
  const n = Number(rate || 0) * 100;
  if (!Number.isFinite(n)) return "0%";
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

/* ── Withdrawal Modal ────────────────────────────────────────────────── */
function WithdrawalModal({
  balance,
  accounts,
  payoutAccountOwnerName,
  onAddAccount,
  onDeleteAccount,
  onSubmit,
  onClose,
}) {
  const [localAccounts, setLocalAccounts] = useState(accounts || []);
  const [mode, setMode] = useState("select");
  const [selectedAccountId, setSelectedAccountId] = useState(
    () => (accounts || []).find((a) => a.isDefault)?.id || (accounts || [])[0]?.id || "",
  );
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [success, setSuccess] = useState(false);

  const [bankSelect, setBankSelect] = useState(SUPPORTED_BANKS[0]);
  const [customBankName, setCustomBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [addError, setAddError] = useState("");

  const amountDigits = String(amount || "").replace(/\D/g, "");
  const amountValue = Number(amountDigits || 0);
  const hasEnoughAmount = amountValue >= 100000;

  const effectiveBankName = bankSelect === BANK_OTHER ? customBankName.trim() : bankSelect.trim();
  const accountDigits = accountNumber.replace(/\D/g, "");
  const confirmDigits = confirmAccountNumber.replace(/\D/g, "");
  const isAccountFormReady = isValidBankName(effectiveBankName) && /^\d{8,19}$/.test(accountDigits);
  const numbersMatch = accountDigits.length > 0 && accountDigits === confirmDigits;

  const resetAddForm = () => {
    setBankSelect(SUPPORTED_BANKS[0]);
    setCustomBankName("");
    setAccountNumber("");
    setConfirmAccountNumber("");
    setAddError("");
  };

  const goToConfirmAdd = () => {
    if (!isAccountFormReady) {
      setAddError("Vui lòng chọn ngân hàng và nhập số tài khoản hợp lệ (8–19 chữ số).");
      return;
    }
    if (!numbersMatch) {
      setAddError("Số tài khoản xác nhận không khớp. Vui lòng gõ lại cho đúng.");
      return;
    }
    setAddError("");
    setMode("confirmAdd");
  };

  const handleConfirmAdd = async () => {
    setSavingAccount(true);
    const res = await onAddAccount?.({
      bankName: effectiveBankName,
      accountNumber: accountDigits,
      confirmAccountNumber: confirmDigits,
    });
    setSavingAccount(false);
    if (!res?.success) return;
    if (res.account) {
      setLocalAccounts((prev) => [...prev, res.account]);
      setSelectedAccountId(res.account.id);
    }
    resetAddForm();
    setMode("select");
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm("Xoá tài khoản nhận tiền này?")) return;
    setDeletingId(accountId);
    const res = await onDeleteAccount?.(accountId);
    setDeletingId(null);
    if (!res?.success) return;
    const next = localAccounts.filter((a) => a.id !== accountId);
    setLocalAccounts(next);
    if (selectedAccountId === accountId) {
      setSelectedAccountId(next.find((a) => a.isDefault)?.id || next[0]?.id || "");
    }
  };

  const handleWithdraw = async () => {
    const n = amountValue;
    if (!Number.isFinite(n) || n < 100000) return;
    if (n > balance) return;
    if (!selectedAccountId) return;
    setLoading(true);
    const res = await onSubmit?.(Math.round(n), selectedAccountId);
    setLoading(false);
    if (!res?.success) return;
    setSuccess(true);
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.98, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.98, y: 12, opacity: 0 }}
        className="withdraw-modal-card my-6 w-full max-w-[28rem] shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
          {success ? (
            <div className="space-y-5 p-6 text-center sm:p-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#93f72b]/20 ring-4 ring-[#93f72b]/10">
                <CheckCircle size={36} className="text-[#630ed4]" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Yêu cầu đã gửi</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Admin sẽ xử lý và chuyển khoản trong 1–2 ngày làm việc.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-lg bg-[#8037f4] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6d2fd6]"
              >
                Đóng
              </button>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-[#630ed4] to-[#8037f4] px-5 py-4 text-white sm:px-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                      <Wallet size={20} strokeWidth={2.25} />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold leading-tight">Rút tiền</h2>
                      <p className="mt-1 text-sm text-white/85">
                        Số dư khả dụng{" "}
                        <span className="font-bold text-[#93f72b]">
                          {balance.toLocaleString("vi-VN")} Đ
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
                    aria-label="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                {mode === "select" ? (
                  <>
                    <section>
                      <p className="mb-3 text-xs font-normal text-[#630ed4]">Chọn tài khoản nhận tiền</p>
                      {localAccounts.length === 0 ? (
                        <p className="mb-2 text-xs text-slate-500">
                          Bạn chưa lưu tài khoản nhận tiền nào — bấm bên dưới để thêm.
                        </p>
                      ) : null}
                      <div className="space-y-2">
                        {localAccounts.map((acc) => {
                          const badge = getBankBadge(acc.bankName);
                          const isSelected = selectedAccountId === acc.id;
                          return (
                            <label
                              key={acc.id}
                              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition ${
                                isSelected
                                  ? "border-[#8037f4] bg-[#faf8ff] ring-1 ring-[#8037f4]/25"
                                  : "border-slate-200 bg-white hover:border-slate-300"
                              }`}
                            >
                              <input
                                type="radio"
                                name="payout-account"
                                className="sr-only"
                                checked={isSelected}
                                onChange={() => setSelectedAccountId(acc.id)}
                              />
                              <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-black tracking-tight text-white"
                                style={{ backgroundColor: badge.color }}
                                aria-hidden
                              >
                                {badge.initials}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-900">{acc.bankName}</p>
                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                  {acc.accountNumberMasked} · {acc.accountName || payoutAccountOwnerName}
                                </p>
                              </div>
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                  isSelected ? "border-[#8037f4] bg-[#8037f4]" : "border-slate-300 bg-white"
                                }`}
                                aria-hidden
                              >
                                {isSelected ? <CheckCircle size={13} className="text-white" strokeWidth={3} /> : null}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDelete(acc.id);
                                }}
                                disabled={deletingId === acc.id}
                                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Xoá tài khoản"
                              >
                                <Trash2 size={15} />
                              </button>
                            </label>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            resetAddForm();
                            setMode("add");
                          }}
                          className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 px-3.5 py-3 text-left transition hover:border-[#8037f4] hover:bg-[#faf8ff]"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400">
                            <Plus size={16} strokeWidth={2.5} />
                          </span>
                          <span className="text-sm font-bold text-slate-600">Thêm thẻ mới</span>
                        </button>
                      </div>
                    </section>

                    <section>
                      <label className={withdrawFieldLabel}>Số tiền muốn rút</label>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="500.000"
                          value={amountDigits ? amountValue.toLocaleString("vi-VN") : ""}
                          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                          className={`${withdrawFieldInput} py-3 pr-12 text-lg font-bold text-[#630ed4] placeholder:font-medium placeholder:text-slate-400`}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-normal text-slate-400">
                          Đ
                        </span>
                      </div>
                      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                        <span>
                          Rút:{" "}
                          <strong className="font-normal text-slate-800">
                            {amountValue.toLocaleString("vi-VN")} Đ
                          </strong>
                        </span>
                        <span className="hidden text-slate-300 sm:inline">·</span>
                        <span>Tối thiểu 100.000 Đ</span>
                      </p>
                    </section>

                    <button
                      type="button"
                      onClick={handleWithdraw}
                      disabled={!hasEnoughAmount || amountValue > balance || loading || !selectedAccountId}
                      className="w-full rounded-lg bg-[#93f72b] py-3.5 text-sm font-bold text-slate-900 shadow-[0_6px_20px_rgba(147,247,43,0.35)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                    >
                      {loading ? "Đang xử lý…" : "Xác nhận gửi yêu cầu"}
                    </button>

                    {amountValue > balance && amountValue > 0 ? (
                      <p className="text-center text-xs text-red-600">
                        Số tiền rút vượt quá số dư khả dụng ({balance.toLocaleString("vi-VN")} Đ).
                      </p>
                    ) : !selectedAccountId ? (
                      <p className="text-center text-xs text-amber-700">Chọn một tài khoản nhận tiền để tiếp tục.</p>
                    ) : null}
                  </>
                ) : (
                  <section>
                    <button
                      type="button"
                      onClick={() => setMode("select")}
                      className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      <ChevronLeft size={14} strokeWidth={2.5} />
                      Quay lại danh sách
                    </button>

                    {mode === "add" ? (
                      <>
                        <p className="mb-3 text-xs font-normal text-[#630ed4]">Thêm tài khoản nhận tiền</p>
                        <div className="space-y-3">
                          <div>
                            <label className={withdrawFieldLabel}>Ngân hàng</label>
                            <AppSelect
                              size="md"
                              value={bankSelect || undefined}
                              onValueChange={(v) => {
                                setBankSelect(v);
                                if (v !== BANK_OTHER) setCustomBankName("");
                              }}
                              placeholder="Chọn ngân hàng"
                              triggerClassName={withdrawFieldInput}
                              options={[
                                ...SUPPORTED_BANKS.map((bank) => ({ value: bank, label: bank })),
                                { value: BANK_OTHER, label: "Ngân hàng khác…" },
                              ]}
                            />
                            {bankSelect === BANK_OTHER ? (
                              <div className="mt-3">
                                <label className={withdrawFieldLabel}>Tên ngân hàng</label>
                                <input
                                  type="text"
                                  autoComplete="off"
                                  placeholder="VD: MSB, SCB, Liên Việt PostBank"
                                  maxLength={80}
                                  value={customBankName}
                                  onChange={(e) => setCustomBankName(e.target.value)}
                                  className={withdrawFieldInput}
                                />
                                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
                                  Nhập đúng tên ngân hàng trên ứng dụng hoặc thẻ ATM của bạn.
                                </p>
                              </div>
                            ) : null}
                          </div>
                          <div>
                            <label className={withdrawFieldLabel}>Số tài khoản</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              placeholder="8–19 chữ số"
                              maxLength={19}
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                              className={`${withdrawFieldInput} tabular-nums tracking-wide`}
                            />
                            {accountDigits.length > 0 && accountDigits.length < 8 ? (
                              <p className="mt-1.5 text-[11px] font-semibold text-red-600">
                                Số tài khoản cần tối thiểu 8 chữ số (đang nhập {accountDigits.length}).
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <label className={withdrawFieldLabel}>Nhập lại số tài khoản</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              placeholder="Gõ lại để xác nhận không gõ nhầm"
                              value={confirmAccountNumber}
                              onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                              className={`${withdrawFieldInput} tabular-nums tracking-wide`}
                            />
                            {confirmDigits.length > 0 ? (
                              numbersMatch ? (
                                <p className="mt-1.5 text-[11px] font-semibold text-emerald-600">Khớp ✓</p>
                              ) : (
                                <p className="mt-1.5 text-[11px] font-semibold text-red-600">
                                  Số tài khoản không khớp.
                                </p>
                              )
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-3 flex gap-3 rounded-lg border border-[#8037f4]/12 bg-white px-3 py-2.5">
                          <BadgeCheck size={18} className="mt-0.5 shrink-0 text-[#8037f4]" aria-hidden />
                          <div className="min-w-0 text-xs leading-relaxed text-slate-600">
                            <p className="font-semibold text-slate-900">{payoutAccountOwnerName || "Mentor"}</p>
                            <p className="mt-0.5">Tên chủ tài khoản theo hồ sơ đã xác minh — STK phải trùng chính chủ.</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={goToConfirmAdd}
                          disabled={!isAccountFormReady || !numbersMatch}
                          className="mt-3 w-full rounded-lg bg-[#8037f4] py-3 text-sm font-bold text-white transition-colors hover:bg-[#6d2fd6] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Tiếp tục
                        </button>
                        {addError ? <p className="mt-2 text-center text-xs text-red-600">{addError}</p> : null}
                      </>
                    ) : (
                      <>
                        <p className="mb-3 text-xs font-normal text-[#630ed4]">Xác nhận thông tin tài khoản</p>
                        <div className="space-y-2 rounded-xl border border-slate-200 bg-[#faf8ff]/70 p-4 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Ngân hàng</span>
                            <span className="font-bold text-slate-900">{effectiveBankName}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Số tài khoản</span>
                            <span className="font-bold tabular-nums text-slate-900">{accountDigits}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">Chủ tài khoản</span>
                            <span className="font-bold text-slate-900">{payoutAccountOwnerName || "Mentor"}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700">
                          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                          <p>
                            Kiểm tra kỹ ngân hàng và số tài khoản trước khi lưu — chuyển nhầm sẽ không thể hoàn tiền.
                          </p>
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            onClick={() => setMode("add")}
                            disabled={savingAccount}
                            className="flex-1 rounded-lg border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Sửa lại
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmAdd}
                            disabled={savingAccount}
                            className="flex-1 rounded-lg bg-[#93f72b] py-3 text-sm font-bold text-slate-900 shadow-[0_6px_20px_rgba(147,247,43,0.35)] transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                          >
                            {savingAccount ? "Đang lưu…" : "Xác nhận & lưu thẻ"}
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                )}
              </div>
            </>
          )}
        </motion.div>
    </motion.div>,
    document.body,
  );
}

/* ── Main Finance Component ────────────────────────────────────────── */
export function MentorFinance() {
  const navigate = useNavigate();
  const user = getUser();
  const [activeTab, setActiveTab] = useState("all");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [finance, setFinance] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);
  const transactionSectionRef = useRef(null);
  const [newPriceInput, setNewPriceInput] = useState("");
  const [submittingPrice, setSubmittingPrice] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "mentor") {
      navigate("/");
      return;
    }
    void (async () => {
      try {
        const res = await fetchMentorFinance();
        if (res.success && res.finance) setFinance(res.finance);
        else if (!res.success) toastApiError(res.error, "Không tải được tài chính mentor.");
      } catch {
        toastApiError("Lỗi kết nối khi tải tài chính.");
      }
    })();
  }, [navigate, user?.role]);

  const transactions = Array.isArray(finance?.history) ? finance.history : [];
  const filteredTransactions = useMemo(
    () =>
      transactions.filter((tx) => {
        if (activeTab === "all") return true;
        if (activeTab === "income") return tx.type === "income";
        return tx.type === "withdraw";
      }),
    [transactions, activeTab],
  );
  const {
    visibleItems: visibleTransactions,
    showExpandButton: showTxExpandButton,
    expanded: txExpanded,
    toggleExpanded: toggleTxExpanded,
  } = useMentorListExpand(filteredTransactions, activeTab);

  if (!user || user.role !== "mentor") return null;

  const availableBalance = Number(finance?.availableBalance || 0);
  const clearingBalance = Number(finance?.clearingBalance || 0);
  const clearingItems = Array.isArray(finance?.clearingItems) ? finance.clearingItems : [];
  const holdDays = Number(finance?.holdDays || 3);
  const pendingBalance = Number(finance?.pendingBalance || 0);
  const totalEarned = Number(finance?.totalEarned || 0);
  const grossEarned = Number(finance?.grossEarned || 0);
  const platformFeeTotal = Number(finance?.platformFeeTotal || 0);
  const bookingIncome = Number(finance?.incomeBreakdown?.booking || 0);
  const courseIncome = Number(finance?.incomeBreakdown?.course || 0);
  const payoutAccounts = Array.isArray(finance?.payoutAccounts) ? finance.payoutAccounts : [];
  const payoutAccountOwnerName = finance?.payoutAccountOwnerName || getDisplayName(user, "Mentor");
  const commissionPolicy = finance?.commissionPolicy || null;
  const currentPricePerHour = Number(finance?.pricePerHour || 0);
  const pendingPricePerHour = finance?.pendingPricePerHour ?? null;
  const newPriceDigits = newPriceInput.replace(/\D/g, "");
  const newPriceValue = Number(newPriceDigits || 0);
  const isPriceChangeValid = newPriceValue > 0 && newPriceValue !== currentPricePerHour;

  const handleRequestPriceChange = async () => {
    if (!isPriceChangeValid) return;
    setSubmittingPrice(true);
    try {
      const res = await requestMentorPriceChange(newPriceValue);
      if (!res.success) {
        toastApiError(res.error, "Không gửi được yêu cầu đổi giá.");
        return;
      }
      toastApiSuccess("Đã gửi yêu cầu đổi giá, chờ Admin duyệt.");
      setNewPriceInput("");
      setFinance((prev) => ({ ...(prev || {}), pendingPricePerHour: newPriceValue }));
    } catch {
      toastApiError("Lỗi kết nối khi gửi yêu cầu đổi giá.");
    } finally {
      setSubmittingPrice(false);
    }
  };
  // Ưu tiên số đếm từ server (tính thẳng từ PayoutRequest, không lệch), fallback tự đếm nếu thiếu.
  const pendingWithdrawCount =
    finance?.pendingPayoutCount != null
      ? Number(finance.pendingPayoutCount)
      : transactions.filter(
          (tx) =>
            tx.type === "withdraw" &&
            tx.status !== "paid" &&
            tx.status !== "completed" &&
            tx.status !== "failed",
        ).length;
  const canWithdrawNow = availableBalance >= 100000;
  const withdrawMinAmount = 100000;
  const withdrawProgress = Math.min(100, Math.round((availableBalance / withdrawMinAmount) * 100));
  const withdrawShortfall = Math.max(0, withdrawMinAmount - availableBalance);
  const payoutStatusMeta = (status, { compact = false } = {}) => {
    const purpleTag =
      "border border-[#8037f4]/40 bg-[#8037f4]/12 text-[#8037f4]";
    const greenTag =
      "border border-[#93f72b]/50 bg-[#93f72b]/25 text-slate-800";
    if (status === "paid") {
      return { text: compact ? "Đã chuyển" : "Đã chuyển khoản", className: greenTag };
    }
    if (status === "approved") {
      return {
        text: compact ? "Chờ chuyển khoản" : "Đã duyệt — chờ chuyển khoản",
        className: purpleTag,
      };
    }
    if (status === "completed") {
      return { text: "Hoàn tất", className: greenTag };
    }
    if (status === "failed") {
      return { text: "Từ chối", className: purpleTag };
    }
    return { text: compact ? "Đang xử lý" : "Đang xử lý", className: purpleTag };
  };
  const txDisplayTitle = (tx) => {
    if (tx?.type === "withdraw") return "Yêu cầu rút tiền";
    const raw = String(tx?.description || "").toLowerCase();
    if (tx?.type === "income") {
      if (raw.includes("booking")) return "Thu nhập buổi tư vấn";
      if (raw.includes("khóa học")) return "Thu nhập khóa học";
      return "Thu nhập";
    }
    if (raw.includes("rút tiền")) return "Yêu cầu rút tiền";
    return tx?.description || "Giao dịch";
  };
  return (
    <MentorPageShell
      bottomPad="pb-20"
      showAmbient={false}
      className="!bg-[#f8f9fc]"
      extraStyles={MENTOR_FINANCE_EXTRA_CSS}
    >
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 pb-12 sm:px-6 lg:px-10">

        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 flex flex-col gap-4 pt-2 sm:mb-8 lg:flex-row lg:items-start lg:justify-between"
        >
          <div>
            <h1 className="font-headline text-[clamp(1.75rem,4vw,2.75rem)] font-black leading-tight tracking-tight text-slate-900">
              Quản lý <span className="text-[#8037f4]">tài chính</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-slate-500">
              Theo dõi thu nhập, giao dịch và dòng tiền.
            </p>
          </div>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6 overflow-hidden rounded-2xl border border-[#93f72b]/25 bg-gradient-to-br from-slate-900 via-[#1a0d35] to-[#2a1450] p-6 shadow-[0_20px_48px_rgba(128,55,244,0.22)] sm:mb-8 sm:p-8"
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#93f72b]/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-[#8037f4]/25 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#93f72b]/15 px-3 py-1 ring-1 ring-[#93f72b]/30">
                <Wallet size={14} className="text-[#93f72b]" strokeWidth={2.25} />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#93f72b]">
                  Ví mentor
                </span>
              </div>
              <p className="mentor-stat-num mentor-stat-num--hero mentor-stat-num--on-dark mentor-stat-num--money mt-4 text-[clamp(2rem,5vw,3.25rem)]">
                <MentorMoneyText amount={availableBalance} />
              </p>
              <p className="mt-2 text-sm text-violet-200/90">Số dư khả dụng </p>
              {payoutAccounts.length === 0 ? (
                <p className="mt-4 text-xs text-violet-300/90">
                  Chưa có tài khoản nhận tiền — bạn sẽ thêm khi rút lần đầu.
                </p>
              ) : null}
            </div>
            <div className="flex w-full shrink-0 flex-col gap-4 lg:max-w-[320px]">
              <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10">
                      <BadgeCheck size={13} className="text-[#93f72b]" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 text-xs leading-relaxed text-violet-100/85">
                      <p className="font-semibold text-white">Điều kiện rút</p>
                      <p className="mt-0.5">Tối thiểu {formatMoney(withdrawMinAmount)} mỗi lần</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10">
                      <ShieldCheck size={13} className="text-amber-300" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 text-xs leading-relaxed text-violet-100/85">
                      <p className="font-semibold text-white">Thời gian xử lý an toàn</p>
                      <p className="mt-0.5">Tiền vào ví sau {holdDays} ngày kể từ lúc hoàn thành, rồi mới rút được</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10">
                      <Clock size={13} className="text-white/70" strokeWidth={2.25} />
                    </span>
                    <div className="min-w-0 text-xs leading-relaxed text-violet-100/85">
                      <p className="font-semibold text-white">Thời gian xử lý</p>
                      <p className="mt-0.5">Admin chuyển khoản trong 1–2 ngày làm việc</p>
                    </div>
                  </li>
                </ul>

                {!canWithdrawNow && availableBalance > 0 ? (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-violet-200/90">Tiến độ đủ ngưỡng rút</span>
                      <span className="font-bold tabular-nums text-white">{withdrawProgress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#93f72b] to-[#b8ff5c] transition-all duration-500"
                        style={{ width: `${withdrawProgress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-amber-100/90">
                      Còn thiếu <span className="font-semibold text-amber-200">{formatMoney(withdrawShortfall)}</span> để đủ điều kiện rút
                    </p>
                  </div>
                ) : null}

                {pendingWithdrawCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("withdraw");
                      transactionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="mt-4 flex w-full items-center justify-between gap-3 rounded-lg border border-[#93f72b]/25 bg-[#93f72b]/10 px-3 py-2.5 text-left transition hover:bg-[#93f72b]/15"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#93f72b]/25 ring-1 ring-[#93f72b]/35">
                        <Clock size={13} className="text-[#93f72b]" strokeWidth={2.5} />
                      </span>
                      <span className="truncate text-xs font-semibold text-white">
                        {pendingWithdrawCount} yêu cầu đang xử lý
                      </span>
                    </span>
                    <ArrowRight size={14} className="shrink-0 text-[#93f72b]" strokeWidth={2.5} />
                  </button>
                ) : null}
              </div>

              <motion.button
                type="button"
                onClick={() => setShowWithdraw(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#93f72b] px-7 py-3.5 text-sm font-black text-slate-900 transition hover:brightness-105 sm:text-base ${
                  canWithdrawNow ? "mentor-withdraw-cta-ready" : ""
                }`}
              >
                <span className="size-2 shrink-0 rounded-full bg-slate-900" aria-hidden />
                Rút tiền ngay
                <ArrowRight size={18} strokeWidth={2.5} />
              </motion.button>
            </div>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
        >
          <MentorStatPanel>
            <MentorStatFrame
              index={1}
              accent="amber"
              cornerIcon={ShieldCheck}
              moneyAmount={clearingBalance}
              title="Đang chờ khả dụng"
              footer={
                <p className="mt-3 text-xs leading-relaxed text-amber-700/90">
                  {clearingItems[0]?.clearAt
                    ? `Khoản sớm nhất sẽ chuyển sang Số dư khả dụng vào ngày ${new Date(clearingItems[0].clearAt).toLocaleDateString("vi-VN")}`
                    : `Buổi/khoá mới hoàn thành — giữ ${holdDays} ngày rồi mới cộng vào Số dư khả dụng`}
                </p>
              }
            />
            <MentorStatFrame
              index={2}
              accent="purple"
              cornerIcon={Clock}
              moneyAmount={pendingBalance}
              title="Chờ giải ngân"
              footer={
                <p className="mt-3 text-xs leading-relaxed text-violet-500/80">
                  Bạn đã bấm rút — admin chuyển khoản trong 1–2 ngày làm việc
                </p>
              }
            />
            <MentorStatFrame
              index={3}
              accent="purple"
              cornerIcon={TrendingUp}
              moneyAmount={totalEarned}
              title="Tổng thu nhập (đã trừ phí)"
              footer={
                <div className="mt-3 space-y-1.5 border-t border-violet-100 pt-3 text-xs leading-relaxed">
                  <p className="flex items-center justify-between gap-2 text-slate-500">
                    <span>Doanh thu gốc (chưa trừ phí)</span>
                    <span className="font-bold tabular-nums text-slate-700">{formatMoney(grossEarned)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2 text-slate-500">
                    <span>Phí nền tảng đã trừ</span>
                    <span className="font-bold tabular-nums text-rose-500">−{formatMoney(platformFeeTotal)}</span>
                  </p>
                </div>
              }
            />
          </MentorStatPanel>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <motion.div
            ref={transactionSectionRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] lg:col-span-8"
          >
            <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-5 sm:px-6 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-headline text-lg font-black tracking-tight text-slate-900">
                <span className="mr-2 text-[#8037f4]">01</span>
                Lịch sử giao dịch
              </h2>
              <MentorScrollFadeRow innerClassName="flex gap-1" fadeFrom="from-white">
                {TX_FILTER_TABS.map((tab) => {
                  const active = activeTab === tab.id;
                  const isWithdrawTab = tab.id === "withdraw";
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative shrink-0 snap-start whitespace-nowrap px-3 py-2 text-xs sm:text-sm ${
                        active
                          ? isWithdrawTab
                            ? "font-bold text-slate-900"
                            : "font-bold text-slate-900"
                          : isWithdrawTab
                            ? "font-semibold text-[#8037f4] hover:text-[#630ed4]"
                            : "font-medium text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {tab.label}
                        {isWithdrawTab && pendingWithdrawCount > 0 ? (
                          <span className="rounded-full bg-[#93f72b] px-1.5 py-0.5 text-[10px] font-bold leading-none text-slate-900">
                            {pendingWithdrawCount}
                          </span>
                        ) : null}
                      </span>
                      {active && (
                        <motion.span
                          layoutId="mentorFinanceTabUnderline"
                          className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${
                            isWithdrawTab ? "bg-[#93f72b]" : "bg-[#8037f4]"
                          }`}
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                    </button>
                  );
                })}
              </MentorScrollFadeRow>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {visibleTransactions.map((tx) => {
                const statusMeta = payoutStatusMeta(tx.status, { compact: true });
                const isWithdraw = tx.type === "withdraw";
                const isPendingWithdraw =
                  isWithdraw &&
                  tx.status !== "paid" &&
                  tx.status !== "completed" &&
                  tx.status !== "failed";
                return (
                  <button
                    key={tx.id}
                    type="button"
                    onClick={() => setSelectedTx(tx)}
                    className={`mentor-finance-tx-row w-full rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-[0_2px_12px_rgba(15,23,42,0.05)] ${
                      isWithdraw ? "ring-1 ring-[#8037f4]/10" : ""
                    } ${isPendingWithdraw ? "ring-2 ring-[#93f72b]/30" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          tx.type === "income"
                            ? "bg-[#93f72b]/25 text-slate-800 ring-1 ring-[#93f72b]/40"
                            : isPendingWithdraw
                              ? "bg-[#8037f4] text-white ring-2 ring-[#93f72b]/50"
                              : "bg-[#8037f4]/12 text-[#8037f4] ring-1 ring-[#8037f4]/20"
                        }`}
                      >
                        {tx.type === "income" ? (
                          <ArrowUpRight size={18} strokeWidth={2.5} />
                        ) : (
                          <ArrowDownRight size={18} strokeWidth={2.5} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-slate-900">{txDisplayTitle(tx)}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{tx.id}</p>
                        <p className="mt-2 text-sm font-medium text-slate-600">
                          {new Date(tx.date).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <span className={`glass-tag ${statusMeta.className}`}>{statusMeta.text}</span>
                      <p
                        className={`mentor-money-num font-headline text-base font-bold tabular-nums ${
                          tx.type === "income"
                            ? "text-emerald-600"
                            : isPendingWithdraw
                              ? "text-[#8037f4]"
                              : "text-slate-900"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "−"}
                        {formatVnd(tx.amount || 0)}
                      </p>
                    </div>
                  </button>
                );
              })}
              {!filteredTransactions.length && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-12 text-center text-sm text-slate-500">
                  Không có giao dịch phù hợp bộ lọc hiện tại.
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 text-left sm:px-6">Giao dịch</th>
                    <th className="px-4 py-3 text-left sm:px-6">Ngày</th>
                    <th className="px-4 py-3 text-left sm:px-6">Số tiền</th>
                    <th className="min-w-[7.5rem] px-4 py-3 text-left sm:px-6">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleTransactions.map((tx) => {
                    const statusMeta = payoutStatusMeta(tx.status, { compact: true });
                    const isWithdraw = tx.type === "withdraw";
                    const isPendingWithdraw =
                      isWithdraw &&
                      tx.status !== "paid" &&
                      tx.status !== "completed" &&
                      tx.status !== "failed";
                    return (
                    <tr
                      key={tx.id}
                      className={`mentor-finance-tx-row cursor-pointer ${
                        isWithdraw ? "bg-gradient-to-r from-[#8037f4]/[0.04] to-transparent" : ""
                      } ${isPendingWithdraw ? "ring-1 ring-inset ring-[#93f72b]/25" : ""}`}
                      onClick={() => setSelectedTx(tx)}
                    >
                      <td className="px-4 py-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                              tx.type === "income"
                                ? "bg-[#93f72b]/25 text-slate-800 ring-1 ring-[#93f72b]/40"
                                : isPendingWithdraw
                                  ? "bg-[#8037f4] text-white ring-2 ring-[#93f72b]/50"
                                  : "bg-[#8037f4]/12 text-[#8037f4] ring-1 ring-[#8037f4]/20"
                            }`}
                          >
                            {tx.type === "income" ? (
                              <ArrowUpRight size={16} strokeWidth={2.5} />
                            ) : (
                              <ArrowDownRight size={16} strokeWidth={2.5} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">{txDisplayTitle(tx)}</p>
                            <p className="truncate text-[11px] text-slate-500">{tx.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 sm:px-6">
                        <p className="text-sm font-medium text-slate-700">
                          {new Date(tx.date).toLocaleDateString("vi-VN")}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                        <p
                          className={`mentor-money-num font-headline text-sm font-bold tabular-nums sm:text-base ${
                            tx.type === "income"
                              ? "text-emerald-600"
                              : isPendingWithdraw
                                ? "text-[#8037f4]"
                                : "text-slate-900"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "−"}
                          {formatVnd(tx.amount || 0)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 sm:px-6">
                        <span className={`glass-tag ${statusMeta.className}`}>
                          {statusMeta.text}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                  {!filteredTransactions.length && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-500">
                        Không có giao dịch phù hợp bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {showTxExpandButton ? (
              <MentorListExpandButton expanded={txExpanded} onToggle={toggleTxExpanded} />
            ) : null}
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col gap-4 lg:col-span-4"
          >
            {clearingItems.length > 0 ? (
              <div className="rounded-2xl border border-amber-300/60 bg-amber-50/60 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  <ShieldCheck size={13} />
                  Đang xử lý ({clearingItems.length} khoản)
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-amber-800/80">
                  Tiền từ buổi/khoá mới hoàn thành, giữ {holdDays} ngày trước khi chuyển sang "Số dư khả dụng" — đề phòng khiếu nại từ học viên.
                </p>
                <ul className="mt-3 divide-y divide-amber-200/60">
                  {clearingItems.slice(0, 5).map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800">{item.description}</p>
                        <p className="mt-0.5 text-[11px] text-amber-700">
                          Khả dụng: {item.clearAt ? new Date(item.clearAt).toLocaleDateString("vi-VN") : "—"}
                        </p>
                      </div>
                      <span className="shrink-0 font-headline text-sm font-bold tabular-nums text-amber-700">
                        {formatMoney(item.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Nguồn thu nhập
              </h3>
              <ul className="mt-4 divide-y divide-slate-100">
                <li className="flex items-center justify-between gap-3 py-3 first:pt-0">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Calendar size={15} className="text-[#8037f4]" />
                    Từ đặt lịch
                  </span>
                  <span className="font-headline text-sm font-bold text-slate-900">
                    {formatMoney(bookingIncome)}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <BookOpen size={15} className="text-[#8037f4]" />
                    Từ khóa học
                  </span>
                  <span className="font-headline text-sm font-bold text-slate-900">
                    {formatMoney(courseIncome)}
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <PenLine size={13} className="text-[#8037f4]" />
                Cập nhật mức phí Mentor
              </h3>
              <p className="mt-3 text-sm text-slate-600">
                Mức giá hiện tại:{" "}
                <span className="font-bold text-slate-900">{formatMoney(currentPricePerHour)}/giờ</span>
              </p>

              {pendingPricePerHour ? (
                <div className="mt-3 rounded-lg border border-[#93f72b]/40 bg-[#93f72b]/10 px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-[#630ed4]">
                    <Clock size={13} className="shrink-0" />
                    Đang chờ Admin duyệt mức giá mới
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">
                    {formatMoney(pendingPricePerHour)}/giờ
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <label className={withdrawFieldLabel}>Mức giá mới (VND/giờ)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="VD: 350.000"
                    value={newPriceDigits ? newPriceValue.toLocaleString("vi-VN") : ""}
                    onChange={(e) => setNewPriceInput(e.target.value.replace(/\D/g, ""))}
                    className={withdrawFieldInput}
                  />
                  <button
                    type="button"
                    onClick={handleRequestPriceChange}
                    disabled={!isPriceChangeValid || submittingPrice}
                    className="mt-3 w-full rounded-lg bg-[#8037f4] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6d2fd6] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submittingPrice ? "Đang gửi…" : "Gửi yêu cầu"}
                  </button>
                </div>
              )}
            </div>

            {commissionPolicy ? (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Chính sách phí
                </h3>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Booking</p>
                      {commissionPolicy.bookingRateSource === "mentor_custom" && (
                        <p className="text-[11px] text-violet-600">Mức riêng theo hợp đồng</p>
                      )}
                    </div>
                    <span className="rounded-full bg-[#8037f4]/12 px-3 py-1 text-xs font-bold text-[#8037f4] ring-1 ring-[#8037f4]/20">
                      {percentLabel(commissionPolicy.bookingRate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Khóa học</p>
                      {commissionPolicy.courseRateSource === "mentor_custom" && (
                        <p className="text-[11px] text-violet-600">Mức riêng theo hợp đồng</p>
                      )}
                    </div>
                    <span className="rounded-full bg-[#8037f4]/12 px-3 py-1 text-xs font-bold text-[#8037f4] ring-1 ring-[#8037f4]/20">
                      {percentLabel(commissionPolicy.courseRate)}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </motion.aside>
        </div>
      </div>

      <AnimatePresence>
        {showWithdraw && (
          <WithdrawalModal
            balance={availableBalance}
            accounts={payoutAccounts}
            payoutAccountOwnerName={payoutAccountOwnerName}
            onAddAccount={async (payload) => {
              try {
                const res = await addMentorPayoutAccount(payload);
                if (!res.success) {
                  toastApiError(res.error, "Không lưu được tài khoản nhận tiền.");
                  return { success: false };
                }
                setFinance((prev) => ({
                  ...(prev || {}),
                  payoutAccounts: [...(Array.isArray(prev?.payoutAccounts) ? prev.payoutAccounts : []), res.account],
                }));
                toastApiSuccess("Đã lưu tài khoản nhận tiền.");
                return { success: true, account: res.account };
              } catch {
                toastApiError("Lỗi kết nối khi lưu tài khoản nhận tiền.");
                return { success: false };
              }
            }}
            onDeleteAccount={async (accountId) => {
              try {
                const res = await deleteMentorPayoutAccount(accountId);
                if (!res.success) {
                  toastApiError(res.error, "Không xoá được tài khoản nhận tiền.");
                  return { success: false };
                }
                setFinance((prev) => ({ ...(prev || {}), payoutAccounts: res.accounts }));
                toastApiSuccess("Đã xoá tài khoản nhận tiền.");
                return { success: true };
              } catch {
                toastApiError("Lỗi kết nối khi xoá tài khoản nhận tiền.");
                return { success: false };
              }
            }}
            onSubmit={async (amount, accountId) => {
              try {
              const res = await requestMentorPayout(amount, accountId);
              if (!res.success) {
                toastApiError(res.error, "Không gửi được yêu cầu rút tiền.");
                return { success: false };
              }
              toastApiSuccess("Đã gửi yêu cầu rút tiền.");
              const optimisticRow = {
                id: res.payout?.id || `local-${Date.now()}`,
                type: "withdraw",
                amount: Number(amount || 0),
                status: "pending",
                date: new Date().toISOString(),
                description: "Yêu cầu rút tiền",
              };
              setFinance((prev) => ({
                ...(prev || {}),
                availableBalance: Math.max(0, Number(prev?.availableBalance || 0) - Number(amount || 0)),
                pendingBalance: Number(prev?.pendingBalance || 0) + Number(amount || 0),
                history: [optimisticRow, ...(Array.isArray(prev?.history) ? prev.history : [])],
              }));
              const refreshed = await fetchMentorFinance();
              if (refreshed.success && refreshed.finance) setFinance(refreshed.finance);
              return { success: true };
              } catch {
                toastApiError("Lỗi kết nối khi gửi yêu cầu rút tiền.");
                return { success: false };
              }
            }}
            onClose={() => setShowWithdraw(false)}
          />
        )}
        {selectedTx && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm sm:p-6"
            onClick={() => setSelectedTx(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-[#8037f4]/20 bg-white p-8 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-start justify-between gap-3">
                <h3 className="text-2xl font-bold text-[#630ed4]">Chi tiết giao dịch</h3>
                <span className={`glass-tag ${payoutStatusMeta(selectedTx.status).className}`}>
                  {payoutStatusMeta(selectedTx.status).text}
                </span>
              </div>

              <div className="mb-5 rounded-2xl border border-[#8037f4]/20 bg-[#8037f4]/5 px-5 py-4">
                <p className="mb-2 text-sm font-semibold text-[#8037f4]">Số tiền giao dịch</p>
                <p
                  className={`mentor-money-num text-xl sm:text-2xl ${
                    selectedTx.type === "income" ? "text-[#630ed4]" : "text-slate-900"
                  }`}
                >
                  {selectedTx.type === "income" ? "+" : "-"}
                  {Number(selectedTx.amount || 0).toLocaleString("vi-VN")} Đ
                </p>
              </div>

              <div className="space-y-3 text-sm font-medium">
                <p className="text-slate-900">
                  <span className="font-bold text-[#8037f4]">Mã giao dịch:</span> {selectedTx.id}
                </p>
                <p className="text-slate-900">
                  <span className="font-bold text-[#8037f4]">Loại:</span>{" "}
                  {selectedTx.type === "income" ? "Thu nhập" : "Rút tiền"}
                </p>
                <p className="text-slate-900">
                  <span className="font-bold text-[#8037f4]">Mô tả:</span> {txDisplayTitle(selectedTx)}
                </p>
                <p className="text-slate-900">
                  <span className="font-bold text-[#8037f4]">Thời gian:</span>{" "}
                  {new Date(selectedTx.date).toLocaleString("vi-VN")}
                </p>
                {selectedTx.reviewedAt ? (
                  <p className="text-slate-900">
                    <span className="font-bold text-[#8037f4]">Thời gian xử lý:</span>{" "}
                    {new Date(selectedTx.reviewedAt).toLocaleString("vi-VN")}
                  </p>
                ) : null}
                {selectedTx.paidAt ? (
                  <p className="text-slate-900">
                    <span className="font-bold text-[#8037f4]">Thời điểm đã chi:</span>{" "}
                    {new Date(selectedTx.paidAt).toLocaleString("vi-VN")}
                  </p>
                ) : null}
                {selectedTx.transferRef ? (
                  <p className="text-slate-900">
                    <span className="font-bold text-[#8037f4]">Tham chiếu chuyển khoản:</span> {selectedTx.transferRef}
                  </p>
                ) : null}
                {selectedTx.providerRef ? (
                  <p className="text-slate-900">
                    <span className="font-bold text-[#8037f4]">Mã tham chiếu:</span> {selectedTx.providerRef}
                  </p>
                ) : null}
                {selectedTx.rejectReason ? (
                  <div className="rounded-xl border border-[#8037f4]/25 bg-[#8037f4]/8 p-3">
                    <p className="text-sm font-bold text-[#630ed4]">Lý do từ chối</p>
                    <p className="mt-1 text-sm text-slate-800">{selectedTx.rejectReason}</p>
                  </div>
                ) : null}
                {selectedTx.note ? (
                  <div className="rounded-xl border border-[#93f72b]/35 bg-[#93f72b]/15 p-3">
                    <p className="text-sm font-bold text-[#630ed4]">Ghi chú xử lý</p>
                    <p className="mt-1 text-sm text-slate-800">{selectedTx.note}</p>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="mt-8 w-full rounded-xl bg-[#93f72b] py-3 text-sm font-bold text-[#120B2E] shadow-[0_8px_24px_rgba(147,247,43,0.35)] transition hover:brightness-105"
              >
                Đóng
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MentorPageShell>
  );
}
