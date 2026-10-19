import "dotenv/config";
import pool from "./db.js";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import authRoutes from "./routes/auth.routes.js";
import postsRoutes from "./routes/posts.routes.js";
import usersRoute from "./routes/users.routes.js";

const app = express();

// Middleware: parse incoming JSON request bodies
app.use(express.json());
const PgSession = connectPgSimple(session);

// Create sessions and maintain them
app.use(
  session({
    store: new PgSession({
      pool,
      createTableIfMissing: true,
    }),

    //
    secret: process.env.SECRET_KEY!,
    resave: false,
    saveUninitialized: false,

    //
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);




app.use("/api/auth", authRoutes)
app.use("/api/posts", postsRoutes);
app.use("/api/users", usersRoute)



export default app