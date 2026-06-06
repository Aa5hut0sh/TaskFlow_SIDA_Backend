import express from "express";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectCommits
} from "../controllers/project.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { isAdmin } from "../middlewares/isAdmin.middleware";
import { isOwner } from "../middlewares/isOwner.middleware";

const router = express.Router();

router.post("/", authenticate, isAdmin, createProject);
router.get("/", authenticate, getProjects);
router.get("/:id", authenticate, getProjectById);
router.put("/:id", authenticate, isOwner, updateProject);
router.delete("/:id", authenticate, isOwner, deleteProject);
router.get("/:id/commits", authenticate, getProjectCommits);

export default router;