import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { SidebarProvider, SidebarInset } from "../ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { resolveDocumentTitle } from "../../utils/documentTitle";
import { getUser } from "../../utils/auth";
import { MENTOR_MAIN_TOP_PAD } from "./customerShellLayout";

export function AppLayout() {
  const location = useLocation();
  const user = getUser();
  const isMentor = user?.role === "mentor";
  const isHome = location.pathname === "/" || location.pathname === "";
  const pathNorm = location.pathname.replace(/^\/+/, "");
  const isCvAnalysisHub = pathNorm === "cv-analysis";
  const allowHorizontalScroll = isHome || isCvAnalysisHub;
  const isLegalDoc = pathNorm === "terms" || pathNorm === "privacy";
  const hideNavbar = pathNorm === "interview/room";
  const hideFooter = hideNavbar;
  const showSiteFooter = !isMentor && !hideFooter;
  const ambientModifier = isHome
    ? " app-shell-ambient--home"
    : isLegalDoc
      ? " app-shell-ambient--legal"
      : "";

  useEffect(() => {
    document.title = resolveDocumentTitle(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("app-route-home", isHome);
    return () => document.documentElement.classList.remove("app-route-home");
  }, [isHome]);

  const shellClass =
    `app-user-shell relative min-h-svh w-full text-slate-900 antialiased selection:bg-violet-100 selection:text-violet-900 ${
      allowHorizontalScroll
        ? "app-user-shell--home overflow-x-auto overflow-y-visible bg-transparent"
        : isLegalDoc
          ? "overflow-x-hidden bg-slate-50"
          : "overflow-x-hidden bg-[#f3f0f9]"
    }`;

  const shellStyle = {
    fontFamily: "'Lexend', 'Plus Jakarta Sans', system-ui, sans-serif",
  };

  if (isMentor) {
    return (
      <div className={shellClass} style={shellStyle}>
        <div
          className={`app-shell-ambient${ambientModifier}`}
          aria-hidden
        />
        <SidebarProvider
          className="relative z-[1] flex min-h-svh w-full bg-transparent"
          style={{
            "--sidebar-width": "228px",
            "--sidebar-width-icon": "56px",
          }}
        >
          <AppSidebar />
          <SidebarInset className="relative z-[1] flex h-svh max-h-svh min-h-0 flex-1 flex-col overflow-hidden bg-transparent shadow-none md:peer-data-[variant=inset]:shadow-none md:peer-data-[variant=inset]:m-0 md:peer-data-[variant=inset]:rounded-none">
            <Navbar variant="mentor" />
            <div
              className={`relative z-[1] min-h-0 flex-1 overflow-x-hidden overflow-y-auto ${MENTOR_MAIN_TOP_PAD}`}
            >
              <Outlet />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    );
  }

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
        {!hideNavbar && <Navbar variant="customer" />}
        <main
          className={`relative z-[1] min-h-0 flex-1 ${
            hideNavbar
              ? "flex min-h-svh flex-col pt-0"
              : `pt-[3.75rem] sm:pt-[4.25rem] md:pt-[4.75rem] max-lg:overflow-x-hidden${allowHorizontalScroll ? " lg:overflow-x-auto lg:overflow-y-visible" : ""}`
          }`}
        >
          <Outlet />
        </main>
        {showSiteFooter ? <Footer variant="light" /> : null}
      </div>
    </div>
  );
}
