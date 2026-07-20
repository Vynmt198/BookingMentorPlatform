import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { resolveDocumentTitle } from "../../utils/documentTitle";
import { getUser } from "../../utils/auth";

export function AppLayout() {
  const location = useLocation();
  const user = getUser();
  const isMentor = user?.role === "mentor";
  const isHome = location.pathname === "/" || location.pathname === "";
  const pathNorm = location.pathname.replace(/^\/+/, "");
  const isCvAnalysisHub = pathNorm === "cv-analysis";
  const allowHorizontalScroll = isCvAnalysisHub;
  const isLegalDoc = pathNorm === "terms" || pathNorm === "privacy";
  const hideNavbar = pathNorm === "interview/room";
  const hideFooter = pathNorm === "interview/room" || pathNorm === "checkout";
  const showSiteFooter = !isMentor && !hideFooter;
  const ambientModifier = isHome
    ? " app-shell-ambient--home"
    : isLegalDoc
      ? " app-shell-ambient--legal"
      : isMentor
        ? " app-shell-ambient--mentor"
        : "";

  useEffect(() => {
    document.title = resolveDocumentTitle(location.pathname);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("app-route-home", isHome);
    return () => document.documentElement.classList.remove("app-route-home");
  }, [isHome]);

  const shellClass =
    `app-user-shell relative min-h-svh w-full text-slate-900 antialiased selection:bg-violet-100 selection:text-violet-900 ${
      isHome
        ? "app-user-shell--home overflow-x-clip overflow-y-visible bg-transparent"
        : isLegalDoc || isMentor
          ? "overflow-x-hidden bg-slate-50"
          : "overflow-x-hidden bg-[#f3f0f9]"
    }`;

  const shellStyle = {
    fontFamily: "'Lexend', 'Plus Jakarta Sans', system-ui, sans-serif",
  };

  return (
    <div className={shellClass} style={shellStyle}>
      <div
        className={`app-shell-ambient${ambientModifier}`}
        aria-hidden
      />
      <div
        className={`relative z-[1] flex min-h-svh w-full flex-col ${
          isHome ? "home-layout-fixed max-lg:min-w-0 max-lg:w-full" : ""
        }`}
      >
        {!hideNavbar && <Navbar variant={isMentor ? "mentor" : "customer"} />}
        <main
          className={`relative z-[1] min-h-0 flex-1 ${
            hideNavbar
              ? "flex min-h-svh flex-col pt-0"
              : isHome
                ? "overflow-x-clip overflow-y-visible pt-0"
                : "overflow-x-clip pt-[3.75rem] sm:pt-[4.25rem] md:pt-[4.75rem]"
          }`}
        >
          <Outlet />
        </main>
        {showSiteFooter ? <Footer variant="light" /> : null}
      </div>
    </div>
  );
}
