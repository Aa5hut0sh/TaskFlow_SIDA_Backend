import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/pisma";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../lib/amazonS3"; 

type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  projectId: z.string().uuid(),
  assigneeId: z.string().uuid(),
  dueDate: z
    .string()
    .datetime()
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

const updateTaskStatusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
});

const deleteAttachmentSchema = z.object({
  fileUrl: z.string().url(),
});

const sendDiscordNotification = async (message: string) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL_TASK;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `**TaskFlow Alert:**\n${message}` }),
    });
  } catch (error) {
    console.error(error);
  }
};

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parse = createTaskSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: parse.error.issues.map((e) => e.message).join(", "),
      });
    }

    const { title, description, projectId, assigneeId, dueDate } = parse.data;

    const task = await prisma.task.create({
      data: {
        title,
        description,
        projectId,
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        creatorId: req.userId!,
      },
      include: { assignee: true, project: true },
    });

    sendDiscordNotification(
      `New Task **"${task.title}"** assigned to ${task.assignee.name} in project **${task.project.title}**.`,
    );

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search as string;
    const status = req.query.status as TaskStatus;
    const department = req.query.department as string;

    const whereClause: any = {};

    if (req.role !== "ADMIN") {
      whereClause.assigneeId = req.userId;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) whereClause.status = status;
    if (department) whereClause.assignee = { department };

    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        include: {
          assignee: { select: { name: true, department: true } },
          project: { select: { title: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.task.count({ where: whereClause }),
    ]);

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as { id: string };

    const parse = updateTaskStatusSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: parse.error.issues.map((e) => e.message).join(", "),
      });
    }

    const { status } = parse.data;

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }
    
    const creatorId = existingTask.creatorId;

    if (req.role === "ADMIN" && creatorId !== req.userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    if (req.role !== "ADMIN" && existingTask.assigneeId !== req.userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const task = await prisma.task.update({
      where: { id },
      data: { status },
      include: { assignee: true },
    });

    if (status === "COMPLETED") {
      sendDiscordNotification(
        `Task **"${task.title}"** was completed by ${task.assignee.name}!`,
      );
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

export const attachS3Resource = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as { id: string };
    const file = req.file as Express.Multer.File & { location: string };

    if (!file || !file.location) {
      return res.status(400).json({ success: false, message: "Upload failed" });
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

        const creatorId = task.creatorId;

    if (req.role === "ADMIN" && creatorId !== req.userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    if (req.role !== "ADMIN" && task.assigneeId !== req.userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { attachments: { push: file.location } },
    });

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    next(error);
  }
};

export const removeS3Resource = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as { id: string };

    const parse = deleteAttachmentSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: parse.error.issues.map((e) => e.message).join(", "),
      });
    }

    const { fileUrl } = parse.data;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task)
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });

        const creatorId = task.creatorId;

    if (req.role === "ADMIN" && creatorId !== req.userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    if (req.role !== "ADMIN" && task.assigneeId !== req.userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const urlParts = fileUrl.split(".amazonaws.com/");
    if (urlParts.length === 2) {
      const key = urlParts[1];
      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME as string,
          Key: key,
        }),
      );
    }

    
    const updatedAttachments = task.attachments.filter(
      (url: string) => url !== fileUrl,
    );

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { attachments: updatedAttachments },
    });

    res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { id } = req.params as { id: string };
    if(req.role!=="ADMIN"){
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    };

    const existingTask = await prisma.task.findUnique({ where: { id } });
    if (!existingTask) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }
    const creatorId = existingTask.creatorId;

    if (req.role === "ADMIN" && creatorId !== req.userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    await prisma.task.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Task deleted" });
  } catch (error) {
    next(error);
  }
};
