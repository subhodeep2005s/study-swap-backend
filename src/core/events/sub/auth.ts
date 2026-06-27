import { eventEmitter, Event } from "@/config/event";
import logger from "@/config/logger";
import { sendMail } from "@/config/resend";

export function authSubscribers(): void {
  eventEmitter.on(Event.USER_REGISTERED, async (payload) => {
    logger.info({ userId: payload.userId, email: payload.email }, "User registered event received");

    try {
      await sendMail({
        to: payload.email,
        subject: "Verify your email",
        html: `<p>Your OTP is: <strong>${payload.otp}</strong></p><p>This OTP expires in 5 minutes.</p>`,
      });
      logger.info({ email: payload.email }, "Verification email sent");
    } catch (error) {
      logger.error(error, "Failed to send verification email");
    }
  });
}
