import { PrismaClient } from "../generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = "admin@gmail.com"
    const password = "qwerty"
    const name = "Super Admin"


    const existingSuperAdmin = await prisma.user.findFirst({
        where: { role: "SUPER_ADMIN" },
    });

    if (existingSuperAdmin) {
        console.log("Super Admin already exists:", existingSuperAdmin.email);
        return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const superAdminUser = await prisma.user.create({
        data:{
            email,
            name,
            password: hashedPassword,
            role: 'SUPER_ADMIN'
        }
    })
    console.log("Super Admin user created:", superAdminUser.email);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(async()=>{
    await prisma.$disconnect()
})