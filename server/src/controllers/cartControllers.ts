import { AuthenticatedRequest } from "../middleware/authMiddleware";
import { Response } from "express";
import { prisma } from "../server";
import { update } from "lodash";


export const addToCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;

        const { productId, quantity, size, color } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        // //Phle cart ko bnaya agr nhi h to
        // //Phir cart item ko bnaya agr nhi h to
        // //agr h to quantity ko increment krdia
        // const cart = await prisma.cart.upsert({
        //     where: { userId },
        //     create: { userId },
        //     update: {}
        // })

        // const cartItem = await prisma.cartItem.upsert({
        //     where: {
        //         cartId_productId_size_color: {
        //             cartId: cart.id,
        //             productId,
        //             size: size || null,
        //             color: color || null
        //         }
        //     },
        //     update: {
        //         quantity: { increment: quantity }
        //     },
        //     create: {
        //         cartId: cart.id,
        //         productId,
        //         quantity,
        //         size: size || null,
        //         color: color || null
        //     }
        // })


        // const product = await prisma.product.findUnique({
        //     where: { id: productId },
        //     select: { name: true, price: true, images: true }
        // })


        ////////////////////////////using Prisma Transaction////////////////////////////

        const result = await prisma.$transaction(async (tx) => {

            //Sabse phle cart ko bnaya agr nhi h to
            const cart = await tx.cart.upsert({
                where: { userId },
                create: { userId },
                update: {}
            })


            //Phir cart item ko bnaya agr nhi h to
            const cartItem = await tx.cartItem.upsert({
                where: {
                    cartId_productId_size_color: {
                        cartId: cart.id,
                        productId,
                        size: size || null,
                        color: color || null
                    }
                },

                update: {
                    quantity: { increment: quantity }
                },

                create: {
                    cartId: cart.id,
                    productId,
                    quantity,
                    size: size || null,
                    color: color || null
                },
            })


            //Last me product ko fetch kiya cart item k sath response me bhejne k liye
            const product = await tx.product.findUnique({
                where: { id: productId },
                select: { name: true, price: true, images: true }
            })


            return { cartItem, product };
        });

        const { cartItem, product } = result;

        const responseItem = {
            id: cartItem.id,
            productId: cartItem.productId,
            name: product?.name,
            price: product?.price,
            image: product?.images[0],
            color: cartItem.color,
            size: cartItem.size,
            quantity: cartItem.quantity,
        }


        res.status(200).json({ success: true, message: "Product added to cart", data: responseItem });

    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const getCartItem = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: true }
        })

        if (!cart) {
            res.json({
                success: false,
                messaage: "No Item found in cart",
                data: [],
            });

            return;
        }


        const cartItemsWithProducts = await Promise.all(
            cart?.items.map(async (item) => {
                const product = await prisma.product.findUnique({
                    where: { id: item.productId },
                    select: {
                        name: true,
                        price: true,
                        images: true,
                    },
                });


                return {
                    id: item.id,
                    productId: item.productId,
                    name: product?.name,
                    price: product?.price,
                    image: product?.images[0],
                    color: item.color,
                    size: item.size,
                    quantity: item.quantity,

                }
            })
        )

        res.json({ success: true, data: cartItemsWithProducts })

    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to get cart items" });
    }
}


export const removeFromCart = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        await prisma.cartItem.delete({
            where: {
                id,
                cart: { userId },
            },
        });

        res.status(200).json({
            success: true,
            message: "Item is removed from cart",
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to remove item from cart" });
    }
}


export const updateCartItemQuantity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { id } = req.params;
        const { quantity } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: "Unauthorized" });
            return;
        }

        const result = await prisma.$transaction(async (tx) => {
            // ✅ Step 1: Ensure the item belongs to this user
            const cartItem = await tx.cartItem.findFirst({
                where: {
                    id,
                    cart: { userId }
                }
            });

            if (!cartItem) {
                throw new Error("Cart item not found or not authorized");
            }

            // ✅ Step 2: Update the item
            const updatedItem = await tx.cartItem.update({
                where: { id },
                data: { quantity },
            });

            const product = await tx.product.findUnique({
                where: { id: updatedItem.productId },
                select: { name: true, price: true, images: true },
            });

            return { updatedItem, product };
        });

        const { updatedItem, product } = result;

        const responseItem = {
            id: updatedItem.id,
            productId: updatedItem.productId,
            name: product?.name,
            price: product?.price,
            image: product?.images[0],
            color: updatedItem.color,
            size: updatedItem.size,
            quantity: updatedItem.quantity,
        };

        res.json({
            success: true,
            data: responseItem,
        });

    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to update cart item quantity" });
    }
}

export const clearEntireCart = async (
    req: AuthenticatedRequest,
    res: Response
): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            res.status(401).json({
                success: false,
                message: "Unauthenticated user",
            });

            return;
        }

        await prisma.cartItem.deleteMany({
            where: {
                cart: { userId },
            },
        });

        res.status(200).json({
            success: true,
            message: "cart cleared successfully!",
        });
    } catch (e) {
        res.status(500).json({
            success: false,
            message: "Failed to clear cart!",
        });
    }
};