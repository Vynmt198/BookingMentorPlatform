import { Router } from "express";
import { authJwt } from "../middleware/authJwt.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { NotificationsController } from "../controllers/notificationsController.js";

export const notificationsRouter = Router();

notificationsRouter.get("/", authJwt, asyncHandler(NotificationsController.list));
notificationsRouter.get("/unread-count", authJwt, asyncHandler(NotificationsController.getUnreadCount));
notificationsRouter.patch("/:id/read", authJwt, asyncHandler(NotificationsController.markAsRead));
notificationsRouter.post("/read-all", authJwt, asyncHandler(NotificationsController.markAllRead));
notificationsRouter.delete("/:id", authJwt, asyncHandler(NotificationsController.delete));
