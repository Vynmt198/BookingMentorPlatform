import { Router } from "express";
import { authJwt } from "../middleware/authJwt.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { UsersController } from "../controllers/usersController.js";

export const usersRouter = Router();

usersRouter.get("/dashboard-stats", authJwt, asyncHandler(UsersController.dashboardStats));
usersRouter.patch("/:id/role", authJwt, requireAdmin, asyncHandler(UsersController.patchUserRole));
