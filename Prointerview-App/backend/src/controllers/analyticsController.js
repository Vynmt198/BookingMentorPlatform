import { recordUserEvents } from "../services/analyticsService.js";

export const AnalyticsController = {
  recordEvents: async (req, res, next) => {
    try {
      const userId = req.userId;
      const events = req.body?.events ?? req.body?.event ?? req.body;
      const result = await recordUserEvents(userId, events);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, inserted: result.inserted });
    } catch (error) {
      next(error);
    }
  },
};
