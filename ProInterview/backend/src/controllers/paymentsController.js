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
      });
    } catch (err) {
      next(err);
    }
  }

  static async vnpayReturn(req, res, next) {
    try {
      const result = await paymentsService.handleIpnVnpay(req.query ?? {});
      if (result.ok && result.data.RspCode === "00") {
        res.json({ success: true, message: result.data.Message });
      } else {
        res.status(result.status || 400).json({ success: false, error: result.data.Message || "Thanh toán không thành công." });
      }
    } catch (err) {
      next(err);
    }
  }
}
