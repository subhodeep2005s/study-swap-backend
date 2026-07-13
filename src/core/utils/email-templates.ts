/**
 * StudySwap Email Templates
 *
 * Premium dark-themed email templates matching the StudySwap app aesthetic.
 * Theme: Dark (#0A0A0F) background, blue accent (#1E90FF), clean typography.
 */

const STUDYSWAP_LOGO_URL = "https://iili.io/C7smyzX.jpg";
const APP_HOME_URL = "studyswap://home";
const APP_MATCHES_URL = "studyswap://matches";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(value: string | Date) {
  const date = new Date(value);

  return {
    date: date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }),
  };
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" align="center">
    <tr>
      <td style="background:linear-gradient(135deg,#1E90FF 0%,#1565C0 100%);border-radius:24px;text-align:center;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 36px;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.5px;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

function darkEmailLayout({
  title,
  preheader,
  eyebrow,
  heading,
  body,
  footerNote,
}: {
  title: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  body: string;
  footerNote?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    :root { color-scheme: dark; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #050507; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; padding: 16px !important; }
      .inner-card { padding: 28px 20px !important; }
      .logo-img { width: 140px !important; height: 140px !important; }
      .profile-img { width: 52px !important; height: 52px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#050507;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#050507;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#050507;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" class="email-container" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img
                src="${STUDYSWAP_LOGO_URL}"
                alt="StudySwap"
                class="logo-img"
                width="160"
                height="160"
                style="display:block;width:160px;height:160px;object-fit:contain;border-radius:20px;"
              />
            </td>
          </tr>

          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(145deg,#0F0F18 0%,#0A0A12 100%);border:1px solid rgba(30,144,255,0.15);border-radius:20px;overflow:hidden;">
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,transparent 0%,#1E90FF 30%,#4DA8FF 50%,#1E90FF 70%,transparent 100%);"></td>
                </tr>
                <tr>
                  <td class="inner-card" style="padding:40px 36px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size:13px;font-weight:600;color:#1E90FF;text-transform:uppercase;letter-spacing:2.5px;padding-bottom:8px;text-align:center;">
                          ${escapeHtml(eyebrow)}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:24px;font-weight:700;color:#FFFFFF;line-height:1.3;padding-bottom:16px;text-align:center;">
                          ${heading}
                        </td>
                      </tr>
                    </table>
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-top:28px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:13px;color:#4A4A5E;line-height:1.6;padding-bottom:4px;">
                    Study Together, Grow Together
                  </td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#3A3A4E;line-height:1.6;">
                    &copy; ${new Date().getFullYear()} StudySwap &bull; All rights reserved
                  </td>
                </tr>
                ${
                  footerNote
                    ? `<tr><td style="font-size:11px;color:#2A2A3E;line-height:1.6;padding-top:12px;">${escapeHtml(
                        footerNote,
                      )}</td></tr>`
                    : ""
                }
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function otpEmailTemplate(otp: string): string {
  // Split OTP into individual digits for the digit-box UI
  const otpDigits = otp
    .split("")
    .map(
      (digit) =>
        `<td style="width:48px;height:56px;background-color:#12121A;border:2px solid #1E90FF;border-radius:12px;text-align:center;vertical-align:middle;font-family:'SF Mono','Fira Code','Courier New',monospace;font-size:28px;font-weight:700;color:#FFFFFF;letter-spacing:0;line-height:56px;">${digit}</td>`,
    )
    .join(`<td style="width:8px"></td>`);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Your StudySwap Login Code</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      color-scheme: dark;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: #050507;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 16px !important;
      }
      .inner-card {
        padding: 28px 20px !important;
      }
      .otp-digit {
        width: 40px !important;
        height: 48px !important;
        font-size: 22px !important;
        line-height: 48px !important;
      }
      .copy-btn {
        width: 100% !important;
      }
      .logo-img {
        width: 140px !important;
        height: 140px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#050507;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <!-- Preheader text (hidden but shows in email preview) -->
  <div style="display:none;font-size:1px;color:#050507;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Your StudySwap verification code is ${otp}. It expires in 5 minutes.
  </div>

  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#050507;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Main container -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="520" class="email-container" style="max-width:520px;width:100%;">

          <!-- Logo & Brand Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img
                src="https://iili.io/C7smyzX.jpg"
                alt="StudySwap"
                class="logo-img"
                width="160"
                height="160"
                style="display:block;width:160px;height:160px;object-fit:contain;border-radius:20px;"
              />
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(145deg,#0F0F18 0%,#0A0A12 100%);border:1px solid rgba(30,144,255,0.15);border-radius:20px;overflow:hidden;">

                <!-- Blue glow top bar -->
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,transparent 0%,#1E90FF 30%,#4DA8FF 50%,#1E90FF 70%,transparent 100%);"></td>
                </tr>

                <!-- Card content -->
                <tr>
                  <td class="inner-card" style="padding:40px 36px;">

                    <!-- Greeting -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size:13px;font-weight:600;color:#1E90FF;text-transform:uppercase;letter-spacing:2.5px;padding-bottom:8px;">
                          Verification Code
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:24px;font-weight:700;color:#FFFFFF;line-height:1.3;padding-bottom:8px;">
                          Sign in to StudySwap
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:15px;color:#8B8B9E;line-height:1.6;padding-bottom:32px;">
                          Use the code below to complete your login. This code is valid for <span style="color:#FFFFFF;font-weight:600;">5 minutes</span>.
                        </td>
                      </tr>
                    </table>

                    <!-- OTP Digits -->
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;padding-bottom:24px;" align="center">
                      <tr>
                        ${otpDigits}
                      </tr>
                    </table>

                    <!-- Copy Code Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-bottom:32px;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="#" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="50%" fillcolor="#1E90FF" strokecolor="#1E90FF" strokeweight="0">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:'Inter',sans-serif;font-size:14px;font-weight:700;">📋 Copy Code: ${otp}</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                            <tr>
                              <td style="background:linear-gradient(135deg,#1E90FF 0%,#1565C0 100%);border-radius:24px;text-align:center;">
                                <a href="#" style="display:inline-block;padding:14px 36px;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.5px;">
                                  📋&nbsp;&nbsp;Copy Code: ${otp}
                                </a>
                              </td>
                            </tr>
                          </table>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-bottom:24px;">
                      <tr>
                        <td style="height:1px;background:linear-gradient(90deg,transparent 0%,rgba(30,144,255,0.2) 50%,transparent 100%);"></td>
                      </tr>
                    </table>

                    <!-- Security Notice -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="background-color:rgba(30,144,255,0.06);border:1px solid rgba(30,144,255,0.1);border-radius:12px;padding:16px 20px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                              <td style="width:24px;vertical-align:top;padding-right:12px;font-size:18px;">🔒</td>
                              <td style="font-size:13px;color:#8B8B9E;line-height:1.6;">
                                <strong style="color:#FFFFFF;">Security tip:</strong> Never share this code with anyone. StudySwap will never ask for your code via call, SMS, or chat.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:13px;color:#4A4A5E;line-height:1.6;padding-bottom:4px;">
                    Study Together, Grow Together
                  </td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#3A3A4E;line-height:1.6;">
                    &copy; ${new Date().getFullYear()} StudySwap &bull; All rights reserved
                  </td>
                </tr>
                <tr>
                  <td style="font-size:11px;color:#2A2A3E;line-height:1.6;padding-top:12px;">
                    If you didn't request this code, you can safely ignore this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type BookingConfirmationEmailInput = {
  recipientRole: "student" | "mentor";
  recipientName?: string | null;
  studentName?: string | null;
  mentorName?: string | null;
  planTitle?: string | null;
  startTime: string | Date;
  durationMinutes?: number | string | null;
  meetingLink?: string | null;
};

export function bookingConfirmationEmailTemplate(input: BookingConfirmationEmailInput): string {
  const { date, time } = formatDateTime(input.startTime);
  const isStudent = input.recipientRole === "student";
  const recipientName = escapeHtml(input.recipientName || (isStudent ? "Student" : "Mentor"));
  const otherPerson = escapeHtml(
    isStudent ? input.mentorName || "your mentor" : input.studentName || "a student",
  );
  const planTitle = escapeHtml(input.planTitle || "Mentoring session");
  const duration = input.durationMinutes ? ` (${escapeHtml(input.durationMinutes)} mins)` : "";
  const meetingLink = input.meetingLink || APP_HOME_URL;

  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="font-size:16px;color:#8B8B9E;line-height:1.6;padding-bottom:28px;text-align:center;">
          Hi ${recipientName}, ${
            isStudent
              ? `your mentoring session with <span style="color:#FFFFFF;font-weight:600;">${otherPerson}</span> is confirmed.`
              : `<span style="color:#FFFFFF;font-weight:600;">${otherPerson}</span> booked a new session with you.`
          }
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:rgba(30,144,255,0.06);border:1px solid rgba(30,144,255,0.1);border-radius:14px;margin-bottom:28px;">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="font-size:13px;color:#8B8B9E;line-height:1.6;padding-bottom:10px;">
                <strong style="color:#FFFFFF;">Plan:</strong> ${planTitle}
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#8B8B9E;line-height:1.6;padding-bottom:10px;">
                <strong style="color:#FFFFFF;">Date:</strong> ${escapeHtml(date)}
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#8B8B9E;line-height:1.6;">
                <strong style="color:#FFFFFF;">Time:</strong> ${escapeHtml(time)}${duration}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-bottom:16px;">
      <tr><td align="center">${ctaButton("Join Session", meetingLink)}</td></tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="font-size:12px;color:#4A4A5E;line-height:1.6;text-align:center;word-break:break-all;">
          ${escapeHtml(meetingLink)}
        </td>
      </tr>
    </table>
  `;

  return darkEmailLayout({
    title: isStudent ? "Your StudySwap session is confirmed" : "New StudySwap booking",
    preheader: isStudent
      ? `Your session with ${input.mentorName || "your mentor"} is confirmed.`
      : `${input.studentName || "A student"} booked a session with you.`,
    eyebrow: isStudent ? "Booking Confirmed" : "New Booking",
    heading: isStudent ? "Session confirmed! 🎉" : "You have a new booking! 📅",
    body,
  });
}

export type MatchEmailProfile = {
  fullName?: string | null;
  profileImage?: string | null;
  state?: string | null;
  studyTime?: string | null;
  bio?: string | null;
  strongIn?: string | null;
  needHelpWith?: string | null;
  selectedExams?: string[] | null;
  matchReason?: string | null;
};

function matchProfileImage(match: MatchEmailProfile): string {
  if (match.profileImage) return match.profileImage;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    match.fullName || "StudySwap User",
  )}&background=1E90FF&color=fff`;
}

function matchCard(match: MatchEmailProfile): string {
  const exams = match.selectedExams?.slice(0, 3) ?? [];
  const tags = [
    ...exams.map((exam) => `Exam: ${exam}`),
    match.strongIn ? `Strong in: ${match.strongIn}` : null,
    match.needHelpWith ? `Needs help: ${match.needHelpWith}` : null,
  ].filter(Boolean);

  const tagsHtml = tags
    .map(
      (tag) =>
        `<span style="display:inline-block;background-color:rgba(30,144,255,0.08);border:1px solid rgba(30,144,255,0.12);border-radius:999px;color:#B9DFFF;font-size:11px;font-weight:600;line-height:1.3;padding:5px 10px;margin:0 6px 6px 0;">${escapeHtml(
          tag,
        )}</span>`,
    )
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:rgba(255,255,255,0.025);border:1px solid rgba(30,144,255,0.1);border-radius:14px;margin-bottom:14px;">
    <tr>
      <td style="padding:16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="width:64px;vertical-align:top;padding-right:14px;">
              <img
                src="${escapeHtml(matchProfileImage(match))}"
                alt="${escapeHtml(match.fullName || "StudySwap match")}"
                class="profile-img"
                width="58"
                height="58"
                style="display:block;width:58px;height:58px;object-fit:cover;border-radius:50%;border:2px solid rgba(30,144,255,0.35);"
              />
            </td>
            <td style="vertical-align:top;">
              <div style="font-size:16px;font-weight:700;color:#FFFFFF;line-height:1.3;padding-bottom:4px;">
                ${escapeHtml(match.fullName || "StudySwap User")}
              </div>
              <div style="font-size:12px;color:#6F6F82;line-height:1.5;padding-bottom:10px;">
                ${escapeHtml(match.state || "Location not set")} &bull; ${escapeHtml(
                  match.studyTime || "Flexible study time",
                )}
              </div>
              ${
                match.bio
                  ? `<div style="font-size:13px;color:#A5A5B8;line-height:1.5;padding-bottom:10px;">${escapeHtml(
                      match.bio,
                    )}</div>`
                  : ""
              }
              ${tagsHtml ? `<div style="padding-bottom:4px;">${tagsHtml}</div>` : ""}
              ${
                match.matchReason
                  ? `<div style="font-size:12px;color:#1E90FF;line-height:1.5;padding-top:8px;border-top:1px solid rgba(30,144,255,0.1);">${escapeHtml(
                      match.matchReason,
                    )}</div>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

export function matchesRefreshedEmailTemplate({
  userName,
  matches,
  totalMatches = matches.length,
}: {
  userName?: string | null;
  matches: MatchEmailProfile[];
  totalMatches?: number;
}): string {
  const shownMatches = matches.slice(0, 4);
  const remainingCount = Math.max(totalMatches - shownMatches.length, 0);
  const profileCards = shownMatches.map(matchCard).join("");

  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="font-size:16px;color:#8B8B9E;line-height:1.6;padding-bottom:24px;text-align:center;">
          Hi ${escapeHtml(userName || "Student")}, we found <span style="color:#FFFFFF;font-weight:700;">${escapeHtml(
            totalMatches,
          )}</span> study partner ${totalMatches === 1 ? "match" : "matches"} for you. Here are ${escapeHtml(
            shownMatches.length,
          )} profiles to preview.
        </td>
      </tr>
    </table>

    ${profileCards}

    ${
      remainingCount > 0
        ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:2px 0 22px;">
            <tr>
              <td style="font-size:13px;color:#8B8B9E;line-height:1.6;text-align:center;">
                ${escapeHtml(remainingCount)} more ${remainingCount === 1 ? "profile is" : "profiles are"} waiting in the app.
              </td>
            </tr>
          </table>`
        : ""
    }

    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-top:10px;">
      <tr><td align="center">${ctaButton("Open App to See All", APP_MATCHES_URL)}</td></tr>
    </table>
  `;

  return darkEmailLayout({
    title: "New StudySwap matches",
    preheader: `We found ${totalMatches} study partner ${totalMatches === 1 ? "match" : "matches"} for you.`,
    eyebrow: "New Matches",
    heading: "Fresh study matches are ready 🚀",
    body,
    footerNote: "Open the app to view every profile and connect with your best matches.",
  });
}

export function welcomeEmailTemplate(): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Welcome to StudySwap!</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      color-scheme: dark;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      background-color: #050507;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        padding: 16px !important;
      }
      .inner-card {
        padding: 28px 20px !important;
      }
      .logo-img {
        width: 140px !important;
        height: 140px !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#050507;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <!-- Preheader text (hidden but shows in email preview) -->
  <div style="display:none;font-size:1px;color:#050507;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Congratulations! Your profile is ready. Go to the app and find your study partner match.
  </div>

  <!-- Outer wrapper -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#050507;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Main container -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="520" class="email-container" style="max-width:520px;width:100%;">

          <!-- Logo & Brand Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img
                src="https://iili.io/C7smyzX.jpg"
                alt="StudySwap"
                class="logo-img"
                width="160"
                height="160"
                style="display:block;width:160px;height:160px;object-fit:contain;border-radius:20px;"
              />
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:linear-gradient(145deg,#0F0F18 0%,#0A0A12 100%);border:1px solid rgba(30,144,255,0.15);border-radius:20px;overflow:hidden;">

                <!-- Blue glow top bar -->
                <tr>
                  <td style="height:3px;background:linear-gradient(90deg,transparent 0%,#1E90FF 30%,#4DA8FF 50%,#1E90FF 70%,transparent 100%);"></td>
                </tr>

                <!-- Card content -->
                <tr>
                  <td class="inner-card" style="padding:40px 36px;">

                    <!-- Greeting -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="font-size:13px;font-weight:600;color:#1E90FF;text-transform:uppercase;letter-spacing:2.5px;padding-bottom:8px;text-align:center;">
                          Onboarding Complete
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:24px;font-weight:700;color:#FFFFFF;line-height:1.3;padding-bottom:16px;text-align:center;">
                          Congratulations! 🎉
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:16px;color:#8B8B9E;line-height:1.6;padding-bottom:32px;text-align:center;">
                          Your profile is fully set up. You're now ready to connect with dedicated students and find your perfect study partner match. Let's achieve those goals together!
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-bottom:16px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                            <tr>
                              <td style="background:linear-gradient(135deg,#1E90FF 0%,#1565C0 100%);border-radius:24px;text-align:center;">
                                <a href="studyswap://home" style="display:inline-block;padding:14px 36px;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;letter-spacing:0.5px;">
                                  Go to the App
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="font-size:13px;color:#4A4A5E;line-height:1.6;padding-bottom:4px;">
                    Study Together, Grow Together
                  </td>
                </tr>
                <tr>
                  <td style="font-size:12px;color:#3A3A4E;line-height:1.6;">
                    &copy; ${new Date().getFullYear()} StudySwap &bull; All rights reserved
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function mentorRegistrationAdminTemplate({
  mentorName,
  email,
  phoneNumber,
}: {
  mentorName: string;
  email: string;
  phoneNumber: string;
}): string {
  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="font-size:16px;color:#8B8B9E;line-height:1.6;padding-bottom:28px;text-align:center;">
          A new mentor has registered on StudySwap and is awaiting admin approval.
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:rgba(30,144,255,0.06);border:1px solid rgba(30,144,255,0.1);border-radius:14px;margin-bottom:28px;">
      <tr>
        <td style="padding:18px 20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="font-size:13px;color:#8B8B9E;line-height:1.6;padding-bottom:10px;">
                <strong style="color:#FFFFFF;">Name:</strong> ${escapeHtml(mentorName)}
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#8B8B9E;line-height:1.6;padding-bottom:10px;">
                <strong style="color:#FFFFFF;">Email:</strong> ${escapeHtml(email)}
              </td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#8B8B9E;line-height:1.6;">
                <strong style="color:#FFFFFF;">Phone Number:</strong> ${escapeHtml(phoneNumber)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return darkEmailLayout({
    title: "New Mentor Registration",
    preheader: `New mentor ${mentorName} is awaiting approval.`,
    eyebrow: "Admin Alert",
    heading: "New Mentor Registered 🎓",
    body,
  });
}

export function mentorVerifiedTemplate({ mentorName }: { mentorName: string }): string {
  const body = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="font-size:16px;color:#8B8B9E;line-height:1.6;padding-bottom:28px;text-align:center;">
          Hi ${escapeHtml(mentorName)}, your mentor profile has been successfully verified by an admin! 🎉
        </td>
      </tr>
      <tr>
        <td style="font-size:16px;color:#8B8B9E;line-height:1.6;padding-bottom:28px;text-align:center;">
          You are now listed in the public mentor directory and students can start booking sessions with you.
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding-bottom:16px;">
      <tr><td align="center">${ctaButton("Go to Dashboard", APP_HOME_URL)}</td></tr>
    </table>
  `;

  return darkEmailLayout({
    title: "Mentor Profile Verified",
    preheader: "Your mentor profile has been approved!",
    eyebrow: "Account Verified",
    heading: "You are officially a Mentor! 🚀",
    body,
  });
}
