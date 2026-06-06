import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/pisma";

export const getDashboardMetrics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId;
    const role = req.role;

    const taskFilter = role === "ADMIN" ? {} : { assigneeId: userId };

    const [totalProjects, totalTasks, completedTasks, pendingTasks] = await Promise.all([
      prisma.project.count(),
      prisma.task.count({ where: taskFilter }),
      prisma.task.count({ where: { ...taskFilter, status: "COMPLETED" } }),
      prisma.task.count({ where: { ...taskFilter, status: "PENDING" } })
    ]);

    const completionRate = totalTasks === 0 
      ? 0 
      : Math.round((completedTasks / totalTasks) * 100);

    res.status(200).json({
      success: true,
      data: {
        totalProjects,
        totalTasks,
        completedTasks,
        pendingTasks,
        completionRate
      }
    });
  } catch (error) {
    next(error);
  }
};