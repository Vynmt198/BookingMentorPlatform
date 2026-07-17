import express from "express";
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart, checkoutCart } from "../controllers/cartController.js";
import { authJwt } from "../middleware/authJwt.js";

const router = express.Router();

// Tất cả các route giỏ hàng đều yêu cầu đăng nhập
router.use(authJwt);

router.get("/", getCart);
router.post("/add", addToCart);
router.post("/checkout", checkoutCart);
router.put("/:itemId", updateCartItem);
router.delete("/remove/:itemId", removeFromCart);
router.delete("/clear", clearCart);

export default router;
