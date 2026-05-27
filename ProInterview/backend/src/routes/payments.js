import { Router } from "express";
import { authJwt } from "../middleware/authJwt.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { PaymentsController } from "../controllers/paymentsController.js";

export const paymentsRouter = Router();

paymentsRouter.post("/initiate", authJwt, asyncHandler(PaymentsController.initiate));
paymentsRouter.post("/subscription/transfer-pending", authJwt, asyncHandler(PaymentsController.subscriptionTransferPending));
paymentsRouter.patch(
  "/subscription/:paymentId/submit-transfer",
  authJwt,
  asyncHandler(PaymentsController.subscriptionSubmitTransfer),
);
paymentsRouter.get("/history", authJwt, asyncHandler(PaymentsController.history));
paymentsRouter.post("/webhook/momo", asyncHandler(PaymentsController.webhookMomo));
paymentsRouter.post("/webhook/zalopay", asyncHandler(PaymentsController.webhookZalopay));
paymentsRouter.post("/webhook/sepay", asyncHandler(PaymentsController.webhookSepay));
paymentsRouter.get("/transfer-status", authJwt, asyncHandler(PaymentsController.transferStatus));
paymentsRouter.get("/vnpay/ipn", asyncHandler(PaymentsController.vnpayIpn));
paymentsRouter.get("/vnpay/vnpay-return", asyncHandler(PaymentsController.vnpayReturn));
