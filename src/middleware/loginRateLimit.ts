import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again later.",
  },
  skip: () => env.NODE_ENV === "test"
});

export default loginIpLimiter;