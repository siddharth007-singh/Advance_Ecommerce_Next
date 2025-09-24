

//create product

import cloudinary from "../config/cloudinary";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { prisma } from "../server";
import fs from "fs";
import { Response } from "express";

export const createProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { name, brand, description, colors, sizes, gender, price, category, stock } = req.body;

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            res.status(400).json({ success: false, error: "At least one image is required" });
            return;
        }

        //upload all images to cloudinary
        const uploadPromise = files.map(file => cloudinary.uploader.upload(file.path, {
            folder: "ecommerce"
        }));
        const uploadResults = await Promise.all(uploadPromise);
        const imagesUrl = uploadResults.map(result => result.secure_url);


        const newlyCreatedProduct = await prisma.product.create({
            data: {
                name,
                brand,
                category,
                description,
                gender,
                sizes: sizes.split(","),
                colors: colors.split(","),
                price: parseFloat(price),
                stock: parseInt(stock),
                soldCount: 0,
                rating: 0,
                images: imagesUrl,
            }
        });

        //after uploade image delete from local 
        files.forEach(file => {
            const fs = require("fs");
            fs.unlinkSync(file.path);
        });

        res.status(201).json({ success: true, newlyCreatedProduct });

    } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
}


export const fetchAllProductsForAdmin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {

        const products = await prisma.product.findMany();
        res.status(200).json({ success: true, products });

    } catch (error) {
        console.error("Fetch all products error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
}


export const getProductById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const product = await prisma.product.findUnique({
            where: { id },
        });
        if (!product) {
            res.status(404).json({ success: false, error: "Product not found" });
            return;
        }
        res.status(200).json({ success: true, product });
    } catch (error) {
        console.error("Get product by ID error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
}


export const updateProducts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, brand, description, colors, sizes, gender, price, category, stock, images, soldCount, rating } = req.body;

        const files = req.files as Express.Multer.File[] | undefined;
        let imagesUrl: string[] | undefined = undefined;
        if (files && files.length > 0) {
            //upload all images to cloudinary
            const uploadPromise = files.map(file => cloudinary.uploader.upload(file.path, {
                folder: "ecommerce"
            }));
            const uploadResults = await Promise.all(uploadPromise);
            imagesUrl = uploadResults.map(result => result.secure_url);
        }

        const productToUpdate = await prisma.product.findUnique({
            where: { id },
        });

        if (!productToUpdate) {
            res.status(404).json({ success: false, error: "Product not found" });
            return;
        }

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                name,
                brand,
                description,
                colors: colors.split(","),
                sizes: sizes.split(","),
                gender,
                price: parseFloat(price),
                category,
                stock: parseInt(stock),
                images: imagesUrl ? imagesUrl : productToUpdate.images,
                soldCount: parseInt(soldCount),
                rating: parseInt(rating),
            }
        });


        //after uploade image delete from local
        if (files && files.length > 0) {
            files.forEach(file => {
                const fs = require("fs");
                fs.unlinkSync(file.path);
            });
        }
        res.status(200).json({ success: true, updatedProduct });

    } catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
}

export const deleteProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const productToDelete = await prisma.product.findUnique({
            where: { id },
        });
        if (!productToDelete) {
            res.status(404).json({ success: false, error: "Product not found" });
            return;
        }
        await prisma.product.delete({
            where: { id },
        });
        res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
}

export const fetchClientFilterProduct = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const categories = ((req.query.categories as string) || "").split(",").filter(Boolean);
        const sizes = ((req.query.sizes as string) || "").split(",").filter(Boolean);
        const brands = ((req.query.brands as string) || "").split(",").filter(Boolean);
        const colors = ((req.query.colors as string) || "").split(",").filter(Boolean);
        const minPrice = parseFloat(req.query.minPrice as string) || 0;
        const maxPrice = parseFloat(req.query.maxPrice as string) || Number.MAX_SAFE_INTEGER;
        const sortBy = (req.query.sortBy as string) || "createdAt";
        const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

        const skip = (page - 1) * limit;

        // base where: price always applied
        const where: any = {
            price: { gte: minPrice, lte: maxPrice },
        };

        // Build OR conditions array (for categories OR brands)
        const orConditions: any[] = [];

        if (categories.length > 0) {
            // case-insensitive equals for each category
            orConditions.push(...categories.map(c => ({ category: { equals: c, mode: "insensitive" } })));
        }

        if (brands.length > 0) {
            // case-insensitive equals for each brand
            orConditions.push(...brands.map(b => ({ brand: { equals: b, mode: "insensitive" } })));
        }

        // If we have any OR conditions, combine them with other filters using AND
        // so price/colors/sizes are still applied.
        if (orConditions.length > 0) {
            where.AND = [{ OR: orConditions }];
        }

        // colors and sizes are array fields — keep hasSome (note: hasSome isn't case-insensitive)
        if (colors.length > 0) {
            where.colors = { hasSome: colors };
        }
        if (sizes.length > 0) {
            where.sizes = { hasSome: sizes };
        }

        console.log("Generated where:", JSON.stringify(where, null, 2));

        // fetch products + count
        const [products, totalProducts] = await Promise.all([
            prisma.product.findMany({
                where,
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            prisma.product.count({ where }),
        ]);

        // Send response (always successful 200 with products array even if empty)
        res.status(200).json({
            success: true,
            products,
            totalProducts,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
        });
    } catch (error) {
        console.error("Fetch client filter products error:", error);
        res.status(500).json({ success: false, error: "Server error" });
    }
};
