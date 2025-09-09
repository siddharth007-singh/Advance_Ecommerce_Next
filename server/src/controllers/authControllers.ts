import { Request, Response } from "express";
import { prisma } from "../server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

function generateToken(userId: string, email: string, role: string) {
    const accessToken = jwt.sign({ userId, email, role }, process.env.JWT_SECRET!, { expiresIn: "15m" });
    const refreshToken = uuidv4();
    return { accessToken, refreshToken };
}

async function setToken(res: Response, accessToken: string, refreshToken: string) {
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60,
    });
}


export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({
                success: false,
                error: "User with this email exists!",
            });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role: "USER" },
        });

        res.status(201).json({
            success: true,
            message: "User registered successfully",
            userId: user.id,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Registration failed" });
    }
}

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const extractCurrentUser = await prisma.user.findUnique({ where: { email } });
        if (
            !extractCurrentUser ||
            !(await bcrypt.compare(password, extractCurrentUser.password))
        ) {
            res.status(401).json({
                success: false,
                error: "Invalied credentials",
            });

            return;
        }

        //create access token
        const { accessToken, refreshToken } = generateToken(
            extractCurrentUser.id,
            extractCurrentUser.email,
            extractCurrentUser.role
        );

        // set token in cookie
        await setToken(res, accessToken, refreshToken);

        res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: extractCurrentUser.id,
                name: extractCurrentUser.name,
                email: extractCurrentUser.email,
                role: extractCurrentUser.role,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Login failed" });
    }
}

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        res.status(401).json({ success: false, error: "No refresh token provided" });
        return;
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                refreshToken: refreshToken,
            },
        });

        if (!user) {
            res.status(401).json({ success: false, error: "User not found", });
            return;
        }

        const { accessToken, refreshToken: newRefreshToken } = generateToken(
            user.id,
            user.email,
            user.role
        );

        await setToken(res, accessToken, newRefreshToken);
        res.status(200).json({ success: true, message: "Access token refreshed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Refresh token error" });
    }
}

export const logout = async (req: Request, res: Response): Promise<void> => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.status(200).json({ success: true, message: "Logged out successfully" });
}