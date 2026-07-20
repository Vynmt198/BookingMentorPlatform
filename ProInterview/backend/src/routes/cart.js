import express from "express";
import { getCart, addToCart, updateCartItem, removeFromCart, clearCart, checkoutCart } from "../controllers/cartController.js";
import { authJwt } from "../middleware/authJwt.js";

export const cartRouter = express.Router();

// Tất cả các route giỏ hàng đều yêu cầu đăng nhập
cartRouter.use(authJwt);

cartRouter.get("/", getCart);
cartRouter.post("/add", addToCart);
cartRouter.post("/checkout", checkoutCart);
cartRouter.put("/:itemId", updateCartItem);
cartRouter.delete("/remove/:itemId", removeFromCart);
cartRouter.delete("/clear", clearCart);
