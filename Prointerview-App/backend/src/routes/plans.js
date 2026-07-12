import { Router } from "express";
import { authJwt } from "../middleware/authJwt.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { PlansController } from "../controllers/plansController.js";

export const plansRouter = Router();

plansRouter.get("/current", authJwt, asyncHandler(PlansController.current));
plansRouter.post("/activate", authJwt, asyncHandler(PlansController.activate));
plansRouter.post("/cancel", authJwt, asyncHandler(PlansController.cancel));
