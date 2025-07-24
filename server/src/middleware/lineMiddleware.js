import crypto from "crypto";
import { logger } from "../utils/logger.js";

/**
 * Validate LINE webhook signature
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const validateLineSignature = (req, res, next) => {
  try {
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!channelSecret) {
      logger.error("LINE_CHANNEL_SECRET is not configured");
      return res.status(500).json({
        success: false,
        message: "Server configuration error",
      });
    }

    const signature = req.get("X-Line-Signature");

    if (!signature) {
      logger.error("Missing X-Line-Signature header");
      return res.status(401).json({
        success: false,
        message: "Missing signature",
      });
    }

    // Get raw body for signature validation
    const body = JSON.stringify(req.body);

    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac("SHA256", channelSecret)
      .update(body)
      .digest("base64");

    // Compare signatures
    if (signature !== `SHA256=${expectedSignature}`) {
      logger.error("Invalid LINE webhook signature");
      return res.status(401).json({
        success: false,
        message: "Invalid signature",
      });
    }

    logger.info("LINE webhook signature validated successfully");
    next();
  } catch (error) {
    logger.error("Error validating LINE signature:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Parse LINE webhook events
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const parseLineEvents = (req, res, next) => {
  try {
    const { events, destination } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook format",
      });
    }

    // Add parsed data to request
    req.lineEvents = events;
    req.lineDestination = destination;

    logger.info(`Received ${events.length} LINE events`);
    next();
  } catch (error) {
    logger.error("Error parsing LINE events:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Rate limiting for LINE webhooks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const lineWebhookRateLimit = (req, res, next) => {
  // Simple rate limiting - can be enhanced with Redis for production
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  const maxRequests = 100; // Max requests per window

  if (!global.lineWebhookRequests) {
    global.lineWebhookRequests = [];
  }

  // Remove old requests outside the window
  global.lineWebhookRequests = global.lineWebhookRequests.filter(
    (time) => now - time < windowMs
  );

  // Check if limit exceeded
  if (global.lineWebhookRequests.length >= maxRequests) {
    logger.warn("LINE webhook rate limit exceeded");
    return res.status(429).json({
      success: false,
      message: "Rate limit exceeded",
    });
  }

  // Add current request
  global.lineWebhookRequests.push(now);
  next();
};
