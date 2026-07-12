import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { hasAuthCredentials } from "../utils/auth.js";
import { flushAnalytics, shouldTrackRoute, trackPageView } from "../utils/analytics/analyticsApi.js";

const MIN_DURATION_MS = 1000;

export function usePageAnalytics() {
  const location = useLocation();
  const enteredAtRef = useRef(Date.now());
  const routeRef = useRef(location.pathname);

  useEffect(() => {
    if (!hasAuthCredentials()) return undefined;

    const prevRoute = routeRef.current;
    const prevEntered = enteredAtRef.current;
    const now = Date.now();
    const duration = now - prevEntered;

    if (
      prevRoute &&
      prevRoute !== location.pathname &&
      shouldTrackRoute(prevRoute) &&
      duration >= MIN_DURATION_MS &&
      document.visibilityState !== "hidden"
    ) {
      trackPageView(prevRoute, duration);
    }

    routeRef.current = location.pathname;
    enteredAtRef.current = now;

    const onHidden = () => {
      const elapsed = Date.now() - enteredAtRef.current;
      const route = routeRef.current;
      if (shouldTrackRoute(route) && elapsed >= MIN_DURATION_MS) {
        trackPageView(route, elapsed);
        enteredAtRef.current = Date.now();
      }
      void flushAnalytics();
    };

    const onVisible = () => {
      enteredAtRef.current = Date.now();
    };

    const onVisChange = () => {
      if (document.visibilityState === "hidden") onHidden();
      else onVisible();
    };

    document.addEventListener("visibilitychange", onVisChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisChange);
      void flushAnalytics();
    };
  }, [location.pathname]);
}
