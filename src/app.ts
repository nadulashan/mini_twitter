import pool from "./db.js";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import authRoutes from "./routes/auth.routes.js";
import postsRoutes from "./routes/posts.routes.js";
import usersRoute from "./routes/users.routes.js";
import cors from "cors";
import constraintsRoutes from "./routes/dev/constraints.routes.js";
import errorHandler from "./middleware/errorHandler.js";
import notFound from "./middleware/notFound.js";
import { env } from "./config/env.js";

process
const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),
    secret: env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/users", usersRoute);

if ( env.NODE_ENV !== "production" && env.ENABLE_DEV_ROUTES ){
  app.use("/api/dev", constraintsRoutes)
  app.get("/test", async (req, res) => {
      throw new Error("Something went wrong");
  });
}

app.use(notFound)
app.use(errorHandler);

export default app;