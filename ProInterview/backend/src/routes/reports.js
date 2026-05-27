import { Router } from "express";
import { authJwt } from "../middleware/authJwt.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { ReportsController } from "../controllers/reportsController.js";

export const reportsRouter = Router();

reportsRouter.post("/", authJwt, asyncHandler(ReportsController.create));
