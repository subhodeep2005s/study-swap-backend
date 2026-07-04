import { Router } from "express";
import { ConversationController } from "./conversation.controller";
import { MessageController } from "./message.controller";
import { CallController } from "./call.controller";
import { FocusController } from "./focus.controller";
import { authMiddleware } from "@/core/middleware/auth.middleware";
import { validate } from "@/core/middleware/validate.middleware";
import { rateLimitMiddleware } from "@/core/middleware/rate-limit.middleware";
import { 
  sendMessageSchema, 
  updateMessageSchema, 
  startCallSchema, 
  startFocusSchema 
} from "./communication.schema";
import "./communication.openapi";

const router = Router();

// All communication endpoints require auth
router.use(authMiddleware);

// Conversations
router.get("/conversations", ConversationController.getConversationsList);
router.get("/conversations/:conversationId", ConversationController.getConversation);

// Messages (Nested under conversation)
router.get("/conversations/:conversationId/messages", MessageController.getMessages);
router.post("/conversations/:conversationId/messages", validate(sendMessageSchema), rateLimitMiddleware(10, 1, 'messages'), MessageController.sendMessage);
router.patch("/conversations/:conversationId/read", MessageController.markRead);
router.get("/conversations/:conversationId/attachments", MessageController.getAttachments);

// Edit/Delete Messages (Direct via messageId)
router.patch("/messages/:messageId", validate(updateMessageSchema), MessageController.editMessage);
router.delete("/messages/:messageId", MessageController.deleteMessage);

// Calls
router.get("/conversations/:conversationId/calls", CallController.getCallHistory);
router.post("/calls", validate(startCallSchema), rateLimitMiddleware(5, 60, 'calls'), CallController.startCall);
router.patch("/calls/:callId/accept", CallController.acceptCall);
router.patch("/calls/:callId/reject", CallController.endCall); // Same logic as endCall for now
router.patch("/calls/:callId/end", CallController.endCall);

// Focus
router.get("/conversations/:conversationId/focus", FocusController.getFocusHistory);
router.post("/focus", validate(startFocusSchema), rateLimitMiddleware(5, 60, 'focus'), FocusController.startFocus);
router.patch("/focus/:focusId/accept", FocusController.acceptFocus);
router.patch("/focus/:focusId/reject", FocusController.endFocus); // Same logic as endFocus
router.patch("/focus/:focusId/end", FocusController.endFocus);

export default router;
