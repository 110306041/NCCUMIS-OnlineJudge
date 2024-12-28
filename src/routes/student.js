import express from "express";
import { authenticateToken } from "../middlewares/authMiddleware.js";
import { getCoursesByStudent } from "../controllers/student/courseController.js";
import { getAssignmentsAndExams } from "../controllers/student/assignmentController.js";
import { getAssignmentQuestions, getExamQuestions, getQuestionDetails } from "../controllers/student/questionController.js";
// import { createCourse } from '../controllers/teacher/courseController.js';
// import (createCourse)

const router = express.Router();

// Route that triggers the dynamic WebSocket operation
router.get("/courses", authenticateToken,getCoursesByStudent);
router.get("/assignments/questions/:assignmentsID", authenticateToken, getAssignmentQuestions);
router.get("/questions/:questionID", authenticateToken, getQuestionDetails);
router.get("/exams/questions/:examID", authenticateToken, getExamQuestions);
router.get("/assignmentsAndExams/:courseID",authenticateToken,getAssignmentsAndExams);


export default router;
