import express from 'express';
import { createCoupon, fetchAllCoupons, deleteCoupon } from '../controllers/couponControllers';
import { authenticateJwt, isSuperAdmin } from '../middleware/authMiddleware';


const router = express.Router();

router.use(authenticateJwt, isSuperAdmin)

router.post('/create-coupons', createCoupon);
router.get('/fetch-all-coupons', fetchAllCoupons);
router.delete('/:id', deleteCoupon);

export default router;