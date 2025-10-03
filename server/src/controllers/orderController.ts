import axios from "axios";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { NextFunction, Response } from "express";
import { v4 as uuidv4 } from 'uuid';
import { prisma } from "../server";



const PAYPAL_CLIENT_ID = "AfuPjh9ur9K8K-EWC2iIZZyWMlKJveEpBRhgwAN0EPX9vOee2_fTnh0_CKEF6p9yvU5YW2XHSaI7WohR";
const PAYPAL_CLIENT_SECRET = "EF2tpwO-Rkx29_7_lbMKiYNVwpl1VuD73KCpd5oI6uoVyMak8AxfBP7JRKkN-kNhP258YFOtCeJYCqww";


async function getPaypalAccessToken() {
    const res = await axios.post('https://api-m.sandbox.paypal.com/v1/oauth2/token', "grant_type=client_credentials", {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
        },
    });

    return res.data.access_token;
}

export const createPaypalOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { items, total } = req.body;
        const accessToken = await getPaypalAccessToken();

        const paypalItems = items.map((item: any) => ({
            name: item.name,
            description: item.description || "",
            sku: item.id,
            quantity: item.quantity.toString(),
            category: "PHYSICAL_GOODS",
            unit_amount: {
                currency_code: "USD",
                value: item.price.toFixed(2),
            },
        }));

        const itemTotal = paypalItems.reduce(
            (sum: any, item: any) =>
                sum + parseFloat(item.unit_amount.value) * parseInt(item.quantity),
            0
        );

        const response = await axios.post('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
            intent: "CAPTURE",
            purchase_units: [
                {
                    amount: {
                        currency_code: "USD",
                        value: total.toFixed(2),
                        breakdown: {
                            item_total: {
                                currency_code: "USD",
                                value: itemTotal.toFixed(2),
                            },
                        },
                    },
                    items: paypalItems,
                },
            ]
        },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                    "PayPal-Request-ID": uuidv4(),
                }
            }
        );

        res.status(200).json(response.data);

    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });

    }
}

export const capturePayPalOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { orderId } = req.body;
        console.log("👉 orderID mila:", orderId);
        const accessToken = await getPaypalAccessToken();
        console.log("👉 accessToken mila:", accessToken ? "YES" : "NO");

        const response = await axios.post(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {}, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        });
        console.log("👉 PayPal Response:", response.data);

        res.status(200).json(response.data);
    } catch (error: any) {
        console.error("PayPal Capture Error:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: "Unexpected error occured!", paypalError: error.response?.data || error.message, });

    }
}

export const createOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { items, addressId, couponId, paymentId, total } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        // Create order using Prisma Transaction
        const order = await prisma.$transaction(async (prisma) => {
            //create new order
            const newOrder = await prisma.order.create({
                data: {
                    userId,
                    addressId,
                    couponId,
                    total,
                    paymentMethod: "CREDIT_CARD",
                    paymentStatus: "COMPLETED",
                    paymentId,
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            productName: item.productName,
                            productcategory: item.productCategory || item.product?.category || "Unknown",
                            quantity: item.quantity,
                            size: item.size,
                            color: item.color,
                            price: item.price,
                        })),
                    },
                },
                include: {
                    items: true,
                },
            });

            for (const item of items) {
                await prisma.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: { decrement: item.quantity },
                        soldCount: { increment: item.quantity },
                    },
                });
            }

            await prisma.cartItem.deleteMany({
                where: {
                    cart: { userId },
                },
            });

            await prisma.cart.delete({
                where: { userId },
            });

            if (couponId) {
                await prisma.coupon.update({
                    where: { id: couponId },
                    data: { usageCount: { increment: 1 } },
                });
            }

            return newOrder;
        });

        res.status(201).json({ success: true, order });

    } catch (error:any) {
        console.error("❌ Order creation failed:", error);
        res.status(500).json({ success: false, message: "Internal server error",error: error.message, stack: error.stack});

    }
}

export const getOrder = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { orderId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const order = await prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
            },
            include: {
                items: true,
                address: true,
                coupon: true,
            },
        });

        res.status(200).json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });

    }
}

export const updateOrders = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        await prisma.order.update({
            where: { id: orderId },
            data: { status },
        });

        res.status(200).json({ success: true, message: "Order updated successfully" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });

    }
}

export const getAllOrdersForAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const orders = await prisma.order.findMany({
            include: {
                items: true,
                address: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        res.status(200).json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });

    }
}

export const getOrdersByUserId = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const orders = await prisma.order.findMany({
            where: { userId },
            include: {
                items: true,
                address: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        res.status(200).json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });

    }
}