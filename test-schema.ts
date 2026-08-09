import { mentorApplicationSchema } from "./src/modules/onboarding/onboarding.schema";

const res = mentorApplicationSchema.safeParse({
  body: {
    title: "Senior Test Engineer",
    qualification: "PhD in Testing",
    experienceYears: 10,
    hourlyPrice: 100,
    countryId: "b594b2a3-6b74-42b7-a3f1-d007c0f0a4f5",
    educationNodeIds: []
  }
});
console.log(JSON.stringify(res, null, 2));
