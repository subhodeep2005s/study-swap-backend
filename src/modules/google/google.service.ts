import { calendar_v3, auth as googleAuth } from "@googleapis/calendar";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { v4 as uuidv4 } from "uuid";

export interface CreateMeetingInput {
  mentorName: string;
  mentorEmail: string;
  studentName: string;
  studentEmail: string;
  bookingId: string;
  title: string;
  description: string;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
}

export interface CreateMeetingOutput {
  eventId: string;
  meetUrl: string;
  calendarUrl: string;
}

export class GoogleService {
  /**
   * Creates an OAuth2 client configured with the StudySwap service account credentials.
   * The SDK auto-refreshes the access token using the refresh token.
   */
  private static getOAuth2Client() {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
      throw new Error("Google OAuth credentials are not configured");
    }

    const oauth2Client = new googleAuth.OAuth2(
      env.GOOGLE_CLIENT_ID,
      env.GOOGLE_CLIENT_SECRET,
      env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
    });

    return oauth2Client;
  }

  /**
   * Creates a Google Calendar event with an auto-generated Google Meet link.
   */
  static async createMeeting(input: CreateMeetingInput): Promise<CreateMeetingOutput> {
    const auth = this.getOAuth2Client();
    const calendar = new calendar_v3.Calendar({ auth });

    const requestId = uuidv4();

    const event = await calendar.events.insert({
      calendarId: env.GOOGLE_CALENDAR_ID,
      conferenceDataVersion: 1,
      sendUpdates: "all", // Send calendar invitations to attendees
      requestBody: {
        summary: input.title,
        description: [
          `Booking ID: ${input.bookingId}`,
          `Mentor: ${input.mentorName}`,
          `Student: ${input.studentName}`,
          "",
          input.description,
        ].join("\n"),
        start: {
          dateTime: input.startTime,
          timeZone: "UTC",
        },
        end: {
          dateTime: input.endTime,
          timeZone: "UTC",
        },
        attendees: [
          { email: input.mentorEmail, displayName: input.mentorName },
          { email: input.studentEmail, displayName: input.studentName },
        ],
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 15 },
            { method: "email", minutes: 30 },
          ],
        },
      },
    });

    const eventData = event.data;

    const eventId = eventData.id;
    if (!eventId) {
      throw new Error("Google Calendar event created but no event ID returned");
    }

    const meetUrl = eventData.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video"
    )?.uri;

    if (!meetUrl) {
      logger.warn({ eventId, bookingId: input.bookingId }, "Google Meet link not found in event response");
    }

    const calendarUrl = eventData.htmlLink || "";

    logger.info(
      { eventId, meetUrl, calendarUrl, bookingId: input.bookingId },
      "Google Calendar event created with Meet link"
    );

    return {
      eventId,
      meetUrl: meetUrl || "",
      calendarUrl,
    };
  }

  /**
   * Deletes a Google Calendar event (used when a booking is cancelled).
   */
  static async deleteMeeting(eventId: string): Promise<void> {
    try {
      const auth = this.getOAuth2Client();
      const calendar = new calendar_v3.Calendar({ auth });

      await calendar.events.delete({
        calendarId: env.GOOGLE_CALENDAR_ID,
        eventId,
        sendUpdates: "all", // Notify attendees of cancellation
      });

      logger.info({ eventId }, "Google Calendar event deleted");
    } catch (error) {
      logger.error({ error, eventId }, "Failed to delete Google Calendar event");
    }
  }

  /**
   * Checks if Google Calendar integration is configured.
   */
  static isConfigured(): boolean {
    return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);
  }
}
