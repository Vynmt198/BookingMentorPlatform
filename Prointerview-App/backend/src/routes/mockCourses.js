import { Router } from "express";
import { MockCoursesController } from "../controllers/mockCoursesController.js";

export const mockCoursesRouter = Router();

mockCoursesRouter.get("/courses", MockCoursesController.listCourses);
mockCoursesRouter.get("/courses/:id", MockCoursesController.getCourseById);
mockCoursesRouter.get("/courses/:id/lessons/:lessonId", MockCoursesController.getLessonContent);
mockCoursesRouter.post("/courses/:id/enroll", MockCoursesController.enrollCourse);

mockCoursesRouter.get("/enrollments/my", MockCoursesController.getMyEnrollments);
mockCoursesRouter.patch("/enrollments/:id/progress", MockCoursesController.updateProgress);
mockCoursesRouter.get("/enrollments/:id/certificate", MockCoursesController.getCertificate);
