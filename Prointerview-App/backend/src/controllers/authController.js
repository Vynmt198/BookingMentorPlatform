import * as authService from "../services/authService.js";

/**
 * HTTP layer — gọi `authService`, map `{ ok, status?, error? }` → status + JSON.
 */
export class AuthController {
  static async register(req, res, next) {
    try {
      const result = await authService.registerUser(req.body ?? {});
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.status(201).json({ 
        success: true, 
        message: "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.",
        verifyUrl: result.verifyUrl, // Cho dev
        verifyToken: result.verifyToken 
      });
    } catch (err) {
      next(err);
    }
  }

  static async verifyEmail(req, res, next) {
    try {
      const { token } = req.query;
      const result = await authService.verifyEmailToken(token);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, message: "Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ." });
    } catch (err) {
      next(err);
    }
  }

  static async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      const result = await authService.requestEmailVerification(email);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ 
        success: true, 
        message: "Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư của bạn.",
        verifyToken: result.verifyToken // Cho dev
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const result = await authService.loginUser(req.body ?? {}, req);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({
        success: true,
        token: result.token,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async google(req, res, next) {
    try {
      const result = await authService.loginWithGoogle(req.body ?? {}, req);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({
        success: true,
        token: result.token,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req, res, next) {
    try {
      const accessMeta = authService.parseOptionalBearerAccessMeta(req);
      const result = await authService.refreshAccessToken(req.body?.refreshToken, req, { accessMeta });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({
        success: true,
        token: result.token,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        user: result.user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async sessions(req, res, next) {
    try {
      const result = await authService.listAuthSessions(req.userId, {
        currentSessionId: req.query?.currentSessionId,
      });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({
        success: true,
        sessions: result.sessions,
        security: result.security,
      });
    } catch (err) {
      next(err);
    }
  }

  static async revokeSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const result = await authService.revokeAuthSession(req.userId, sessionId, {
        jti: req.tokenJti,
        exp: req.tokenExp,
      });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  static async me(req, res, next) {
    try {
      const result = await authService.getMeUser(req.userId);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, user: result.user });
    } catch (err) {
      next(err);
    }
  }

  static async patchMe(req, res, next) {
    try {
      const result = await authService.patchMeUser(req.userId, req.body ?? {}, req, {
        accessMeta: {
          sub: String(req.userId ?? ""),
          jti: req.tokenJti,
          exp: req.tokenExp,
        },
      });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      if (result.token) {
        return res.json({
          success: true,
          user: result.user,
          token: result.token,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        });
      }
      res.json({ success: true, user: result.user });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      const result = await authService.logoutUser(req.userId, {
        jti: req.tokenJti,
        exp: req.tokenExp,
      });
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  static async deleteMe(req, res, next) {
    try {
      const result = await authService.deleteMeUser(req.userId);
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true, message: "Đã xóa tài khoản." });
    } catch (err) {
      next(err);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const result = await authService.requestPasswordReset(req.body?.email, req);
      // Trả về success: true kèm message để người dùng biết mail đã được gửi.
      res.json({ 
        success: true, 
        message: "Nếu email tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi đi.",
        resetUrl: result?.resetUrl, // Cho dev
        resetToken: result?.resetToken // Cho dev
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const result = await authService.resetPasswordWithToken(req.body ?? {});
      if (!result.ok) {
        return res.status(result.status).json({ success: false, error: result.error });
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
}
