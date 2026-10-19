import { Router } from "express";
import checkAuth from "../middleware/checkAuth.js";
import loginIpLimiter from "../middleware/loginRateLimit.js";
import { getCurrentUser, login, logout, register } from "../controllers/auth.controllers.js";



const authRoutes = Router();

authRoutes.post( "/register", register)
authRoutes.post( "/login", loginIpLimiter, login)
authRoutes.get("/me", checkAuth, getCurrentUser)
authRoutes.post("/logout", logout)

export default authRoutes;