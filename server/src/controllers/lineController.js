import { logger } from "../utils/logger.js";

// @desc    Handle LINE webhook events
// @route   POST /api/line/webhook
// @access  Public (but validated by LINE signature)
export const handleLineWebhook = async (req, res) => {
  try {
    const events = req.body.events;

    if (!events || events.length === 0) {
      return res.status(200).json({ success: true });
    }

    // Process each event
    for (const event of events) {
      await processLineEvent(event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error("LINE webhook error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// @desc    Verify LINE webhook
// @route   GET /api/line/webhook/verify
// @access  Public
export const verifyWebhook = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "LINE webhook endpoint is active",
    });
  } catch (error) {
    logger.error("LINE webhook verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Process individual LINE events
async function processLineEvent(event) {
  try {
    const { type, source, message, replyToken } = event;

    logger.info("Processing LINE event:", { type, source: source?.type });

    switch (type) {
      case "message":
        await handleMessage(message, replyToken, source);
        break;

      case "follow":
        await handleFollow(source, replyToken);
        break;

      case "unfollow":
        await handleUnfollow(source);
        break;

      case "join":
        await handleJoin(source, replyToken);
        break;

      case "leave":
        await handleLeave(source);
        break;

      default:
        logger.info("Unhandled event type:", type);
    }
  } catch (error) {
    logger.error("Error processing LINE event:", error);
  }
}

// Handle message events
async function handleMessage(message, replyToken, source) {
  try {
    if (message.type !== "text") {
      return;
    }

    const text = message.text.toLowerCase().trim();

    // Simple command handling
    switch (text) {
      case "help":
      case "ช่วยเหลือ":
        await replyMessage(
          replyToken,
          "สวัสดี! นี่คือแอป LINE Shared Expense Tracker\n\nคำสั่งที่ใช้ได้:\n- help: แสดงความช่วยเหลือ\n- groups: ดูกลุ่มของคุณ\n- expenses: ดูรายจ่ายล่าสุด\n- debts: ดูหนี้สิน"
        );
        break;

      case "groups":
      case "กลุ่ม":
        await replyMessage(
          replyToken,
          "กรุณาใช้แอป LIFF เพื่อดูและจัดการกลุ่มของคุณ"
        );
        break;

      case "expenses":
      case "รายจ่าย":
        await replyMessage(
          replyToken,
          "กรุณาใช้แอป LIFF เพื่อดูและเพิ่มรายจ่าย"
        );
        break;

      case "debts":
      case "หนี้":
        await replyMessage(
          replyToken,
          "กรุณาใช้แอป LIFF เพื่อดูและจัดการหนี้สิน"
        );
        break;

      default:
        await replyMessage(
          replyToken,
          'ขออภัย ไม่เข้าใจคำสั่งนี้ พิมพ์ "help" เพื่อดูคำสั่งที่ใช้ได้'
        );
    }
  } catch (error) {
    logger.error("Error handling message:", error);
  }
}

// Handle follow events
async function handleFollow(source, replyToken) {
  try {
    const welcomeMessage =
      'ยินดีต้อนรับสู่ LINE Shared Expense Tracker! 🎉\n\nแอปนี้จะช่วยให้คุณติดตามและแบ่งปันค่าใช้จ่ายกับเพื่อนๆ ได้อย่างง่ายดาย\n\nพิมพ์ "help" เพื่อดูคำสั่งที่ใช้ได้';

    await replyMessage(replyToken, welcomeMessage);

    logger.info("User followed bot:", source.userId);
  } catch (error) {
    logger.error("Error handling follow:", error);
  }
}

// Handle unfollow events
async function handleUnfollow(source) {
  try {
    logger.info("User unfollowed bot:", source.userId);
    // Optionally handle cleanup or analytics
  } catch (error) {
    logger.error("Error handling unfollow:", error);
  }
}

// Handle join events (when bot joins a group)
async function handleJoin(source, replyToken) {
  try {
    const joinMessage =
      'สวัสดี! ขอบคุณที่เพิ่มผมเข้ากลุ่ม 🤖\n\nผมจะช่วยให้การติดตามค่าใช้จ่ายในกลุ่มนี้ง่ายขึ้น\n\nพิมพ์ "help" เพื่อดูคำสั่งที่ใช้ได้';

    await replyMessage(replyToken, joinMessage);

    logger.info("Bot joined group:", source.groupId);
  } catch (error) {
    logger.error("Error handling join:", error);
  }
}

// Handle leave events (when bot leaves a group)
async function handleLeave(source) {
  try {
    logger.info("Bot left group:", source.groupId);
    // Optionally handle cleanup
  } catch (error) {
    logger.error("Error handling leave:", error);
  }
}

// Reply to LINE messages
async function replyMessage(replyToken, text) {
  try {
    // This would normally use the LINE Bot SDK to send replies
    // For now, just log the message
    logger.info("Would reply to LINE:", { replyToken, text });

    // TODO: Implement actual LINE Bot SDK reply
    // const client = new line.Client({ channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN });
    // await client.replyMessage(replyToken, { type: 'text', text });
  } catch (error) {
    logger.error("Error replying to LINE:", error);
  }
}
