import { registry } from "@/config/openapi";
import { z } from "zod";
import {
  countrySchema,
  profileSchema,
  educationNodesSchema,
  studySchema,
  preferencesSchema,
  enhanceBioSchema,
  mentorApplicationSchema,
} from "./onboarding.schema";

const tags = ["Onboarding"];
const security = [{ bearerAuth: [] }];

const CountryInput = registry.register("CountryInput", countrySchema.shape.body);
const ProfileInput = registry.register("ProfileInput", profileSchema.shape.body);
const EducationNodesInput = registry.register("EducationNodesInput", educationNodesSchema.shape.body);
const StudyInput = registry.register("StudyInput", studySchema.shape.body);
const PreferencesInput = registry.register("PreferencesInput", preferencesSchema.shape.body);
const EnhanceBioInput = registry.register("EnhanceBioInput", enhanceBioSchema.shape.body);
const MentorApplicationInput = registry.register("MentorApplicationInput", mentorApplicationSchema.shape.body);

registry.registerPath({
  method: "get",
  path: "/onboarding/status",
  tags,
  security,
  summary: "Get onboarding status",
  description: "Check if the user has completed onboarding.",
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              onboardingCompleted: z.boolean(),
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/onboarding/country",
  tags,
  security,
  summary: "Save country",
  description: "Save the user's selected country.",
  request: {
    body: {
      content: {
        "application/json": { schema: CountryInput },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({}).openapi({ description: "No data returned for this operation", example: {} }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/onboarding/profile",
  tags,
  security,
  summary: "Update basic profile",
  description: "Update the user's basic profile details.",
  request: {
    body: {
      content: {
        "application/json": { schema: ProfileInput },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({}).openapi({ description: "No data returned for this operation", example: {} }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/onboarding/education-nodes",
  tags,
  security,
  summary: "Get user education nodes",
  description: "Get the education nodes selected by the user.",
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              educationNodes: z.array(z.object({ id: z.string(), name: z.string() })),
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/onboarding/education-nodes",
  tags,
  security,
  summary: "Save education nodes",
  description: "Save the user's selected education nodes.",
  request: {
    body: {
      content: {
        "application/json": { schema: EducationNodesInput },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({}).openapi({ description: "No data returned for this operation", example: {} }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/onboarding/study",
  tags,
  security,
  summary: "Save study details",
  description: "Save the user's study details.",
  request: {
    body: {
      content: {
        "application/json": { schema: StudyInput },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({}).openapi({ description: "No data returned for this operation", example: {} }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "patch",
  path: "/onboarding/preferences",
  tags,
  security,
  summary: "Save study preferences",
  description: "Save the user's study preferences.",
  request: {
    body: {
      content: {
        "application/json": { schema: PreferencesInput },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({}).openapi({ description: "No data returned for this operation", example: {} }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/onboarding/complete",
  tags,
  security,
  summary: "Complete onboarding",
  description: "Mark the user's onboarding as completed.",
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({}).openapi({ description: "No data returned for this operation", example: {} }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/onboarding/enhance-bio",
  tags,
  security,
  summary: "Enhance user bio",
  description: "Improve the user's study bio using Gemini AI.",
  request: {
    body: {
      content: {
        "application/json": { schema: EnhanceBioInput },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({
              bio: z.string(),
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/onboarding/mentor-application",
  tags,
  security,
  summary: "Apply for mentor",
  description: "Submit an application to become a mentor.",
  request: {
    body: {
      content: {
        "application/json": { schema: MentorApplicationInput },
      },
    },
  },
  responses: {
    200: {
      description: "Success",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            data: z.object({}).openapi({ description: "No data returned for this operation", example: {} }),
          }),
        },
      },
    },
  },
});
