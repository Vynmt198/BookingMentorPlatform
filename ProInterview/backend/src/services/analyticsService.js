import mongoose from "mongoose";
import { UserEvent } from "../models/UserEvent.js";

const MONGO_ERR = "MongoDB chưa kết nối. Kiểm tra MONGO_URI trong .env.";

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

const MAX_EVENTS_PER_REQUEST = 30;
const MAX_ROUTE_LEN = 256;

/** Các bước funnel cơ bản để admin theo dõi đường đi của user. */
export const FUNNEL_STEPS = [
  { route: "/", regex: "^/$" },
  { route: "/pricing", regex: "^/pricing" },
  { route: "/cv-analysis", regex: "^/cv-analysis" },
  { route: "/mentors", regex: "^/mentors" },
  { route: "/booking", regex: "^/booking" },
  { route: "/checkout", regex: "^/checkout" },
];

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(v)));
}

function normalizeRoute(route) {
  const raw = String(route || "").trim();
  if (!raw) return "";
  const path = raw.split("?")[0].split("#")[0];
  const norm = path.startsWith("/") ? path : `/${path}`;
  return norm.slice(0, MAX_ROUTE_LEN);
}

function sanitizeEvent(raw = {}) {
  const type = raw.type === "action" ? "action" : "page_view";
  const route = normalizeRoute(raw.route);
  if (!route) return null;

  const durationMs = clampInt(raw.durationMs, 0, 24 * 60 * 60 * 1000, 0);
  const action = type === "action" ? String(raw.action || "").trim().slice(0, 64) : "";
  if (type === "action" && !action) return null;

  const clientSessionId = String(raw.clientSessionId || "").trim().slice(0, 64);
  const metadata =
    raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
      ? raw.metadata
      : {};

  return { type, route, action, durationMs, clientSessionId, metadata };
}

export async function recordUserEvents(userId, eventsInput) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  if (!mongoose.isValidObjectId(userId)) {
    return { ok: false, status: 401, error: "Phiên không hợp lệ." };
  }

  const list = Array.isArray(eventsInput) ? eventsInput : eventsInput ? [eventsInput] : [];
  if (list.length === 0) return { ok: true, inserted: 0 };
  if (list.length > MAX_EVENTS_PER_REQUEST) {
    return { ok: false, status: 400, error: `Tối đa ${MAX_EVENTS_PER_REQUEST} sự kiện mỗi lần gửi.` };
  }

  const docs = [];
  for (const item of list) {
    const ev = sanitizeEvent(item);
    if (ev) docs.push({ userId, ...ev });
  }
  if (docs.length === 0) return { ok: true, inserted: 0 };

  await UserEvent.insertMany(docs, { ordered: false });
  return { ok: true, inserted: docs.length };
}

export async function getUserJourney(userId, options = {}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };
  if (!mongoose.isValidObjectId(userId)) {
    return { ok: false, status: 400, error: "userId không hợp lệ." };
  }

  const days = clampInt(options.days, 1, 90, 30);
  const limit = clampInt(options.limit, 1, 200, 100);
  const since = new Date(Date.now() - days * 86_400_000);
  const uid = new mongoose.Types.ObjectId(userId);

  const [events, routeStats, lastPageView] = await Promise.all([
    UserEvent.find({ userId: uid, createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    UserEvent.aggregate([
      {
        $match: {
          userId: uid,
          type: "page_view",
          createdAt: { $gte: since },
          durationMs: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$route",
          visits: { $sum: 1 },
          totalMs: { $sum: "$durationMs" },
        },
      },
      { $sort: { totalMs: -1 } },
      { $limit: 10 },
    ]),
    UserEvent.findOne({ userId: uid, type: "page_view", createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const topRoutes = routeStats.map((r) => ({
    route: r._id,
    visits: r.visits,
    totalMs: r.totalMs,
    avgMs: r.visits > 0 ? Math.round(r.totalMs / r.visits) : 0,
  }));

  const lastAction = events.find((e) => e.type === "action") || null;

  return {
    ok: true,
    journey: {
      days,
      events,
      topRoutes,
      lastStop: lastPageView
        ? {
            route: lastPageView.route,
            at: lastPageView.createdAt,
            durationMs: lastPageView.durationMs,
          }
        : null,
      lastAction: lastAction
        ? {
            action: lastAction.action,
            route: lastAction.route,
            at: lastAction.createdAt,
            metadata: lastAction.metadata || {},
          }
        : null,
    },
  };
}

export async function getPlatformBehavior(options = {}) {
  if (!isMongoReady()) return { ok: false, status: 503, error: MONGO_ERR };

  const days = clampInt(options.days, 1, 90, 7);
  const since = new Date(Date.now() - days * 86_400_000);

  const [topRoutes, funnelCounts, recentActions] = await Promise.all([
    UserEvent.aggregate([
      { $match: { type: "page_view", createdAt: { $gte: since } } },
      {
        $group: {
          _id: "$route",
          visits: { $sum: 1 },
          users: { $addToSet: "$userId" },
          totalMs: { $sum: "$durationMs" },
        },
      },
      {
        $project: {
          route: "$_id",
          visits: 1,
          uniqueUsers: { $size: "$users" },
          totalMs: 1,
          avgMs: {
            $cond: [{ $gt: ["$visits", 0] }, { $divide: ["$totalMs", "$visits"] }, 0],
          },
        },
      },
      { $sort: { totalMs: -1 } },
      { $limit: 15 },
    ]),
    Promise.all(
      FUNNEL_STEPS.map(async (step) => {
        const users = await UserEvent.distinct("userId", {
          type: "page_view",
          createdAt: { $gte: since },
          route: { $regex: step.regex },
        });
        return { route: step.route, users: users.length };
      }),
    ),
    UserEvent.aggregate([
      { $match: { type: "action", createdAt: { $gte: since } } },
      { $group: { _id: "$action", count: { $sum: 1 }, users: { $addToSet: "$userId" } } },
      {
        $project: {
          action: "$_id",
          count: 1,
          uniqueUsers: { $size: "$users" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]),
  ]);

  return {
    ok: true,
    behavior: {
      days,
      topRoutes: topRoutes.map((r) => ({
        route: r.route,
        visits: r.visits,
        uniqueUsers: r.uniqueUsers,
        totalMs: Math.round(r.totalMs),
        avgMs: Math.round(r.avgMs),
      })),
      funnel: funnelCounts,
      topActions: recentActions.map((a) => ({
        action: a.action,
        count: a.count,
        uniqueUsers: a.uniqueUsers,
      })),
    },
  };
}
