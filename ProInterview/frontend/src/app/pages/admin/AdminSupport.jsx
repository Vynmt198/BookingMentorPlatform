import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminFilterSelect, AdminListFilterBar } from "../../components/admin/AdminListFilters.jsx";
import {
  AdminPageToolbar,
  adminGlassTable,
  adminHeaderRow,
  adminPageWrap,
  adminStatGrid3,
  adminTdCell,
  adminThCell,
} from "../../components/admin/AdminPageShell.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { adminApi } from "../../utils/adminApi.js";
import { tryApi } from "../../utils/apiToast.js";

const STATUS_TABS = [
  { id: "open", label: "Cần xử lý" },
  { id: "all", label: "Tất cả" },
  { id: "closed", label: "Đã đóng" },
];

const TYPE_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "mentor", label: "Cố vấn" },
  { id: "booking", label: "Buổi hẹn" },
  { id: "course", label: "Khóa học" },
  { id: "review", label: "Đánh giá" },
];

const REASON_LABELS = {
  late: "Trễ hẹn",
  unprofessional: "Thiếu chuyên nghiệp",
  inappropriate: "Không phù hợp",
  no_show: "Không tham gia",
  fraud: "Gian lận",
  other: "Khác",
};

const TARGET_LABELS = {
  mentor: "Cố vấn",
  booking: "Buổi hẹn",
  course: "Khóa học",
  review: "Đánh giá",
};

const STATUS_LABELS = {
  pending: "Chờ xử lý",
  reviewing: "Đang xử lý",
  resolved: "Đã xử lý",
  dismissed: "Đã bác bỏ",
};

const PAGE_SIZE = 50;

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function parseReportDescription(description = "") {
  let text = String(description || "").trim();
  const isSeed = /^\[Seed report\]/i.test(text);
  if (isSeed) text = text.replace(/^\[Seed report\]\s*/i, "").trim();

  let title = "";
  let body = text;
  const titleBlock = text.match(/^Tiêu đề:\s*(.+?)(?:\n\n|\n|$)/s);
  if (titleBlock) {
    title = titleBlock[1].trim();
    body = text.slice(titleBlock[0].length).trim();
  }

  const bookingNote = body.match(/\(Booking liên quan:\s*([a-f\d]{24})\)/i);
  if (bookingNote) body = body.replace(bookingNote[0], "").trim();

  return { title, body, isSeed, bookingId: bookingNote?.[1] || "" };
}

function statusBadgeClass(status) {
  if (status === "resolved") return "bg-lime-500/10 text-lime-900 border border-lime-400/25";
  if (status === "dismissed") return "bg-slate-100 text-slate-600 border border-slate-200";
  if (status === "reviewing") return "bg-amber-500/10 text-amber-900 border border-amber-400/25";
  return "bg-orange-500/10 text-orange-900 border border-orange-400/25";
}

/** Nút hành động, cùng kiểu viền + nền nhạt như badge trạng thái. */
const actionBtn = {
  amber:
    "rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-900 hover:bg-amber-500/20 disabled:opacity-50",
  lime:
    "rounded-lg border border-lime-400/25 bg-lime-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-lime-900 hover:bg-lime-500/20 disabled:opacity-50",
  slate:
    "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 disabled:opacity-50",
};

function targetLink(rep) {
  if (!rep?.targetId) return null;
  if (rep.targetType === "mentor") return `/admin/mentors/${rep.targetId}`;
  if (rep.targetType === "booking") return `/admin/bookings/${rep.targetId}`;
  if (rep.targetType === "course") return `/courses/${rep.targetId}?adminPreview=1`;
  return null;
}

function reportApiParams(page, statusFilter, typeFilter) {
  const params = {
    page,
    limit: PAGE_SIZE,
    ...(typeFilter !== "all" ? { targetType: typeFilter } : {}),
  };
  if (statusFilter === "open") params.open = true;
  else if (statusFilter === "closed") params.closed = true;
  else if (statusFilter !== "all") params.status = statusFilter;
  return params;
}

export function AdminSupport() {
  const [reports, setReports] = useState([]);
  const [counts, setCounts] = useState({ total: 0, open: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("open");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [resolveDialog, setResolveDialog] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    const res = await tryApi(() => adminApi.getReports(reportApiParams(page, statusFilter, typeFilter)), {
      fallback: "Không tải được danh sách báo cáo.",
    });
    if (res.success) {
      setReports(res.reports || []);
      setCounts(res.counts || { total: 0, open: 0, pending: 0 });
      setPagination(
        res.pagination || {
          page,
          limit: PAGE_SIZE,
          total: res.counts?.total ?? 0,
          totalPages: 1,
        },
      );
    }
    setLoading(false);
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      const parsed = parseReportDescription(r.description);
      const hay = [
        parsed.title,
        parsed.body,
        r.targetLabel,
        r.reportedBy?.name,
        r.reportedBy?.email,
        REASON_LABELS[r.reason],
        TARGET_LABELS[r.targetType],
        STATUS_LABELS[r.status],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [reports, searchTerm]);

  const applyStatus = async (reportId, status, resolution = "") => {
    setBusyId(reportId);
    const res = await tryApi(() => adminApi.updateReportStatus(reportId, { status, resolution }), {
      fallback: "Không cập nhật được báo cáo.",
      successMessage:
        status === "resolved"
          ? "Đã xử lý báo cáo"
          : status === "dismissed"
            ? "Đã bác bỏ báo cáo"
            : "Đã cập nhật",
    });
    setBusyId("");
    if (!res.success) return;
    void loadReports();
  };

  const openResolveDialog = (rep, status) => {
    setResolutionNote(rep.resolution || "");
    setResolveDialog({ id: rep._id, status });
  };

  const confirmResolveDialog = async () => {
    if (!resolveDialog?.id) return;
    await applyStatus(resolveDialog.id, resolveDialog.status, resolutionNote.trim());
    setResolveDialog(null);
    setResolutionNote("");
  };

  return (
    <div className={adminPageWrap}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={adminHeaderRow}>
        <div className="min-w-0 flex-1">
          <h2 className="font-headline text-3xl font-black uppercase tracking-tighter text-slate-900">
            <span className="text-violet-700">Hỗ trợ</span> & khiếu nại
          </h2>
        </div>
        <AdminPageToolbar
          loading={loading}
          onRefresh={() => void loadReports()}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Tìm người gửi, đối tượng, nội dung…"
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={adminStatGrid3}>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-900">Tổng báo cáo</p>
          <p className="mt-1 text-2xl font-black text-violet-950">{counts.total ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-900">Đang mở</p>
          <p className="mt-1 text-2xl font-black text-amber-950">{counts.open ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-orange-50/80 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-900">Chờ xử lý</p>
          <p className="mt-1 text-2xl font-black text-orange-950">{counts.pending ?? 0}</p>
        </div>
      </motion.div>

      <AdminListFilterBar
        countText={
          searchTerm.trim()
            ? `Tìm trong trang: ${filtered.length} / ${reports.length} · Tổng ${pagination.total ?? counts.total ?? 0}`
            : `Trang ${pagination.page}/${pagination.totalPages || 1} · ${reports.length} mục · Tổng ${pagination.total ?? counts.total ?? 0}`
        }
        showReset={statusFilter !== "open" || typeFilter !== "all"}
        onReset={() => {
          setStatusFilter("open");
          setTypeFilter("all");
          setPage(1);
        }}
      >
        <AdminFilterSelect
          id="support-status"
          label="Trạng thái"
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_TABS}
        />
        <AdminFilterSelect
          id="support-type"
          label="Đối tượng"
          value={typeFilter}
          onChange={setTypeFilter}
          options={TYPE_TABS}
        />
      </AdminListFilterBar>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={adminGlassTable}>
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className={adminThCell}>Trạng thái</th>
                <th className={adminThCell}>Vấn đề</th>
                <th className={adminThCell}>Đối tượng</th>
                <th className={adminThCell}>Người gửi</th>
                <th className={adminThCell}>Nội dung</th>
                <th className={adminThCell}>Thời gian</th>
                <th className={adminThCell}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={`${adminTdCell} text-center text-slate-500`}>
                    Đang tải…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`${adminTdCell} text-center text-slate-500`}>
                    —
                  </td>
                </tr>
              ) : (
                filtered.map((rep) => {
                  const parsed = parseReportDescription(rep.description);
                  const preview = parsed.title
                    ? `${parsed.title}, ${parsed.body}`
                    : parsed.body;
                  const link = targetLink(rep);
                  const busy = busyId === rep._id;
                  const isPending = rep.status === "pending";
                  const isReviewing = rep.status === "reviewing";

                  return (
                    <tr
                      key={rep._id}
                      className={`border-b border-slate-100 last:border-0 ${!isPending && !isReviewing ? "bg-slate-50/50" : ""}`}
                    >
                      <td className={adminTdCell}>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusBadgeClass(rep.status)}`}
                        >
                          {STATUS_LABELS[rep.status] || rep.status}
                        </span>
                      </td>
                      <td className={adminTdCell}>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                          {REASON_LABELS[rep.reason] || rep.reason}
                        </span>
                      </td>
                      <td className={adminTdCell}>
                        <p className="font-semibold text-slate-900">
                          {TARGET_LABELS[rep.targetType] || rep.targetType}
                        </p>
                        <p className="text-xs text-slate-600">{rep.targetLabel || "—"}</p>
                        {link ? (
                          <Link
                            to={link}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 hover:text-violet-900"
                          >
                            Xem <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : null}
                      </td>
                      <td className={adminTdCell}>
                        <p className="font-medium text-slate-900">{rep.reportedBy?.name || "—"}</p>
                        {rep.reportedBy?.email ? (
                          <p className="text-xs text-slate-500">{rep.reportedBy.email}</p>
                        ) : null}
                      </td>
                      <td className={`${adminTdCell} max-w-xs`}>
                        {parsed.isSeed ? (
                          <p className="mb-1 text-[10px] font-bold uppercase text-slate-400">Demo seed</p>
                        ) : null}
                        <p className="line-clamp-2 text-slate-700">{preview || "—"}</p>
                        {rep.resolution ? (
                          <p className="mt-1 line-clamp-1 text-[10px] font-bold uppercase text-lime-800">
                            Đã xử lý: {rep.resolution}
                          </p>
                        ) : null}
                      </td>
                      <td className={`${adminTdCell} text-slate-600`}>{formatDate(rep.createdAt)}</td>
                      <td className={adminTdCell}>
                        {isPending ? (
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void applyStatus(rep._id, "reviewing")}
                              className={actionBtn.amber}
                            >
                              Nhận xử lý
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openResolveDialog(rep, "dismissed")}
                              className={actionBtn.slate}
                            >
                              Bác bỏ
                            </button>
                          </div>
                        ) : isReviewing ? (
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openResolveDialog(rep, "resolved")}
                              className={actionBtn.lime}
                            >
                              Hoàn tất
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openResolveDialog(rep, "dismissed")}
                              className={actionBtn.slate}
                            >
                              Bác bỏ
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Đã đóng</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {(pagination.totalPages ?? 1) > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <p className="text-xs font-medium text-slate-500">
              Trang {pagination.page} / {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Trước
              </button>
              <button
                type="button"
                disabled={loading || page >= (pagination.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                Sau
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </motion.div>

      <Dialog open={Boolean(resolveDialog)} onOpenChange={(open) => !open && setResolveDialog(null)}>
        <DialogContent className="border border-slate-200 bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {resolveDialog?.status === "dismissed" ? "Bác bỏ báo cáo" : "Hoàn tất xử lý"}
            </DialogTitle>
            <DialogDescription>
              Ghi chú gửi cho người báo cáo (tuỳ chọn). Họ sẽ nhận thông báo trong app.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
            rows={4}
            placeholder="Ví dụ: Đã liên hệ mentor và cập nhật lịch…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setResolveDialog(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={busyId === resolveDialog?.id}
              onClick={() => void confirmResolveDialog()}
              className={
                resolveDialog?.status === "dismissed"
                  ? "rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  : "rounded-lg border border-lime-400/25 bg-lime-500/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-lime-900 hover:bg-lime-500/20 disabled:opacity-50"
              }
            >
              {resolveDialog?.status === "dismissed" ? "Xác nhận" : "Hoàn tất"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
