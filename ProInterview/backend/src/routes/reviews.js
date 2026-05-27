import { Router } from "express";
import { authJwt } from "../middleware/authJwt.js";
import { requireMentor } from "../middleware/requireMentor.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { ReviewsController } from "../controllers/reviewsController.js";

export const reviewsRouter = Router();

reviewsRouter.get("/", asyncHandler(ReviewsController.list));
reviewsRouter.get("/mine", authJwt, asyncHandler(ReviewsController.mine));
reviewsRouter.post("/", authJwt, asyncHandler(ReviewsController.create));
reviewsRouter.patch("/:id/reply", authJwt, requireMentor, asyncHandler(ReviewsController.reply));
reviewsRouter.delete("/:id", authJwt, asyncHandler(ReviewsController.remove));
