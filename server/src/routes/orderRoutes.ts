import express from "express";  
import {createOrder, getOrder, updateOrders, getAllOrdersForAdmin, getOrdersByUserId, createPaypalOrder, capturePayPalOrder} from "../controllers/orderController";
import { authenticateJwt, isSuperAdmin } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authenticateJwt);

router.post("/create-paypal-order", createPaypalOrder);
router.post("/capture-paypal-order", capturePayPalOrder);
router.post("/create-final-order", createOrder);
router.get("/get-single-order/:orderId", getOrder);
router.get("/get-order-by-user-id", getOrdersByUserId);
router.get("/get-all-orders-for-admin", isSuperAdmin, getAllOrdersForAdmin);
router.put("/:orderId/status", isSuperAdmin, updateOrders);

export default router;  