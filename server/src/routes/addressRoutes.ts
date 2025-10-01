import express from "express";
import { createAddress, getAddresses,updateAddress, deleteAddress } from "../controllers/addressControllers";
import { authenticateJwt } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/add-address",authenticateJwt, createAddress);
router.get("/get-address", authenticateJwt, getAddresses);
router.delete("/delete-address/:id", authenticateJwt, deleteAddress);
router.put("/update-address/:id", authenticateJwt, updateAddress);

export default router; 