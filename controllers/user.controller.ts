import type { Request, Response, NextFunction } from "express";
import { prisma} from "../lib/pisma";

enum Department {
  FRONTEND,
  BACKEND,
  FULLSTACK,
  DEVOPS,
  QA,
  UI_UX,
}

export const getUsers  = async (req: Request, res: Response, next: NextFunction) => {
    try{
       const department = req.query.department as unknown as Department;
        const whereClause: any = {};
    
        if (department) {
        whereClause.department = department;
        }
        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                department: true,
            },
            orderBy:{
                name: "asc",
            }
        });

        res.status(200).json({
        success: true,
        data: users,
        });
        

    }catch(error){
        next(error);
    }
}


export const getMyTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    const tasks = await prisma.task.findMany({
      where: { assigneeId: userId },
      include: {
        project: { select: { title: true } }
      },
      orderBy: { dueDate: "asc" } 
    });

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};