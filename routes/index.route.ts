import express from "express";
import authRoutes from "./auth.route";
import userRoutes from "./user.route";
import projectRoutes from "./project.route";
import taskRoutes from "./task.route";
import analyticsRoutes from "./analytics.route";
const router = express.Router();

router.use("/auth" , authRoutes );
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/analytics", analyticsRoutes);

export default router;