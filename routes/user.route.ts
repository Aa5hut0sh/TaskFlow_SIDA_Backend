import express from "express";
import { getMyTasks, getUsers } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = express.Router();


router.get("/", authenticate, getUsers);
router.get("/me/tasks", authenticate, getMyTasks);

export default router;