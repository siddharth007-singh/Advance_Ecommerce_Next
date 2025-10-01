import express from 'express';
import { createCoupon, fetchAllCoupons, deleteCoupon } from '../controllers/couponControllers';
import { authenticateJwt, isSuperAdmin } from '../middleware/authMiddleware';


const router = express.Router();

router.use(authenticateJwt)

router.post('/create-coupons', isSuperAdmin, createCoupon);
router.get('/fetch-all-coupons', fetchAllCoupons);
router.delete('/:id', isSuperAdmin, deleteCoupon);

export default router;