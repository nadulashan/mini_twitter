import { Router } from "express";
import { getAllUsers } from "../controllers/users.controllers.js";

const usersRoute = Router();

usersRoute.get("/", getAllUsers)

export default usersRoute