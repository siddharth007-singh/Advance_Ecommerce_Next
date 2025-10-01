import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { Response } from "express";
import { prisma } from "../server";

export const createAddress = async (req:AuthenticatedRequest, res:Response) => {
    try {
        const userId = req.user?.userId;
        const {name, address, city, country, postalCode, phone, isDefault} = req.body;

        if(!userId){
            return res.status(401).json({message: "Unauthorized"});
        }

        if(isDefault){
            //set all other addresses to isDefault false || baceause at once time only one address can be default
            await prisma.address.updateMany({
                where: {userId, isDefault: true},
                data: {isDefault: false}
            });
        }

        const newAddress = await prisma.address.create({
            data: {
                userId,
                name,
                address,
                city,
                country,
                postalCode,
                phone,
                isDefault: isDefault || false
            }
        });

        res.status(201).json({success:true, message: "Address created successfully", address: newAddress});


    } catch (error) {
        res.status(500).json({success:false, message: "Failed to create address", error});
    }
}

export const getAddresses = async (req:AuthenticatedRequest, res:Response) => {
    try {
         const userId = req.user?.userId;

        if(!userId){
            return res.status(401).json({success:false, message: "Unauthorized"});
        }

        const address = await prisma.address.findMany({
            where: {userId},
            orderBy: {createdAt: 'desc'}
        });

        res.status(200).json({success:true, address});
    } catch (error) {
        res.status(500).json({message: "Failed to get addresses", error});
    }
}

export const updateAddress = async (req:AuthenticatedRequest, res:Response) => {
    try {
        const userId = req.user?.userId;
        const {addressId} = req.params;

        if(!userId){
            return res.status(401).json({message: "Unauthorized"});
        }

        const existingAddress = await prisma.address.findUnique({
            where: {id: addressId}
        });

        if(!existingAddress || existingAddress.userId !== userId){
            return res.status(404).json({message: "Address not found"});
        }

        const {name, address, city, country, postalCode, phone, isDefault} = req.body;

        if(isDefault){
            //set all other addresses to isDefault false || baceause at once time only one address can be default
            await prisma.address.updateMany({
                where: {userId, isDefault: true},
                data: {isDefault: false}
            });
        }

        const updatedAddress = await prisma.address.update({
            where: {id: addressId},
            data: {
                name,
                address,
                city,
                country,
                postalCode,
                phone,
                isDefault: isDefault || false
            }
        });

        res.status(200).json({message: "Address updated successfully", address: updatedAddress});

    } catch (error) {
        res.status(500).json({message: "Failed to update address", error});
    }
}

export const deleteAddress = async (req:AuthenticatedRequest, res:Response) => {
    try {
        const userId = req.user?.userId;
        const {addressId} = req.params;

        if(!userId){
            return res.status(401).json({message: "Unauthorized"});
        }

        const existingAddress = await prisma.address.findUnique({
            where: {id: addressId}
        });

        if(!existingAddress || existingAddress.userId !== userId){
            return res.status(404).json({message: "Address not found"});
        }

        await prisma.address.delete({
            where: {id: addressId}
        });

        res.status(200).json({message: "Address deleted successfully"});
    } catch (error) {
        res.status(500).json({message: "Failed to delete address", error});
    }
}