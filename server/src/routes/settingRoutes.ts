import express from "express"
import { addFeatureBanners, getFeaturedBanner, updateFeatureProducts, getFetaureProducts } from "../controllers/settingsControllers";
import { authenticateJwt, isSuperAdmin } from "../middleware/authMiddleware";
import { upload } from "../middleware/uploadMiddleware";

const router = express.Router();

router.post("/banners", authenticateJwt, isSuperAdmin, upload.array("images", 5), addFeatureBanners);
router.get("/get-banners",authenticateJwt, getFeaturedBanner);
router.post("/update-feature-products", authenticateJwt, isSuperAdmin, updateFeatureProducts);
router.get("/fetch-feature-products", authenticateJwt, getFetaureProducts);

export default router;