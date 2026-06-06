import express from "express";
import { 
  createTask, 
  getTasks, 
  updateTaskStatus, 
  attachS3Resource, 
  removeS3Resource,
  deleteTask, 
} from "../controllers/task.controller";
import { authenticate} from "../middlewares/auth.middleware";
import { isAdmin } from "../middlewares/isAdmin.middleware";
import { uploadToS3 } from "../services/S3-upload.service";

const router = express.Router();

router.get("/", authenticate, getTasks);
router.post("/", authenticate, isAdmin, createTask);
router.patch("/:id/status", authenticate, updateTaskStatus);
router.patch("/:id/upload", authenticate, uploadToS3.single("file"), attachS3Resource);
router.delete("/:id/upload", authenticate, removeS3Resource);
router.delete("/:id", authenticate, isAdmin, deleteTask);

export default router;