import { Resend } from "resend";
import { env } from "./env";
import logger from "./logger";

export const resend = new Resend(env.RESEND_API_KEY);

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!env.RESEND_MAIL) {
    logger.warn("RESEND_MAIL not configured, skipping email send");
    return;
  }
  logger.debug({ to, subject }, "Sending email to");
  await resend.emails.send({
    from: env.RESEND_MAIL,
    to,
    subject,
    html,
  });
}
