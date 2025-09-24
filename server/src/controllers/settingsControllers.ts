import cloudinary from "../config/cloudinary";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { Response } from "express";
import { prisma } from "../server";
import fs from "fs";


export const addFeatureBanners = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            res.status(400).json({ message: "No files uploaded" });
            return;
        }

        const uploadeFiles = files.map(file => cloudinary.uploader.upload(file.path, {
            folder: "ecommerce-featureBanners"
        }));

        const uploadResults = await Promise.all(uploadeFiles);

        const banners = await Promise.all(uploadResults.map(res => prisma.featureBanner.create({
            data: {
                imageUrl: res.secure_url,
            }
        })));

        files.forEach(file => fs.unlinkSync(file.path));
        res.status(201).json({ message: "Feature banners added successfully", banners });

    } catch (error) {
        res.status(500).json({ message: "Failed to add feature banners" });
        console.error("Error adding feature banners:", error);
    }
}


export const getFeaturedBanner = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const fetchBanner = await prisma.featureBanner.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ message: "Featured banners fetched successfully", banners: fetchBanner });
    } catch (error) {
        res.status(500).json({ message: "Failed to get featured banner" });
        console.error("Error getting featured banner:", error);
    }
}

export const updateFeatureProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { productId } = req.body;

        if (!productId || !Array.isArray(productId) || productId.length > 8) {
            res.status(400).json({ success: false, message: "Invalid product IDs. Ensure it's an array with up to 8 items." });
            return;
        }


        await prisma.$transaction([
            prisma.product.updateMany({ data: { isFeatured: false } }),  //Sare ko phle false kiya 
            prisma.product.updateMany({   //fir selected prooductId ko true kr diye
                where: { id: { in: productId } },
                data: { isFeatured: true },
            }),
        ]);

        res.status(200).json({ success: true, message: "Feature products updated successfully" });

    } catch (error) {
        res.status(500).json({ message: "Failed to update feature products" });
        console.error("Error updating feature products:", error);
    }
}

export const getFetaureProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const featureProducts = await prisma.product.findMany({
            where: { isFeatured: true },
        });
        res.status(200).json({ success: true, message: "Feature products fetched successfully", products: featureProducts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to get feature products" });
        console.error("Error getting feature products:", error);
    }
}