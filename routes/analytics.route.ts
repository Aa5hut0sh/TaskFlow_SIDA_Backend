import express from "express";
import { getDashboardMetrics } from "../controllers/analytics.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/", authenticate, getDashboardMetrics);

export default router;