import * as paymentsService from "../services/paymentsService.js";
import * as sepayWebhookService from "../services/sepayWebhookService.js";

export class PaymentsController {
  static async initiate(req, res, next) {
    try {
      const ipAddr = req.headers['x-forwarded-for'] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress || 
                     req.connection.socket.remoteAddress;
      const result = await paymentsService.initiatePayment(req.userId, { ...(req.body ?? {}), ipAddr });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.status(201).json({
        success: true,
        paymentId: result.paymentId,
        providerRef: result.providerRef,
        payUrl: result.payUrl,
        qrBase64: result.qrBase64,
        deepLink: result.deepLink,
        mock: result.mock,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async subscriptionTransferPending(req, res, next) {
    try {
      const result = await paymentsService.createSubscriptionTransferPending(req.userId, req.body ?? {});
      if (!result.ok) {
        return res.status(result.status || 400).json({ success: false, error: result.error });
      }
      res.status(201).json({
        success: true,
        paymentId: result.paymentId,
        providerRef: result.providerRef,
        idempotent: Boolean(result.idempotent),
        paymentExpiresAt: result.paymentExpiresAt,
      });
    } catch (err) {
      next(err);
    }
  }

  static async subscriptionSubmitTransfer(req, res, next) {
    try {
      const paymentId = req.params.paymentId;
      const result = await paymentsService.submitSubscriptionTransfer(req.userId, {
        paymentId,
        reference: req.body?.reference ?? req.body?.paymentRef ?? req.body?.orderNum,
      });
      if (!result.ok) {
        return res.status(result.status || 400).json({ success: false, error: result.error });
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  static async history(req, res, next) {
    try {
      const limit = req.query.limit;
      const result = await paymentsService.listPaymentHistory(req.userId, limit);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, payments: result.payments });
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const result = await paymentsService.getPaymentForUser(req.userId, req.params.paymentId);
      if (!result.ok) {
        return res.status(result.status || 400).json({ success: false, error: result.error });
      }
      res.json({ success: true, payment: result.payment });
    } catch (err) {
      next(err);
    }
  }

  static async webhookMomo(req, res, next) {
    try {
      const secret = req.headers["x-payment-secret"] ?? req.headers["X-Payment-Secret"];
      const result = await paymentsService.handleWebhookMomo(req.body ?? {}, secret);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  static async webhookZalopay(req, res, next) {
    try {
      const secret = req.headers["x-payment-secret"] ?? req.headers["X-Payment-Secret"];
      const result = await paymentsService.handleWebhookZalopay(req.body ?? {}, secret);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  static async vnpayIpn(req, res, next) {
    try {
      const result = await paymentsService.handleIpnVnpay(req.query ?? {});
      res.status(result.ok ? 200 : (result.status || 400)).json(result.data);
    } catch (err) {
      next(err);
    }
  }

  static async webhookSepay(req, res, next) {
    try {
      const auth =
        req.headers.authorization ??
        req.headers.Authorization ??
        req.headers["x-sepay-api-key"] ??
        "";
      const result = await sepayWebhookService.handleSepayWebhook(req.body ?? {}, auth);
      if (!result.ok) {
        return res.status(result.status || 400).json({ success: false, error: result.error });
      }
      res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  static async transferStatus(req, res, next) {
    try {
      const orderRef = req.query.orderRef ?? req.query.orderNum ?? "";
      const result = await sepayWebhookService.getTransferStatusForUser(req.userId, orderRef);
      if (!result.ok) {
        return res.status(result.status || 400).json({ success: false, error: result.error });
      }
      res.json({
        success: true,
        orderRef: result.orderRef,
        status: result.status,
        entityType: result.entityType,
        entityId: result.entityId,
        redirectTo: result.redirectTo,
        sepayAuto: Boolean(result.sepayAuto),
        paymentExpiresAt: result.paymentExpiresAt ?? null,
        expiresInMs: result.expiresInMs ?? 0,
        timeoutMinutes: result.timeoutMinutes ?? 15,
      });
    } catch (err) {
      next(err);
    }
  }

  static async vnpayReturn(req, res, next) {
    try {
      const { format, ...vnpQuery } = req.query ?? {};
      const result = await paymentsService.handleIpnVnpay(vnpQuery);
      const rspCode = result.data?.RspCode;
      const responseCode = String(vnpQuery.vnp_ResponseCode || result.responseCode || "");
      const paid = result.transactionSuccessful === true;
      const wantsJson =
        format === "json" ||
        String(req.headers.accept || "").includes("application/json");

      if (wantsJson) {
        if (result.ok && paid) {
          return res.json({
            success: true,
            status: "success",
            message: result.data.Message,
            rspCode,
            responseCode,
            paymentId: result.paymentId,
          });
        }
        if (result.ok && result.paymentStatus === "failed") {
          return res.json({
            success: false,
            status: "failed",
            error: "Giao dịch VNPay không thành công.",
            rspCode,
            responseCode,
            paymentId: result.paymentId,
          });
        }
        return res.status(result.status || 400).json({
          success: false,
          status: "error",
          error: result.data?.Message || "Thanh toán không thành công.",
          rspCode,
          responseCode,
        });
      }

      const mobileReturnUrl = await paymentsService.getPaymentMobileReturnUrl(result.paymentId);
      const frontendBase = (mobileReturnUrl ||
        process.env.FRONTEND_URL ||
        process.env.VNP_FRONTEND_RETURN_URL ||
        "http://localhost:8081"
      ).replace(/\/$/, "");
      const qs = new URLSearchParams(vnpQuery).toString();
      // exp://host?q  — không thêm "/" thừa (tránh hỏng deep link Expo)
      const join = frontendBase.startsWith("exp://") ? "?" : "/?";
      return res.redirect(302, qs ? `${frontendBase}${join}${qs}` : frontendBase);
    } catch (err) {
      next(err);
    }
  }
}
