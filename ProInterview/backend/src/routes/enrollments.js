import { Router } from "express";
import { EnrollmentController } from "../controllers/enrollmentController.js";
import { authJwt } from "../middleware/authJwt.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const enrollmentsRouter = Router();

enrollmentsRouter.use(authJwt);

enrollmentsRouter.get("/my", asyncHandler(EnrollmentController.getMyEnrollments));
enrollmentsRouter.patch("/:id/submit-transfer", asyncHandler(EnrollmentController.submitTransfer));
enrollmentsRouter.get("/:id/certificate", asyncHandler(EnrollmentController.getCertificate));
enrollmentsRouter.patch("/:id/progress", asyncHandler(EnrollmentController.updateProgress));
