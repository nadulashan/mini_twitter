import { Router } from "express";
import checkAuth from "../middleware/checkAuth.js";
import { createPost, deletePost, getAllPosts, getPostById } from "../controllers/posts.controllers.js";
import { checkCsrfToken } from "../middleware/checkCsrfToken.js";

const postsRoutes = Router();


postsRoutes.get("/", getAllPosts);
postsRoutes.post("/", checkAuth, checkCsrfToken, createPost )
postsRoutes.get("/:id", getPostById)
postsRoutes.delete("/:id", checkAuth, checkCsrfToken, deletePost)


export default postsRoutes;