

//create product

import cloudinary from "../config/cloudinary";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { prisma } from "../server";
import fs from "fs";
import { Response } from "express";

export const createProduct = async(req:AuthenticatedRequest, res:Response):Promise<void>=>{
    try {
        const {name, brand,  description, colors, sizes, gender, price, category, stock} = req.body;

        const files = req.files as Express.Multer.File[];
        if(!files || files.length === 0){
            res.status(400).json({success:false, error:"At least one image is required"});
            return;
        }

        //upload all images to cloudinary
        const uploadPromise = files.map(file=>cloudinary.uploader.upload(file.path, {
            folder:"ecommerce"
        }));
        const uploadResults = await Promise.all(uploadPromise);
        const imagesUrl = uploadResults.map(result=>result.secure_url);


        const newlyCreatedProduct = await prisma.product.create({
            data:{
                name,
                brand,
                category,
                description,
                gender,
                sizes: sizes.split(","),
                colors: colors.split(","),
                price: parseFloat(price),
                stock: parseInt(stock),
                soldCount:0,
                rating:0,
                images:imagesUrl,
            }
        });

        //after uploade image delete from local 
        files.forEach(file=>{
            const fs = require("fs");
            fs.unlinkSync(file.path);
        });

        res.status(201).json({success:true, newlyCreatedProduct});

    } catch (error) {
        console.error("Create product error:", error);
        res.status(500).json({success:false, error:"Server error"});
    }
}


export const fetchAllProductsForAdmin = async(req:AuthenticatedRequest, res:Response):Promise<void>=>{
    try {

        const products = await prisma.product.findMany();
        res.status(200).json({success:true, products});
        
    } catch (error) {
        console.error("Fetch all products error:", error);
        res.status(500).json({success:false, error:"Server error"});
    }
}


export const getProductById = async(req:AuthenticatedRequest, res:Response):Promise<void>=>{
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


export const updateProducts = async(req:AuthenticatedRequest, res:Response):Promise<void>=>{
    try {
        const { id } = req.params;
        const {name, brand,  description, colors, sizes, gender, price, category, stock, images, soldCount, rating} = req.body;

        const files = req.files as Express.Multer.File[] | undefined;
        let imagesUrl: string[] | undefined = undefined;
        if(files && files.length > 0){
            //upload all images to cloudinary
            const uploadPromise = files.map(file=>cloudinary.uploader.upload(file.path, {
                folder:"ecommerce"
            }));
            const uploadResults = await Promise.all(uploadPromise);
            imagesUrl = uploadResults.map(result=>result.secure_url);
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
        if(files && files.length > 0){
            files.forEach(file=>{
                const fs = require("fs");
                fs.unlinkSync(file.path);
            });
        }
        res.status(200).json({success:true, updatedProduct});

    } catch (error) {
        console.error("Update product error:", error);
        res.status(500).json({success:false, error:"Server error"});
    }
}

export const deleteProduct = async(req:AuthenticatedRequest, res:Response):Promise<void>=>{
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
        res.status(500).json({success:false, error:"Server error"});
    }
}