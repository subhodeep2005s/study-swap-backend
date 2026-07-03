import { registry } from "@/config/openapi";
import { z } from "zod";
import { adminLoginSchema, createCountrySchema, updateCountrySchema, createExamSchema, updateExamSchema, updateStudentSchema, updateMentorUserSchema, adminUserResponseSchema } from "./admin.schema";

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

registry.registerPath({
  method: "post",
  path: "/api/admin/auth/login",
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
  path: "/api/admin/auth/me",
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

registry.registerPath({
  method: "get",
  path: "/api/admin/countries",
  tags,
  security,
  summary: "Get all countries",
  description: "Admin only.",
  responses: {
    200: {
      description: "Countries fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ countries: z.array(z.any()) }) }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/countries",
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/countries/{id}",
  tags,
  security,
  summary: "Update country",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateCountry } } },
  },
  responses: {
    200: {
      description: "Country updated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/countries/{id}",
  tags,
  security,
  summary: "Delete country",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Country deleted",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/countries/{countryId}/exams",
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ exams: z.array(z.any()) }) }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/exams",
  tags,
  security,
  summary: "Get all exams",
  description: "Admin only.",
  responses: {
    200: {
      description: "Exams fetched",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ exams: z.array(z.any()) }) }) } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/admin/exams",
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/api/admin/exams/{id}",
  tags,
  security,
  summary: "Update exam",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { "application/json": { schema: UpdateExam } } },
  },
  responses: {
    200: {
      description: "Exam updated",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "delete",
  path: "/api/admin/exams/{id}",
  tags,
  security,
  summary: "Delete exam",
  description: "Admin only.",
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Exam deleted",
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/users",
  tags: ["Admin"],
  summary: "Get all users",
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Success", content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ users: z.array(AdminUserResponse) }) }) } } } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/users/students",
  tags: ["Admin"],
  summary: "Get all student users",
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Success", content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ users: z.array(AdminUserResponse) }) }) } } } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/users/mentors",
  tags: ["Admin"],
  summary: "Get all mentor users",
  security: [{ bearerAuth: [] }],
  responses: { 200: { description: "Success", content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.object({ users: z.array(AdminUserResponse) }) }) } } } },
});

registry.registerPath({
  method: "get",
  path: "/api/admin/users/{id}",
  tags,
  security,
  summary: "Get user by ID",
  description: "Admin only.",
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
  path: "/api/admin/users/students/{id}",
  tags,
  security,
  summary: "Update student user",
  description: "Admin only. Can update role, emailVerified, onboardingCompleted, and profile fields.",
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
  path: "/api/admin/users/mentors/{id}",
  tags,
  security,
  summary: "Update mentor user",
  description: "Admin only. Can update role, profile fields, and mentor-specific fields.",
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
  path: "/api/admin/users/{id}",
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
      content: { "application/json": { schema: z.object({ success: z.boolean(), message: z.string(), data: z.any() }) } },
    },
  },
});
