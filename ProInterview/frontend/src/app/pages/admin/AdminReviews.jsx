import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Star, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
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
import { adminApi } from "../../utils/adminApi.js";
import { tryApi } from "../../utils/apiToast.js";

const TYPE_TABS = [
  { id: "all", label: "Tất cả" },
  { id: "mentor", label: "Cố vấn" },
  { id: "course", label: "Khóa học" },
];

const VISIBILITY_TABS = [
  { id: "all", label: "Mọi trạng thái" },
  { id: "visible", label: "Đang hiện" },
  { id: "hidden", label: "Đã ẩn" },
];

const TARGET_LABELS = { mentor: "Cố vấn", course: "Khóa học" };
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

function Stars({ rating }) {
  const n = Math.min(5, Math.max(0, Number(rating) || 0));
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${n} sao`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < n ? "fill-current" : "opacity-25"}`} />
      ))}
    </span>
  );
}

export function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [counts, setCounts] = useState({ total: 0, mentor: 0, course: 0 });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const res = await tryApi(
      () =>
        adminApi.getReviews({
          page,
          limit: PAGE_SIZE,
          ...(typeFilter !== "all" ? { targetType: typeFilter } : {}),
          ...(visibilityFilter === "visible"
            ? { visible: "true" }
            : visibilityFilter === "hidden"
              ? { visible: "false" }
              : {}),
        }),
      { fallback: "Không tải được đánh giá." },
    );
    if (res.success) {
      setReviews(res.reviews || []);
      setCounts(res.counts || { total: 0, mentor: 0, course: 0 });
      setPagination(
        res.pagination || {
          page,
          limit: PAGE_SIZE,
          total: res.counts?.total ?? 0,
          totalPages: 1,
          hasMore: false,
        },
      );
    }
    setLoading(false);
  }, [typeFilter, visibilityFilter, page]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, visibilityFilter]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter((r) => {
      const hay = [
        r.userName,
        r.userEmail,
        r.targetLabel,
        r.comment,
        TARGET_LABELS[r.targetType],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [reviews, searchTerm]);

  const toggleVisibility = async (review) => {
    const id = review?._id;
    if (!id) return;
    const nextVisible = !review.isVisible;
    setBusyId(id);
    const res = await tryApi(() => adminApi.setReviewVisibility(id, nextVisible), {
      fallback: "Không cập nhật được trạng thái hiển thị.",
      successMessage: nextVisible ? "Đã hiện đánh giá" : "Đã ẩn đánh giá",
    });
    setBusyId("");
    if (!res.success) return;
    setReviews((prev) =>
      prev.map((r) => (String(r._id) === String(id) ? { ...r, isVisible: nextVisible } : r)),
    );
  };

  return (
    <div className={adminPageWrap}>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={adminHeaderRow}>
        <div className="min-w-0 flex-1">
          <h2 className="font-headline text-3xl font-black uppercase tracking-tighter text-slate-900">
            <span className="text-violet-700">Đánh giá</span>
          </h2>
        </div>
        <AdminPageToolbar
          loading={loading}
          onRefresh={() => void loadAll()}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Tìm học viên, đối tượng, nội dung…"
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={adminStatGrid3}>
        <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-900">Tổng</p>
          <p className="mt-1 text-2xl font-black text-violet-950">{counts.total ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Cố vấn</p>
          <p className="mt-1 text-2xl font-black text-emerald-950">{counts.mentor ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-sky-900">Khóa học</p>
          <p className="mt-1 text-2xl font-black text-sky-950">{counts.course ?? 0}</p>
        </div>
      </motion.div>

      <AdminListFilterBar
        countText={
          searchTerm.trim()
            ? `Tìm trong trang: ${filtered.length} / ${reviews.length} · Tổng ${pagination.total ?? counts.total ?? 0}`
            : `Trang ${pagination.page}/${pagination.totalPages || 1} · ${reviews.length} mục · Tổng ${pagination.total ?? counts.total ?? 0}`
        }
        showReset={typeFilter !== "all" || visibilityFilter !== "all"}
        onReset={() => {
          setTypeFilter("all");
          setVisibilityFilter("all");
          setPage(1);
        }}
      >
        <AdminFilterSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_TABS} />
        <AdminFilterSelect
          value={visibilityFilter}
          onChange={setVisibilityFilter}
          options={VISIBILITY_TABS}
        />
      </AdminListFilterBar>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={adminGlassTable}>
        <div className="max-w-full overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className={adminThCell}>Điểm</th>
                <th className={adminThCell}>Loại</th>
                <th className={adminThCell}>Đối tượng</th>
                <th className={adminThCell}>Học viên</th>
                <th className={adminThCell}>Nội dung</th>
                <th className={adminThCell}>Thời gian</th>
                <th className={adminThCell}>Hiển thị</th>
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
                filtered.map((r) => (
                  <tr
                    key={r._id}
                    className={`border-b border-slate-100 last:border-0 ${!r.isVisible ? "bg-slate-50/80 opacity-75" : ""}`}
                  >
                    <td className={adminTdCell}>
                      <Stars rating={r.rating} />
                    </td>
                    <td className={adminTdCell}>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                        {TARGET_LABELS[r.targetType] || r.targetType}
                      </span>
                    </td>
                    <td className={adminTdCell}>
                      <p className="font-semibold text-slate-900">{r.targetLabel}</p>
                      {r.targetId ? (
                        <Link
                          to={
                            r.targetType === "mentor"
                              ? `/admin/mentors/${r.targetId}`
                              : `/courses/${r.targetId}?adminPreview=1`
                          }
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 hover:text-violet-900"
                        >
                          Xem <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </td>
                    <td className={adminTdCell}>
                      <p className="font-medium text-slate-900">{r.userName || "—"}</p>
                      {r.userEmail ? (
                        <p className="text-xs text-slate-500">{r.userEmail}</p>
                      ) : null}
                    </td>
                    <td className={`${adminTdCell} max-w-xs`}>
                      <p className="line-clamp-2 text-slate-700">{r.comment || "—"}</p>
                      {r.hasReply ? (
                        <p className="mt-1 text-[10px] font-bold uppercase text-violet-700">Đã phản hồi</p>
                      ) : null}
                      {r.isVerified ? (
                        <p className="mt-1 text-[10px] font-bold uppercase text-emerald-700">Đã xác minh</p>
                      ) : null}
                    </td>
                    <td className={`${adminTdCell} text-slate-600`}>{formatDate(r.createdAt)}</td>
                    <td className={adminTdCell}>
                      <button
                        type="button"
                        disabled={busyId === r._id}
                        onClick={() => void toggleVisibility(r)}
                        className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-wider disabled:opacity-50 ${
                          r.isVisible
                            ? "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
                            : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                        }`}
                      >
                        {busyId === r._id ? "…" : r.isVisible ? "Ẩn" : "Hiện"}
                      </button>
                    </td>
                  </tr>
                ))
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
    </div>
  );
}
