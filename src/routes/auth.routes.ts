import { Router } from "express";
import checkAuth from "../middleware/checkAuth.js";
import loginIpLimiter from "../middleware/loginRateLimit.js";
import { getCurrentUser, login, logout, register } from "../controllers/auth.controllers.js";
import { getCsrfToken } from "../controllers/csrf.controllers.js";
import { checkCsrfToken } from "../middleware/checkCsrfToken.js";



const authRoutes = Router();

authRoutes.post( "/register", register)
authRoutes.post( "/login", loginIpLimiter, checkCsrfToken, login)
authRoutes.get("/me", checkAuth, getCurrentUser)
authRoutes.get("/csrf", getCsrfToken)
authRoutes.post("/logout", logout)

export default authRoutes;