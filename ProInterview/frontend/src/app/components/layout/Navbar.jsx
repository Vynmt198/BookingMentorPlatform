import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { Bell, BookOpen, Calendar, LogIn, LogOut, Menu, Settings, Shield, ShoppingCart, User, UserPlus, X } from "lucide-react";
import { TopNavShell } from "./TopNavShell";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationAsRead,
} from "../../utils/notificationApi";
import { SidebarTrigger } from "../ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  getUser,
  logout,
  getInitials,
  getDisplayName,
  isLoggedIn,
} from "../../utils/auth";
import { CUSTOMER_NAV_ITEMS, isCustomerNavActive } from "./customerNav";
import { CUSTOMER_SHELL_GUTTER, CUSTOMER_SHELL_MAX } from "./customerShellLayout";
import { BrandLogo } from "../brand/BrandLogo";
import { buildLoginPath, buildRegisterPath } from "../../utils/authGate";
import { useCart } from "../../hooks/useCart";
import { CartDrawer } from "../shared/CartDrawer";

const PAGE_TITLES = {
  "/my-bookings": {
    label: "Lịch hẹn của bạn",
    sub: "Buổi Mentor đã đặt, lịch sắp tới và trạng thái",
  },
  "/cv-analysis": { label: "Phân tích CV", sub: "Phân tích CV với JD hoặc chuẩn ngành, biết chỗ cần chỉnh" },
  "/cv-analysis/jd/history": { label: "Lịch sử CV + JD", sub: "Các lần phân tích CV với Job Description" },
  "/cv-analysis/field/history": { label: "Lịch sử theo ngành", sub: "Các lần phân tích CV theo ngành nghề" },
  "/cv-analysis/jd": { label: "Phân tích CV + JD", sub: "Phân tích CV với Job Description" },
  "/cv-analysis/field": { label: "Phân tích theo ngành", sub: "Đánh giá CV theo chuẩn ngành nghề" },
  "/interview": { label: "Phỏng vấn AI", sub: "Thiết lập buổi luyện, Pio hỏi, bạn trả lời" },
  "/mentors": { label: "Tìm Mentor", sub: "Đặt lịch 1:1 với anh/chị mentor" },
  "/profile": { label: "Hồ sơ cá nhân", sub: "Thông tin và thành tích của bạn" },
  "/settings": { label: "Cài đặt", sub: "Tuỳ chỉnh tài khoản" },
  "/pricing": { label: "Bảng giá", sub: "Chọn gói phù hợp, luyện và nhận góp ý đầy đủ hơn" },
  "/booking": { label: "Đặt lịch", sub: "Chọn thời gian phù hợp với mentor" },
  "/courses": { label: "Khóa học", sub: "Video ngắn từ mentor, ôn kỹ năng trước phỏng vấn" },
  "/my-courses": { label: "Khóa học của tôi", sub: "Tiến độ và khóa bạn đã đăng ký" },
  "/mentor/dashboard": { label: "Mentor", sub: "Bảng điều khiển mentor" },
  "/mentor/schedule": { label: "Lịch họp", sub: "Lịch rảnh và các buổi hẹn" },
  "/mentor/courses": { label: "Khóa học", sub: "Quản lý nội dung khóa học" },
  "/mentor/finance": { label: "Tài chính", sub: "Thu nhập & giao dịch" },
  "/mentor/analytics": { label: "Phân tích", sub: "Số liệu & hiệu suất" },
  "/mentor/reviews": { label: "Đánh giá", sub: "Phản hồi từ học viên" },
  "/mentor/peer-review": { label: "Đánh giá chéo", sub: "Đánh giá chéo khóa học của đồng nghiệp" },
  "/checkout": { label: "Thanh toán", sub: "Chuyển khoản & xác nhận đơn" },
  "/session": { label: "Chi tiết buổi", sub: "Lịch hẹn & trạng thái" },
  "/mentor/meeting-detail": { label: "Chi tiết buổi mentor", sub: "Thông tin phiên họp" },
  "/mentor/meeting": { label: "Phòng họp", sub: "Buổi mentor trực tuyến" },
};

function ShellNavLinks({ items, pathname, isActive, onNavigate, className = "", stacked = false }) {
  return (
    <nav className={className} aria-label="Menu chính">
      {items.map((item) => {
        const active = isActive(pathname, item);
        if (stacked) {
          return (
            <Link
              key={item.url}
              to={item.url}
              onClick={onNavigate}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-violet-50 hover:text-violet-700"
              style={active ? { color: "#8037f4", fontWeight: 800 } : undefined}
            >
              {item.title}
            </Link>
          );
        }
        return (
          <Link
            key={item.url}
            to={item.url}
            onClick={onNavigate}
            className="relative shrink-0 cursor-pointer whitespace-nowrap py-1 text-sm transition-all duration-300"
            style={{
              color: active ? "#8037f4" : "rgb(71, 85, 105)",
              fontWeight: active ? 800 : 600,
            }}
          >
            {item.title}
            <span
              className={`absolute -bottom-1 left-0 h-[3px] w-full rounded-full transition-all duration-300 ${
                active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
              }`}
              style={{
                background: "#93f72b",
                boxShadow: "0 0 12px rgba(196, 255, 71, 0.8)",
              }}
              aria-hidden
            />
          </Link>
        );
      })}
    </nav>
  );
}

function CustomerNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const loggedIn = isLoggedIn();
  const user = getUser();
  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);
  const loginHref = buildLoginPath(`${location.pathname}${location.search}`);
  const registerHref = buildRegisterPath(`${location.pathname}${location.search}`);
  const { cartItemsCount, setIsCartOpen } = useCart();
  const isHome = location.pathname === "/" || location.pathname === "";

  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  React.useEffect(() => {
    if (!loggedIn) {
      setNotifications([]);
      return;
    }
    fetchNotifications().then((res) => {
      if (res.success) setNotifications(res.notifications);
    });
    const interval = setInterval(() => {
      fetchNotifications().then((res) => {
        if (res.success) setNotifications(res.notifications);
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [loggedIn]);

  const handleMarkAllRead = () => {
    markAllNotificationsRead().then((res) => {
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    });
  };

  const handleRead = (notif) => {
    const id = notif._id;
    markNotificationAsRead(id).then((res) => {
      if (res.success) {
        setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      }
    });
    setNotifOpen(false);

    const actionUrl = notif.metadata?.actionUrl || notif.actionUrl;
    if (actionUrl) {
      navigate(actionUrl);
      return;
    }

    const bookingId = notif.metadata?.bookingId || notif.bookingId;
    if (
      bookingId &&
      (notif.type === "feedback" ||
        notif.title?.toLowerCase().includes("nhận xét") ||
        notif.body?.toLowerCase().includes("nhận xét"))
    ) {
      navigate(`/session/${bookingId}`);
      return;
    }

    if (
      bookingId &&
      (notif.type?.includes("booking") || notif.title?.toLowerCase().includes("buổi học"))
    ) {
      navigate(`/session/${bookingId}`);
      return;
    }

    if (notif.type === "payment") {
      navigate("/");
      return;
    }

    if (
      notif.type === "system" &&
      (notif.title?.includes("mentor") || notif.body?.toLowerCase().includes("mentor"))
    ) {
      navigate("/profile");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <TopNavShell variant="light" alignTop={isHome}>
        <Link
          to="/"
          className="flex shrink-0 items-center leading-none"
          aria-label="Trang chủ"
          onClick={(e) => {
            if (location.pathname === "/" || location.pathname === "") {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          <img
            src="/Logo.png"
            alt=""
            className="block h-7 w-auto shrink-0 object-contain contrast-[1.12] brightness-[0.94]"
          />
        </Link>

        <ShellNavLinks
          items={CUSTOMER_NAV_ITEMS}
          pathname={location.pathname}
          isActive={(p, item) => isCustomerNavActive(p, item.url)}
          className={`hidden items-center justify-center gap-3 px-1 md:flex md:gap-4 lg:gap-5 ${
            isHome ? "shrink-0" : "min-w-0 flex-1"
          }`}
        />

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="inline-flex p-2 rounded-lg text-slate-600 transition-colors hover:bg-slate-100 md:hidden"
            aria-label={mobileOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          <button
            type="button"
            className="relative inline-flex size-9 items-center justify-center rounded-xl transition-all focus:outline-none hover:bg-[#8037f4]/10"
            aria-label="Giỏ hàng"
            onClick={() => setIsCartOpen(true)}
          >
            <ShoppingCart className="h-5 w-5 text-[#8037f4]/75" />
            {cartItemsCount > 0 && (
              <span
                className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full font-bold text-[#000000]"
                style={{
                  background: "#93f72b",
                  fontSize: "0.6rem",
                  boxShadow: "0 2px 8px rgba(180,245,0,0.45)",
                }}
              >
                {cartItemsCount > 9 ? "9+" : cartItemsCount}
              </span>
            )}
          </button>

          {loggedIn ? (
            <>
              <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-xl transition-all focus:outline-none md:size-9"
                      style={{
                        background: notifOpen ? "rgba(128,55,244,0.1)" : "transparent",
                        border: notifOpen ? "1px solid rgba(128,55,244,0.25)" : "1px solid transparent",
                      }}
                      aria-label="Thông báo"
                    >
                      <Bell className="size-4 text-[#8037f4]/75 md:size-5" />
                      {unreadCount > 0 && (
                        <span
                          className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full font-bold text-[#000000]"
                          style={{
                            background: "#93f72b",
                            fontSize: "0.6rem",
                            boxShadow: "0 2px 8px rgba(180,245,0,0.45)",
                          }}
                        >
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 overflow-hidden border border-slate-200/90 bg-white p-0 text-slate-900 shadow-xl"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <span className="text-sm font-semibold text-slate-900">Thông báo</span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-semibold text-[#8037f4] hover:underline"
                      >
                        Đọc tất cả
                      </button>
                    )}
                  </div>
                  <div className="max-h-[400px] overflow-y-auto py-1">
                    {notifications.length === 0 && (
                      <div className="px-4 py-8 text-center text-xs text-slate-500">
                        Không có thông báo mới
                      </div>
                    )}
                    {notifications.map((n) => (
                      <DropdownMenuItem
                        key={n._id}
                        onClick={() => handleRead(n)}
                        className="flex cursor-pointer items-start gap-3 px-4 py-3 focus:bg-violet-50"
                      >
                        <div
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{
                            background: !n.isRead ? "#8037f4" : "transparent",
                            border: !n.isRead ? "none" : "1px solid rgba(148, 163, 184, 0.5)",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm ${!n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}
                          >
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                            {n.body || n.message}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex shrink-0 items-center justify-center rounded-full border border-violet-200/80 bg-white p-0 shadow-sm transition-colors hover:border-violet-300 size-7 md:gap-2 md:py-1 md:pl-1 md:pr-2.5 md:size-auto"
                  >
                    <span
                      className="flex size-full items-center justify-center rounded-full text-[10px] font-bold leading-none text-white md:size-8 md:text-xs"
                      style={{ background: "#8037f4" }}
                    >
                      {initials}
                    </span>
                    <span className="hidden max-w-[7rem] truncate text-sm font-semibold text-slate-700 md:inline">
                      {displayName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 size-4" />
                    Hồ sơ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-courses")}>
                    <BookOpen className="mr-2 size-4" />
                    Khóa học của tôi
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-bookings")}>
                    <Calendar className="mr-2 size-4" />
                    Lịch hẹn của tôi
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 size-4" />
                    Cài đặt
                  </DropdownMenuItem>
                  {user?.role === "admin" ? (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield className="mr-2 size-4" />
                      Quản trị
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="font-semibold text-[#8037f4] focus:text-[#8037f4]"
                  >
                    <LogOut className="mr-2 size-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                to={loginHref}
                className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 sm:inline-flex"
              >
                <LogIn className="size-3.5 shrink-0" aria-hidden />
                Đăng nhập
              </Link>
              <Link
                to={registerHref}
                className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition-all hover:scale-105 active:scale-95 sm:px-5"
                style={{
                  background: "#fff",
                  color: "#8037f4",
                  border: "1.5px solid #8037f4",
                }}
              >
                <UserPlus className="size-3.5 shrink-0" aria-hidden />
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </TopNavShell>

      {mobileOpen ? (
        <div
          className="top-nav-shell-outer fixed right-3 top-[3.8rem] z-[99] w-[14rem] sm:right-6 sm:top-[4.2rem] sm:w-[16rem] md:hidden"
        >
          <div
            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl"
          >
          <ShellNavLinks
            items={CUSTOMER_NAV_ITEMS}
            pathname={location.pathname}
            isActive={(p, item) => isCustomerNavActive(p, item.url)}
            onNavigate={() => setMobileOpen(false)}
            className="flex flex-col gap-1"
            stacked
          />
          {!loggedIn ? (
            <div className="mt-2 flex flex-col gap-2 border-t border-slate-100 pt-2">
              <Link
                to={loginHref}
                className="flex items-center justify-center gap-2 rounded-full border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                onClick={() => setMobileOpen(false)}
              >
                <LogIn className="size-4" aria-hidden />
                Đăng nhập
              </Link>
              <Link
                to={registerHref}
                className="flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all"
                style={{
                  background: "#fff",
                  color: "#8037f4",
                  border: "1.5px solid #8037f4",
                }}
                onClick={() => setMobileOpen(false)}
              >
                <UserPlus className="size-4" aria-hidden />
                Đăng ký
              </Link>
            </div>
          ) : null}
          </div>
        </div>
      ) : null}

      <CartDrawer />
    </>
  );
}

function MentorNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  React.useEffect(() => {
    fetchNotifications().then((res) => {
      if (res.success) setNotifications(res.notifications);
    });
    const interval = setInterval(() => {
      fetchNotifications().then((res) => {
        if (res.success) setNotifications(res.notifications);
      });
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = () => {
    markAllNotificationsRead().then((res) => {
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    });
  };

  const handleRead = (notif) => {
    const id = notif._id;
    markNotificationAsRead(id).then((res) => {
      if (res.success) {
        setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
      }
    });
    setNotifOpen(false);

    const actionUrl = notif.metadata?.actionUrl || notif.actionUrl;
    if (actionUrl) {
      navigate(actionUrl);
      return;
    }

    const bookingId = notif.metadata?.bookingId || notif.bookingId;
    if (
      bookingId &&
      (notif.type === "feedback" ||
        notif.title?.toLowerCase().includes("nhận xét") ||
        notif.body?.toLowerCase().includes("nhận xét"))
    ) {
      navigate(`/session/${bookingId}`);
      return;
    }

    if (
      bookingId &&
      (notif.type?.includes("booking") || notif.title?.toLowerCase().includes("buổi học"))
    ) {
      navigate(`/session/${bookingId}`);
      return;
    }

    if (notif.type === "payment") {
      navigate("/mentor/finance");
    }
  };

  const pageKey =
    Object.keys(PAGE_TITLES).find(
      (k) => k === location.pathname || location.pathname.startsWith(`${k}/`),
    ) || location.pathname;
  const pageInfo = PAGE_TITLES[pageKey] || { label: "ProInterview", sub: "" };
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <header
      className="z-30 flex h-16 shrink-0 items-center gap-4 border-b px-5 antialiased backdrop-blur-xl"
      style={{
        background: "rgba(255, 255, 255, 0.92)",
        borderColor: "rgba(186, 165, 255, 0.45)",
        boxShadow: "0 1px 0 rgba(128, 55, 244, 0.08), 0 4px 20px rgba(128, 55, 244, 0.06)",
      }}
    >
      <SidebarTrigger className="rounded-lg text-[#8037f4]/75 transition-colors hover:bg-[#8037f4]/10 hover:text-[#8037f4]" />
      <div className="h-6 w-px shrink-0 bg-[#8037f4]/20" />
      <div className="min-w-0 flex flex-col gap-0">
        <h1
          className="truncate text-[#8037f4]"
          style={{ fontSize: "0.9375rem", fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.015em" }}
        >
          {pageInfo.label}
        </h1>
        {pageInfo.sub ? (
          <p className="hidden truncate text-xs text-slate-500 sm:block">{pageInfo.sub}</p>
        ) : null}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative inline-flex size-9 items-center justify-center rounded-xl transition-all focus:outline-none"
              style={{
                background: notifOpen ? "rgba(128,55,244,0.1)" : "transparent",
                border: notifOpen ? "1px solid rgba(128,55,244,0.25)" : "1px solid transparent",
              }}
              aria-label="Thông báo"
            >
              <Bell className="h-5 w-5 text-[#8037f4]/75" />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full font-bold text-[#000000]"
                  style={{
                    background: "#93f72b",
                    fontSize: "0.6rem",
                    boxShadow: "0 2px 8px rgba(180,245,0,0.45)",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 overflow-hidden border border-slate-200/90 bg-white p-0 text-slate-900 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-sm font-semibold text-slate-900">Thông báo</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-semibold text-[#8037f4] hover:underline"
                >
                  Đọc tất cả
                </button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto py-1">
              {notifications.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-slate-500">Không có thông báo mới</div>
              )}
              {notifications.map((n) => (
                <DropdownMenuItem
                  key={n._id}
                  onClick={() => handleRead(n)}
                  className="flex cursor-pointer items-start gap-3 px-4 py-3 focus:bg-violet-50"
                >
                  <div
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{
                      background: !n.isRead ? "#8037f4" : "transparent",
                      border: !n.isRead ? "none" : "1px solid rgba(148, 163, 184, 0.5)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${!n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}
                    >
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{n.body || n.message}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function Navbar({ variant = "customer" }) {
  if (variant === "mentor") {
    return <MentorNavbar />;
  }
  return <CustomerNavbar />;
}
