import { Router } from "express";
import checkAuth from "../middleware/checkAuth.js";
import { createPost, deletePost, getAllPosts, getPostById } from "../controllers/posts.controllers.js";

const postsRoutes = Router();


postsRoutes.get("/", getAllPosts);
postsRoutes.post("/", checkAuth, createPost )
postsRoutes.get("/:id", getPostById)
postsRoutes.delete("/:id", checkAuth, deletePost)


export default postsRoutes;