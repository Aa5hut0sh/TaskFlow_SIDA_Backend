import type{ Request, Response, NextFunction } from "express";
import { prisma } from "../lib/pisma";

export const isOwner = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  const projectId = req.params.id as string | undefined;

  if (!projectId) {
    return res.status(400).json({ success: false, message: "Project ID is required" });
  }

  const project = await prisma.project.findUnique({ 
    where: { id: projectId },
    select: { creatorId: true }
  });


  if (!project) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }

  if (userId !== project.creatorId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Only the project creator can perform this action.",
    });
  }

  next();
};