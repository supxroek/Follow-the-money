import express from "express";
import { validateLineSignature } from "../middleware/lineMiddleware.js";
import {
  handleLineWebhook,
  verifyWebhook,
} from "../controllers/lineController.js";

const router = express.Router();

// LINE webhook verification
router.get("/verify", verifyWebhook);

// LINE webhook endpoint
router.post("/", validateLineSignature, handleLineWebhook);

export default router;
