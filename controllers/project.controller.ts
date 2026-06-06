import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/pisma";
import { getLatestCommits } from "../services/github.service";

const createProjectSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  githubRepoUrl: z.string().url("Invalid URL").optional().or(z.literal("").transform(() => undefined)),
});

const updateProjectSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  githubRepoUrl: z.string().url("Invalid URL").optional().or(z.literal("").transform(() => undefined)),
});

const sendDiscordNotification = async (message: string) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL_PROJECT;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `**ProjectFlow Alert:**\n${message}` }),
    });
  } catch (error) {
    console.error(error);
  }
};

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parse = createProjectSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: parse.error.issues.map((e) => e.message).join(", "),
      });
    }

    const { title, description, githubRepoUrl } = parse.data;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        githubRepoUrl,
        creatorId: req.userId!,
      },
    });

    sendDiscordNotification(`New project **"${project.title}"** has been created!`);

    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string | undefined;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignee: {
              select: { name: true, department: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string | undefined;
    
    const parse = updateProjectSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: parse.error.issues.map((e) => e.message).join(", "),
      });
    }

    const { title, description, githubRepoUrl } = parse.data;

    const project = await prisma.project.update({
      where: { id },
      data: { title, description, githubRepoUrl },
    });

    sendDiscordNotification(`project **"${project.title}"** has been updated!`)

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string | undefined;

    await prisma.project.delete({
      where: { id },
    });

    sendDiscordNotification(`Project with ID **${id}** has been deleted.`);

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectCommits = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string | undefined;

    const project = await prisma.project.findUnique({
      where: { id },
      select: { githubRepoUrl: true },
    });

    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    if (!project.githubRepoUrl) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const commits = await getLatestCommits(project.githubRepoUrl, 5);

    res.status(200).json({
      success: true,
      data: commits,
    });
  } catch (error) {
    next(error);
  }
};