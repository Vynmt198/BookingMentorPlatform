import { MentorPageShell } from "../../components/mentor/MentorPageShell";
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Search as MagnifyingGlass,
  X,
  AlertCircle,
} from "lucide-react";
import { fetchMentors } from "../../utils/mentorApi";
import { fetchRebookCredit } from "../../utils/bookingsApi";
import { toastApiError } from "../../utils/apiToast";
import {
  MENTOR_FILTER_FIELDS,
  mentorMatchesFilterField,
} from "../../constants/mentorFilterFields";
import { CUSTOMER_SHELL_GUTTER, CUSTOMER_SHELL_MAX } from "../../components/layout/customerShellLayout";
import { CustomerPageHeader } from "../../components/layout/CustomerPageHeader";
import {
  ExploreFilterSidebar,
  FilterRadio,
  FilterSection,
} from "../../components/shared/ExploreFilterSidebar";
import { ListPagination } from "../../components/shared/ListPagination";
import { MentorListCard } from "../../components/mentor/MentorListCard";

const EXPERIENCE_OPTIONS = [
  { label: "1-3 năm", value: "1-3" },
  { label: "4-6 năm", value: "4-6" },
  { label: "7+ năm", value: "7+" },
];

const PRICE_OPTIONS = [
  { label: "Dưới 280k", min: 0, max: 280000 },
  { label: "280k - 320k", min: 280000, max: 320000 },
  { label: "Trên 320k", min: 320000, max: Infinity },
];

const MENTORS_PAGE_SIZE = 10;

function MentorsSidebar({
  selectedField,
  onFieldChange,
  selectedExp,
  onExpChange,
  selectedPriceIndex,
  onPriceChange,
  onClear,
  hasFilter,
}) {
  const [openField, setOpenField] = useState(true);
  const [openExp, setOpenExp] = useState(true);
  const [openPrice, setOpenPrice] = useState(true);

  return (
    <ExploreFilterSidebar onClear={onClear} hasFilter={hasFilter} mobileCollapsible>
      <FilterSection title="Lĩnh vực" open={openField} onToggle={() => setOpenField((v) => !v)}>
        {MENTOR_FILTER_FIELDS.map((field) => (
          <FilterRadio
            key={field}
            active={selectedField === field}
            onClick={() => onFieldChange(selectedField === field ? null : field)}
          >
            {field}
          </FilterRadio>
        ))}
      </FilterSection>

      <FilterSection title="Kinh nghiệm" open={openExp} onToggle={() => setOpenExp((v) => !v)}>
        {EXPERIENCE_OPTIONS.map((opt) => (
          <FilterRadio
            key={opt.value}
            active={selectedExp === opt.value}
            onClick={() => onExpChange(selectedExp === opt.value ? null : opt.value)}
          >
            {opt.label}
          </FilterRadio>
        ))}
      </FilterSection>

      <FilterSection title="Giá / giờ" open={openPrice} onToggle={() => setOpenPrice((v) => !v)}>
        {PRICE_OPTIONS.map((opt, index) => (
          <FilterRadio
            key={opt.label}
            active={selectedPriceIndex === index}
            onClick={() =>
              onPriceChange(selectedPriceIndex === index ? null : index)
            }
          >
            {opt.label}
          </FilterRadio>
        ))}
      </FilterSection>
    </ExploreFilterSidebar>
  );
}

export function Mentors() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rebookFrom =
    searchParams.get("rebookFrom") ||
    (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("prointerview_rebook_from") : "") ||
    "";
  const [rebookCredit, setRebookCredit] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedField, setSelectedField] = useState(null);
  const [selectedExp, setSelectedExp] = useState(null);
  const [selectedPriceIndex, setSelectedPriceIndex] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!rebookFrom) {
      setRebookCredit(null);
      return;
    }
    void fetchRebookCredit(rebookFrom)
      .then((r) => {
        if (r.success && r.credit?.available) {
          setRebookCredit(r.credit);
          return;
        }
        setRebookCredit(null);
        if (r && !r.success && r.error) toastApiError(r.error);
      })
      .catch(() => {
        setRebookCredit(null);
        toastApiError("Không tải được thông tin tín dụng đặt lại.");
      });
  }, [rebookFrom]);

  const bookingPath = (mentorId) => {
    const base = `/booking/${mentorId}`;
    return rebookFrom ? `${base}?rebookFrom=${encodeURIComponent(rebookFrom)}` : base;
  };

  useEffect(() => {
    setLoading(true);
    fetchMentors()
      .then((res) => {
        if (res.success) {
          setMentors(res.mentors || []);
          setError(null);
        } else {
          const msg = res.error || "Không tải được danh sách mentor.";
          setError(msg);
          setMentors([]);
          toastApiError(msg);
        }
      })
      .catch((e) => {
        const msg = e?.message || "Lỗi kết nối khi tải danh sách mentor.";
        setError(msg);
        setMentors([]);
        toastApiError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredMentors = useMemo(() => {
    return mentors.filter((m) => {
      const q = search.toLowerCase();
      const matchSearch =
        search === "" ||
        m.name.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.field.toLowerCase().includes(q) ||
        m.tags.some((t) => t.toLowerCase().includes(q));

      const matchField = mentorMatchesFilterField(m, selectedField);

      const matchExp =
        !selectedExp ||
        (selectedExp === "1-3" && m.experience <= 3) ||
        (selectedExp === "4-6" && m.experience >= 4 && m.experience <= 6) ||
        (selectedExp === "7+" && m.experience >= 7);

      const priceRange =
        selectedPriceIndex != null ? PRICE_OPTIONS[selectedPriceIndex] : null;
      const matchPrice =
        !priceRange || (m.price >= priceRange.min && m.price <= priceRange.max);

      return matchSearch && matchField && matchExp && matchPrice;
    });
  }, [search, selectedField, selectedExp, selectedPriceIndex, mentors]);

  const totalPages = Math.max(1, Math.ceil(filteredMentors.length / MENTORS_PAGE_SIZE));

  const paginatedMentors = useMemo(() => {
    const start = (currentPage - 1) * MENTORS_PAGE_SIZE;
    return filteredMentors.slice(start, start + MENTORS_PAGE_SIZE);
  }, [filteredMentors, currentPage]);

  const hasFilter =
    Boolean(search) ||
    Boolean(selectedField) ||
    Boolean(selectedExp) ||
    selectedPriceIndex != null;

  const clearFilters = () => {
    setSearch("");
    setSelectedField(null);
    setSelectedExp(null);
    setSelectedPriceIndex(null);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedField, selectedExp, selectedPriceIndex]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  return (
    <MentorPageShell bottomPad="pb-20">
      <div className={`relative z-10 flex flex-col pb-8 pt-8 sm:pt-10 ${CUSTOMER_SHELL_GUTTER}`}>
        <div className={`${CUSTOMER_SHELL_MAX} w-full`}>
          {rebookCredit?.available ? (
            <div className="mb-4 rounded-2xl border border-violet-200/80 bg-violet-50/95 px-4 py-3 text-sm text-violet-950">
              <p className="font-bold">Credit đổi mentor</p>
              <p className="mt-1 text-xs leading-relaxed text-violet-900/90">
                Bạn có <strong>{Number(rebookCredit.creditVnd || 0).toLocaleString("vi-VN")}₫</strong> từ lịch mentor đã
                hủy. Chọn <strong>mentor khác</strong> — nếu giá buổi mới ≤ credit thì{" "}
                <strong>không cần chuyển khoản lại</strong>.
              </p>
            </div>
          ) : null}

          <CustomerPageHeader
            badge="Mentor 1:1"
            title={
              <>
                Kết nối Mentor <span className="text-[#8037f4]">phù hợp</span>
              </>
            }
            subtitle="Kết nối với Mentor giúp bạn có góc nhìn từ ngành, hiểu điều nhà tuyển dụng mong đợi và tự tin hơn khi bước vào phỏng vấn thật."
            className="mb-6"
          />

          <div className="rounded-3xl border border-violet-200/80 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <MentorsSidebar
                selectedField={selectedField}
                onFieldChange={setSelectedField}
                selectedExp={selectedExp}
                onExpChange={setSelectedExp}
                selectedPriceIndex={selectedPriceIndex}
                onPriceChange={setSelectedPriceIndex}
                onClear={clearFilters}
                hasFilter={hasFilter}
              />

              <div className="min-w-0 flex-1">
                <div className="relative mb-4">
                  <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-violet-400" />
                  <input
                    type="search"
                    className="w-full rounded-2xl border border-violet-200/70 bg-white py-2.5 pl-10 pr-10 text-sm shadow-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-[#8037f4]/15"
                    placeholder="Tìm theo tên, ngành, kỹ năng..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-violet-50"
                      aria-label="Xóa từ khóa"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>

                {loading ? (
                  <div className="divide-y divide-slate-200/90">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex animate-pulse gap-4 py-7">
                        <div className="size-[88px] shrink-0 rounded-full bg-violet-100" />
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="h-5 w-2/5 rounded bg-violet-100" />
                          <div className="h-4 w-3/5 rounded bg-slate-100" />
                          <div className="h-4 w-full rounded bg-slate-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/30 py-16 text-center">
                    <AlertCircle className="mx-auto mb-3 size-10 text-violet-400" />
                    <p className="font-medium text-violet-950">Không thể tải danh sách mentor</p>
                    <button
                      type="button"
                      onClick={() => {
                        setLoading(true);
                        fetchMentors()
                          .then((res) => {
                            if (res.success) {
                              setMentors(res.mentors || []);
                              setError(null);
                            } else {
                              const msg = res.error || "Không tải được danh sách mentor.";
                              setError(msg);
                              toastApiError(msg);
                            }
                          })
                          .catch(() => toastApiError("Lỗi kết nối khi tải danh sách mentor."))
                          .finally(() => setLoading(false));
                      }}
                      className="mt-4 rounded-xl bg-[#8037f4] px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : filteredMentors.length === 0 ? (
                  <div className="rounded-2xl border border-violet-100 bg-violet-50/30 py-16 text-center">
                    <MagnifyingGlass className="mx-auto mb-4 size-12 text-violet-300" />
                    <h3 className="mb-2 text-lg font-bold text-violet-950">Không tìm thấy mentor phù hợp</h3>
                    <p className="mb-6 text-sm text-slate-600">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-xl bg-[#8037f4] px-6 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      {paginatedMentors.map((mentor) => (
                        <MentorListCard
                          key={mentor.id}
                          mentor={mentor}
                          onOpenProfile={() => navigate(`/mentors/${mentor.id}`)}
                          onBook={() => navigate(bookingPath(mentor.id))}
                        />
                      ))}
                    </div>
                    <ListPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MentorPageShell>
  );
}
