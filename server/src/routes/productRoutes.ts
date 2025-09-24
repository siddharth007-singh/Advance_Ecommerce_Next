import express from 'express';
import { createProduct, deleteProduct, fetchAllProductsForAdmin, fetchClientFilterProduct, getProductById, updateProducts } from '../controllers/productControllers';
import { authenticateJwt, isSuperAdmin } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = express.Router();

router.post('/create-new-product', authenticateJwt, isSuperAdmin, upload.array('images', 5), createProduct);
router.get('/fetch-admin-products', fetchAllProductsForAdmin);
router.get("/fetch-client-products", fetchClientFilterProduct);
router.delete('/:id', authenticateJwt, isSuperAdmin, deleteProduct);
router.get('/:id', getProductById);
router.put('/:id', authenticateJwt, isSuperAdmin, upload.array('images', 5), updateProducts);


export default router;