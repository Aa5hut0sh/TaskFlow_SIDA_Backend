import express from "express";
import { registerUser, loginUser, registerAdmin, getProfile, logoutUser } from "../controllers/auth.controller";
import {authenticate} from "../middlewares/auth.middleware";
const router = express.Router();

router.post("/register" , registerUser);
router.post("/login" , loginUser);

router.post("/register/admin" , registerAdmin);

router.get("/profile" , authenticate, getProfile);
router.post("/logout" , authenticate, logoutUser);

export default router;