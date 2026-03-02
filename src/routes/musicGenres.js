import express from "express";
import { getMusicGenres } from "../controllers/musicGenresController.js";

const router = express.Router();

router.get("/", getMusicGenres);

export default router;