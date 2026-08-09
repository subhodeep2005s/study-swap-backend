# Backend Schema & Flow Changes (Mentor Approval & Phone Number)

This document outlines the recent backend modifications made to support the **Mentor Approval Flow** and the **Mentor Phone Number**. Frontend developers should use this guide to update their schemas, forms, and API integrations.

---

## 1. Mentor Application Flow (Onboarding)

### Behavior Change
Mentors are **no longer auto-verified** when they apply. 
- When a user submits their mentor application, the backend forces `is_verified = false`.
- The mentor's profile is in a "Pending Approval" state. They will not appear in the public mentor directory until an admin explicitly verifies them.

### Schema Change (Mentor Application Payload)
The `POST /onboarding/mentor-application` route now requires the `phoneNumber` field.

**Updated Request Body:**
```json
{
  "title": "Senior Math Tutor",
  "qualification": "PhD in Mathematics",
  "experienceYears": 5,
  "hourlyPrice": 50,
  "about": "I specialize in calculus and algebra.",
  "phoneNumber": "+919876543210",  // <--- NEW FIELD (camelCase)
  "countryId": "38a8df0b-222a-43cf-be72-a1b72e53efc1",
  "state": "California",
  "examIds": ["a90fb2f1-6cf1-45bd-89ab-e8b23f2f8121"]
}
```

### Frontend Action Items:
1. Update your form schemas (e.g., Zod or Yup) for the mentor application step to include `phoneNumber` (string, max/min length validations as appropriate).
2. Add a text input in the UI for the phone number.
3. Add a success message after application submission indicating: *"Your application is pending admin review. You will be notified once verified."*

---

## 2. Mentor Dashboard Settings

### Schema Change (Update Profile)
Mentors can update their phone number later from their dashboard.

**Route:** `PATCH /mentor/profile`
**Updated Request Body:**
```json
{
  "title": "Lead Instructor",
  "hourly_price": 60,
  "phone_number": "+919876543210", // <--- NEW FIELD (snake_case)
  "country_id": "38a8df0b-222a-43cf-be72-a1b72e53efc1"
}
```

### Frontend Action Items:
1. On the Mentor "Edit Profile" or "Settings" page, add an input field for the phone number.
2. Bind this to the `phone_number` key in your API patch request.
3. If the mentor is not verified, display a prominent banner on their dashboard: *"Your profile is currently under review by an admin."* (Check `is_verified === false` from `GET /mentor/profile`).

---

## 3. Admin Panel Integration

The backend already exposes all necessary details (including email and phone number) to the Admin Panel. No new data-fetching queries are needed on the frontend, just UI updates.

### Schema Change (Mentor Responses)
All admin mentor routes (`GET /admin/mentors` and `GET /admin/mentors/:id`) return the enriched mentor object.

**Response Body snippet:**
```json
{
  "id": "mentor_uuid",
  "full_name": "Jane Doe",
  "email": "jane@example.com",           // <-- Already present
  "is_verified": false,                  // <-- Used for approval status
  "phone_number": "+919876543210",       // <-- NEW FIELD
  "title": "Math Tutor"
  // ... other fields
}
```

### New Action Endpoint (Approve Mentor)
Admins can toggle the verification status of a mentor. This also flushes the backend cache automatically so the change goes live instantly.

**Route:** `PATCH /admin/mentors/:id/verify`
**Headers:** `Authorization: Bearer <token>`
**Body:** None required.
**Response:** Returns the updated mentor object (with `is_verified: true`).

### Schema Change (Admin Update Mentor)
If the admin wants to manually edit the mentor's profile (including the phone number).

**Route:** `PATCH /admin/mentors/:id`
**Updated Request Body:**
```json
{
  "title": "Math Tutor Updated",
  "phone_number": "+919876543210" // <--- NEW FIELD (snake_case)
}
```

### Frontend Action Items:
1. **Mentor Data Table:** Render the `phone_number` and `email` columns so admins have direct contact access.
2. **Status Badge:** Use `is_verified` to show a "Pending Approval" badge (if false) or a "Verified" badge (if true).
3. **Approve Button:** Add a button next to unverified mentors that calls the `PATCH /admin/mentors/:id/verify` endpoint.
4. **Edit Form:** In the admin's edit mentor modal/page, add a `phone_number` input field.
