import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { prisma } from "../server";
import { Response } from "express";

export const createCoupon = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const {code, discountPercentage, startDate, endDate, usageLimit} = req.body;

        const newCoupon = await prisma.coupon.create({
            data: {
                code,
                discountPercentage:parseInt(discountPercentage, 10),
                startDate: new Date(startDate), 
                endDate: new Date(endDate),
                usageLimit: parseInt(usageLimit, 10),
                usageCount: 0
            }
        });

        res.status(201).json({ success: true, message:"Coupon created successfully", coupon: newCoupon });

    } catch (error) {
        console.error("Create coupon error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }    
}


export const fetchAllCoupons = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const coupons = await prisma.coupon.findMany({
            orderBy: { createdAt: 'asc' }
        });
        res.status(200).json({ success: true, couponList: coupons });
    } catch (error) {
        console.error("Fetch all coupons error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
}


export const deleteCoupon = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.coupon.delete({
            where: { id }
        });
        res.status(200).json({ success: true, message: "Coupon deleted successfully", id });        
    } catch (error) {
        console.error("Delete coupon error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
}