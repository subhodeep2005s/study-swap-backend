import { z } from "zod";

// =========================================================================
// Auth
// =========================================================================
export const adminLoginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
  }),
});

// =========================================================================
// Pagination (shared query schema)
// =========================================================================
export const paginationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
    search: z.string().optional(),
  }),
});

// =========================================================================
// Countries
// =========================================================================
export const createCountrySchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    flag: z.string().nullable().optional(),
    isoCode: z.string().length(2, "ISO Code must be exactly 2 characters").toUpperCase().optional(),
  }),
});

export const updateCountrySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    flag: z.string().nullable().optional(),
    isoCode: z.string().length(2).toUpperCase().optional(),
  }),
});

// =========================================================================
// Exams
// =========================================================================
export const createExamSchema = z.object({
  body: z.object({
    countryId: z.string().uuid("Invalid country ID"),
    name: z.string().min(1, "Name is required"),
    isActive: z.boolean().optional(),
  }),
});

export const updateExamSchema = z.object({
  body: z.object({
    countryId: z.string().uuid("Invalid country ID").optional(),
    name: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
  }),
});

// =========================================================================
// Users
// =========================================================================
export const updateStudentSchema = z.object({
  body: z.object({
    role: z.enum(["student", "mentor"]).optional(),
    emailVerified: z.boolean().optional(),
    onboardingCompleted: z.boolean().optional(),
    fullName: z.string().optional(),
    profileImage: z.string().optional(),
    age: z.number().optional(),
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
    state: z.string().optional(),
    countryId: z.string().uuid().nullable().optional(),
    bio: z.string().optional(),
    strongIn: z.string().optional(),
    needHelpWith: z.string().optional(),
    studyTime: z.enum(["morning", "afternoon", "evening", "late_night"]).optional(),
    lookingFor: z.array(z.string()).optional(),
    examIds: z.array(z.string().uuid()).optional(),
  }),
});

export const updateMentorUserSchema = updateStudentSchema.extend({
  body: updateStudentSchema.shape.body.extend({
    title: z.string().optional(),
    qualification: z.string().optional(),
    experienceYears: z.number().optional(),
    hourlyPrice: z.number().optional(),
    isVerified: z.boolean().optional(),
    phoneNumber: z.string().optional(),
  }),
});

// =========================================================================
// Bookings (with status filter)
// =========================================================================
export const bookingsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
    search: z.string().optional(),
    status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  }),
});

// =========================================================================
// Audit Logs
// =========================================================================
export const auditLogsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50).optional(),
    userId: z.string().uuid().optional(),
    action: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
});

// =========================================================================
// Mentors (Merged)
// =========================================================================
export const updateMentorSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    qualification: z.string().optional(),
    experience_years: z.number().optional(),
    hourly_price: z.number().optional(),
    is_verified: z.boolean().optional(),
    phone_number: z.string().optional(),
    country_id: z.string().uuid().nullable().optional(),
    state: z.string().optional(),
    exam_ids: z.array(z.string().uuid()).optional(),
  }),
});

export const updateBookingSchema = z.object({
  body: z.object({
    status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
    payment_status: z.enum(["pending", "paid", "refunded"]).optional(),
  }),
});

export const updatePlanSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    description: z.string().optional(),
    duration_minutes: z.number().int().min(15).optional(),
    price: z.number().min(0).optional(),
    is_active: z.boolean().optional(),
  }),
});

export const updateAvailabilitySchema = z.object({
  body: z.object({
    availability: z.array(z.object({
      day_of_week: z.number().int().min(0).max(6),
      start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/),
      end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
    })).max(50)
  })
});

// =========================================================================
// Response schemas (for documentation)
// =========================================================================
export const adminUserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.string(),
  email_verified: z.boolean(),
  onboarding_completed: z.boolean(),
  created_at: z.string().or(z.date()),
  full_name: z.string().nullable().optional(),
  profile_image: z.string().nullable().optional(),
  country_id: z.string().uuid().nullable().optional(),
  state: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  age: z.number().nullable().optional(),
  bio: z.string().nullable().optional(),
  strong_in: z.string().nullable().optional(),
  need_help_with: z.string().nullable().optional(),
  study_time: z.string().nullable().optional(),
  looking_for: z.array(z.string()).nullable().optional(),
});

export const countryResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  flag: z.string().nullable(),
  iso_code: z.string().nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export const examResponseSchema = z.object({
  id: z.string().uuid(),
  country_id: z.string().uuid(),
  name: z.string(),
  is_active: z.boolean(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export const matchResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  matched_user_id: z.string().uuid(),
  status: z.string(),
  matched_at: z.string().or(z.date()).nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
  user_name: z.string().nullable(),
  user_email: z.string().nullable(),
  matched_user_name: z.string().nullable(),
  matched_user_email: z.string().nullable(),
});

export const auditLogResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  action: z.string(),
  entity_type: z.string().nullable(),
  entity_id: z.string().uuid().nullable(),
  details: z.any().nullable(),
  created_at: z.string().or(z.date()),
  user_email: z.string().nullable(),
});

export const dashboardResponseSchema = z.object({
  overview: z.object({
    totalUsers: z.string().or(z.number()),
    totalStudents: z.string().or(z.number()),
    totalMentors: z.string().or(z.number()),
    verifiedMentors: z.string().or(z.number()),
    unverifiedMentors: z.string().or(z.number()),
    totalBookings: z.string().or(z.number()),
    activeBookings: z.string().or(z.number()),
    completedBookings: z.string().or(z.number()),
    cancelledBookings: z.string().or(z.number()),
    totalRevenue: z.string().or(z.number()),
    totalMatches: z.string().or(z.number()),
    totalConversations: z.string().or(z.number()),
    totalMessages: z.string().or(z.number()),
  }),
  charts: z.object({
    userSignups: z.array(z.any()),
    bookingsByStatus: z.any(),
    revenueByMonth: z.array(z.any()),
    topMentors: z.array(z.any()),
    topExams: z.array(z.any()),
  }),
});

export const mentorProfileResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  qualification: z.string(),
  experience_years: z.number(),
  hourly_price: z.number(),
  rating: z.number(),
  total_reviews: z.number(),
  about: z.string().nullable(),
  is_verified: z.boolean(),
  phone_number: z.string().nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
  full_name: z.string().nullable(),
  profile_image: z.string().nullable(),
  email: z.string().nullable(),
  total_bookings: z.number().nullable(),
});

export const mentorSlotResponseSchema = z.object({
  id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  start_time: z.string().or(z.date()),
  end_time: z.string().or(z.date()),
  is_booked: z.boolean(),
  created_at: z.string().or(z.date()),
});

export const mentorPlanResponseSchema = z.object({
  id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  duration_minutes: z.number(),
  price: z.string().or(z.number()),
  is_active: z.boolean(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
});

export const bookingResponseSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  mentor_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  slot_id: z.string().uuid(),
  status: z.string(),
  payment_status: z.string(),
  amount: z.string().or(z.number()),
  meeting_link: z.string().nullable(),
  google_event_id: z.string().nullable(),
  google_meet_url: z.string().nullable(),
  google_calendar_url: z.string().nullable(),
  meeting_provider: z.string().nullable(),
  created_at: z.string().or(z.date()),
  updated_at: z.string().or(z.date()),
  mentor_name: z.string().nullable(),
  mentor_email: z.string().nullable(),
  student_name: z.string().nullable(),
  student_email: z.string().nullable(),
  plan_title: z.string().nullable(),
  duration_minutes: z.number().nullable(),
  start_time: z.string().or(z.date()).nullable(),
  end_time: z.string().or(z.date()).nullable(),
});

// =========================================================================
// Type exports
// =========================================================================
export type AdminLoginInput = z.infer<typeof adminLoginSchema>["body"];
export type CreateCountryInput = z.infer<typeof createCountrySchema>["body"];
export type UpdateCountryInput = z.infer<typeof updateCountrySchema>["body"];
export type CreateExamInput = z.infer<typeof createExamSchema>["body"];
export type UpdateExamInput = z.infer<typeof updateExamSchema>["body"];
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>["body"];
export type UpdateMentorUserInput = z.infer<typeof updateMentorUserSchema>["body"];
export type UpdateMentorInput = z.infer<typeof updateMentorSchema>["body"];
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>["body"];
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>["body"];
