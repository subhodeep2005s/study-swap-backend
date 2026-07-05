import { registry } from "@/config/openapi";
import { z } from "zod";
import { 
  adminLoginSchema, 
  createCountrySchema, 
  updateCountrySchema, 
  createExamSchema, 
  updateExamSchema, 
  updateStudentSchema, 
  updateMentorUserSchema, 
  adminUserResponseSchema, 
  countryResponseSchema, 
  examResponseSchema, 
  matchResponseSchema, 
  auditLogResponseSchema, 
  dashboardResponseSchema,
  updateMentorSchema,
  updateBookingSchema,
  updatePlanSchema,
  mentorProfileResponseSchema,
  mentorSlotResponseSchema,
  mentorPlanResponseSchema,
  bookingResponseSchema
} from "./admin.schema";

const tags = ["Admin"];
const security = [{ bearerAuth: [] }];

const AdminLogin = registry.register("AdminLogin", adminLoginSchema.shape.body);
const CreateCountry = registry.register("CreateCountry", createCountrySchema.shape.body);
const UpdateCountry = registry.register("UpdateCountry", updateCountrySchema.shape.body);
const CreateExam = registry.register("CreateExam", createExamSchema.shape.body);
const UpdateExam = registry.register("UpdateExam", updateExamSchema.shape.body);
const UpdateStudent = registry.register("UpdateStudent", updateStudentSchema.shape.body);
const UpdateMentorUser = registry.register("UpdateMentorUser", updateMentorUserSchema.shape.body);
const AdminUserResponse = registry.register("AdminUserResponse", adminUserResponseSchema);
const CountryResponse = registry.register("CountryResponse", countryResponseSchema);
const ExamResponse = registry.register("ExamResponse", examResponseSchema);
const MatchResponse = registry.register("MatchResponse", matchResponseSchema);
const AuditLogResponse = registry.register("AuditLogResponse", auditLogResponseSchema);
const DashboardResponse = registry.register("DashboardResponse", dashboardResponseSchema);

const UpdateMentor = registry.register("UpdateMentor", updateMentorSchema.shape.body);
const UpdateBooking = registry.register("UpdateBooking", updateBookingSchema.shape.body);
const UpdatePlan = registry.register("UpdatePlanAdmin", updatePlanSchema.shape.body);

const MentorProfileResponse = registry.register("MentorProfileResponse", mentorProfileResponseSchema);
const MentorSlotResponse = registry.register("MentorSlotResponse", mentorSlotResponseSchema);
const MentorPlanResponse = registry.register("MentorPlanResponse", mentorPlanResponseSchema);
const BookingResponse = registry.register("BookingResponse", bookingResponseSchema);

const PaginationResponse = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number()
});

// =========================================================================
// Auth
// =========================================================================
registry.registerPath({
  method: "post",
  path: "/admin/auth/login",
  tags,
  summary: "Admin login",
  description: "Login with admin credentials.",
  request: {
    body: {
      content: { "application/json": { schema: AdminLogin } },
    },
  },
  responses: {
    200: {
      description: "Admin login successful",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              token: z.string(),
              user: z.object({
                id: z.string(),
                email: z.string(),
                role: z.string(),
              }),
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/auth/me",
  tags,
  security,
  summary: "Admin get current user",
  description: "Get admin user details.",
  responses: {
    200: {
      description: "Admin details fetched",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({ user: z.any() }),
          }),
        },
      },
    },
  },
});

// =========================================================================
// Dashboard
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/admin/dashboard",
  tags,
  security,
  summary: "Get admin dashboard data",
  description: "Fetches aggregated platform statistics, user signups, and booking trends.",
  responses: {
    200: {
      description: "Dashboard data fetched",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: DashboardResponse
          })
        }
      }
    }
  }
});

// =========================================================================
// Countries
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/admin/countries",
  tags,
  security,
  summary: "Get all countries",
  description: "Admin only.",
  request: {
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Countries fetched",
      content: { 
        "application/json": { 
          schema: z.object({ 
            success: z.boolean(), 
            message: z.string(), 
            data: z.array(CountryResponse),
            pagination: PaginationResponse
          }) 
        } 
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/countries",
  tags,
  security,
  summary: "Create country",
  description: "Admin only.",
  request: {
    body: { content: { "application/json": { schema: CreateCountry } } },
  },
  responses: {
    201: {
      description: "Country created",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ country: CountryResponse }) }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/countries/{id}",
  tags,
  security,
  summary: "Update country",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: UpdateCountry } } },
  },
  responses: {
    200: {
      description: "Country updated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ country: CountryResponse }) }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/countries/{id}",
  tags,
  security,
  summary: "Delete country",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Country deleted",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/countries/{countryId}/exams",
  tags,
  security,
  summary: "Get exams by country",
  description: "Admin only.",
  request: {
    params: z.object({ countryId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Exams fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ exams: z.array(ExamResponse) }) }) } },
    },
  },
});

// =========================================================================
// Exams
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/admin/exams",
  tags,
  security,
  summary: "Get all exams",
  description: "Admin only.",
  request: {
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Exams fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(ExamResponse), pagination: PaginationResponse }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/admin/exams",
  tags,
  security,
  summary: "Create exam",
  description: "Admin only.",
  request: {
    body: { content: { "application/json": { schema: CreateExam } } },
  },
  responses: {
    201: {
      description: "Exam created",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ exam: ExamResponse }) }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/exams/{id}",
  tags,
  security,
  summary: "Update exam",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: UpdateExam } } },
  },
  responses: {
    200: {
      description: "Exam updated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ exam: ExamResponse }) }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/exams/{id}",
  tags,
  security,
  summary: "Delete exam",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Exam deleted",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}) }) } },
    },
  },
});

// =========================================================================
// Users
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/admin/users",
  tags,
  security,
  summary: "Get all users",
  description: "Admin only. Supports pagination and search.",
  request: {
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Users fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(AdminUserResponse), pagination: PaginationResponse }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/users/students",
  tags,
  security,
  summary: "Get all student users",
  description: "Admin only. Supports pagination and search.",
  request: {
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Students fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(AdminUserResponse), pagination: PaginationResponse }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/users/mentors",
  tags,
  security,
  summary: "Get all mentor users",
  description: "Admin only. Supports pagination and search.",
  request: {
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      search: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Mentors fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(AdminUserResponse), pagination: PaginationResponse }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/users/{id}",
  tags,
  security,
  summary: "Get user by ID",
  description: "Admin only. Returns a deeply enriched user payload including stats, bookings, and mentor plans.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "User fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ user: AdminUserResponse }) }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/users/students/{id}",
  tags,
  security,
  summary: "Update student user",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: UpdateStudent } } },
  },
  responses: {
    200: {
      description: "Student updated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ user: AdminUserResponse }) }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/users/mentors/{id}",
  tags,
  security,
  summary: "Update mentor user",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: UpdateMentorUser } } },
  },
  responses: {
    200: {
      description: "Mentor updated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ user: AdminUserResponse }) }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/users/{id}",
  tags,
  security,
  summary: "Delete user",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "User deleted",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}) }) } },
    },
  },
});

// =========================================================================
// Matches
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/admin/matches",
  tags,
  security,
  summary: "Get all matches",
  description: "Admin only. Supports pagination.",
  request: {
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
    }),
  },
  responses: {
    200: {
      description: "Matches fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(MatchResponse), pagination: PaginationResponse }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/matches/user/{userId}",
  tags,
  security,
  summary: "Get matches by user",
  description: "Admin only.",
  request: {
    params: z.object({ userId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "User matches fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ matches: z.array(MatchResponse) }) }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/matches/{id}",
  tags,
  security,
  summary: "Delete match",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Match deleted",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}) }) } },
    },
  },
});

// =========================================================================
// Audit Logs
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/admin/audit-logs",
  tags,
  security,
  summary: "Get audit logs",
  description: "Admin only. Fetches action audit logs with extensive filtering.",
  request: {
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      userId: z.string().uuid().optional(),
      action: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: "Audit logs fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(AuditLogResponse), pagination: PaginationResponse }) } },
    },
  },
});

// =========================================================================
// Mentors (Merged under Admin tag)
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/admin/mentors",
  tags,
  security,
  summary: "Get all mentors",
  description: "Admin only.",
  responses: {
    200: {
      description: "Mentors fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(MentorProfileResponse) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/mentors/{id}",
  tags,
  security,
  summary: "Get mentor by ID",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Mentor fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: MentorProfileResponse }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/mentors/{id}",
  tags,
  security,
  summary: "Update mentor",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: UpdateMentor } } },
  },
  responses: {
    200: {
      description: "Mentor updated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: MentorProfileResponse }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/mentors/{id}",
  tags,
  security,
  summary: "Delete mentor",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Mentor deleted",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}) }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/mentors/{id}/verify",
  tags,
  security,
  summary: "Verify mentor",
  description: "Admin only. Verifies the mentor profile.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Mentor verified",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: MentorProfileResponse }) } },
    },
  },
});

// =========================================================================
// Bookings (Merged under Admin tag)
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/admin/mentors/bookings",
  tags,
  security,
  summary: "Get all bookings",
  description: "Admin only. Supports pagination, search, and status filtering.",
  request: {
    query: z.object({
      page: z.coerce.number().optional(),
      limit: z.coerce.number().optional(),
      search: z.string().optional(),
      status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
    }),
  },
  responses: {
    200: {
      description: "Bookings fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.array(BookingResponse), pagination: PaginationResponse }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/mentors/{id}/bookings",
  tags,
  security,
  summary: "Get bookings by mentor ID",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Mentor bookings fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ bookings: z.array(BookingResponse) }) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/admin/mentors/bookings/{id}",
  tags,
  security,
  summary: "Get booking by ID",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Booking fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: BookingResponse }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/mentors/bookings/{id}",
  tags,
  security,
  summary: "Update booking",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: UpdateBooking } } },
  },
  responses: {
    200: {
      description: "Booking updated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: BookingResponse }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/mentors/bookings/{id}",
  tags,
  security,
  summary: "Delete booking",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Booking deleted",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}) }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/mentors/bookings/{id}/regenerate-meet",
  tags,
  security,
  summary: "Regenerate Google Meet Link",
  description: "Admin only. Triggers Google Calendar API to regenerate the meeting link for this booking.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Google Meet link regenerated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ meetUrl: z.string(), calendarUrl: z.string(), eventId: z.string() }) }) } },
    },
  },
});

// =========================================================================
// Slots (Merged under Admin tag)
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/admin/mentors/{id}/slots",
  tags,
  security,
  summary: "Get mentor slots",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Mentor slots fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ slots: z.array(MentorSlotResponse) }) }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/mentors/slots/{id}",
  tags,
  security,
  summary: "Delete mentor slot",
  description: "Admin only. Fails if the slot is currently booked.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Slot deleted",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}) }) } },
    },
  },
});

// =========================================================================
// Plans (Merged under Admin tag)
// =========================================================================
registry.registerPath({
  method: "get",
  path: "/admin/mentors/{id}/plans",
  tags,
  security,
  summary: "Get mentor plans",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Mentor plans fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ plans: z.array(MentorPlanResponse) }) }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/admin/mentors/plans/{id}",
  tags,
  security,
  summary: "Update mentor plan",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: UpdatePlan } } },
  },
  responses: {
    200: {
      description: "Plan updated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: MentorPlanResponse }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/admin/mentors/plans/{id}",
  tags,
  security,
  summary: "Delete mentor plan",
  description: "Admin only. Fails if the plan has active bookings.",
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Plan deleted",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({}) }) } },
    },
  },
});
