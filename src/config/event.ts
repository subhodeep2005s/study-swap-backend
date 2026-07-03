import { EventEmitter as NodeEventEmitter } from "node:events";

export enum Event {
  USER_REGISTERED = "user.registered",
  USER_LOGGEDIN = "user.loggedin",
  USER_LOGGEDOUT = "user.loggedout",
  USER_FORGOT_PASSWORD = "user.forgot-password",
  USER_RESET_PASSWORD = "user.reset-password",
  USER_VERIFY_EMAIL = "user.verify-email",
  USER_UPDATE_PROFILE = "user.update-profile",
  USER_DELETE_PROFILE = "user.delete-profile",

  MENTOR_SESSION_BOOKED = "mentor.session-booked",
  MATCHES_REFRESHED = "matches.refreshed",

  AUDIT_LOG = "audit.log",
}

export type EventPayload = {
  [Event.USER_REGISTERED]: {
    userId: string;
    email: string;
    role: string;
    otp: string;
  };
  [Event.USER_LOGGEDIN]: {
    userId: string;
    email: string;
    role: string;
  };
  [Event.USER_LOGGEDOUT]: {
    userId: string;
    email: string;
    role: string;
  };
  [Event.USER_FORGOT_PASSWORD]: {
    userId: string;
    email: string;
    role: string;
  };
  [Event.USER_RESET_PASSWORD]: {
    userId: string;
    email: string;
    role: string;
  };
  [Event.USER_VERIFY_EMAIL]: {
    userId: string;
    email: string;
    role: string;
  };
  [Event.USER_UPDATE_PROFILE]: {
    userId: string;
    email: string;
    role: string;
  };
  [Event.USER_DELETE_PROFILE]: {
    userId: string;
    email: string;
    role: string;
  };

  [Event.MENTOR_SESSION_BOOKED]: {
    studentId: string;
    bookingId: string;
  };

  [Event.MATCHES_REFRESHED]: {
    userId: string;
  };

  [Event.AUDIT_LOG]: {
    id?: string;
    userId: string;
    userRole: string;
    action: string;
    entity: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    statusCode?: number;
    createdAt?: Date | string;
  };
};

class EventEmitter extends NodeEventEmitter {
  emit<K extends keyof EventPayload>(eventName: K, payload: EventPayload[K]): boolean {
    return super.emit(eventName, payload);
  }

  on<K extends keyof EventPayload>(
    eventName: K,
    listener: (payload: EventPayload[K]) => void,
  ): this {
    return super.on(eventName, listener);
  }
}

export const eventEmitter = new EventEmitter();
