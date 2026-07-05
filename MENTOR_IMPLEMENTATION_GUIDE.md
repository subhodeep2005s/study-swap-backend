# Mentor Integration Guide

This document outlines all the APIs required to build the Mentor Frontend Experience, from registration to managing their dashboard, plans, slots, and bookings.

All endpoints (except `send-otp` and `verify-otp`) require a valid Bearer Token in the `Authorization` header.

---

## 1. Authentication & Account Creation

### Send OTP
Generates a login code and emails it to the user.
- **Route:** `POST /auth/send-otp`
- **Body:**
  ```json
  { "email": "mentor@example.com" }
  ```
- **Response:** `{ "success": true, "message": "OTP sent successfully" }`

### Verify OTP & Select Role
Logs the user in. **By passing `"role": "mentor"`, the system automatically assigns them the mentor role.**
- **Route:** `POST /auth/verify-otp`
- **Body:**
  ```json
  { 
    "email": "mentor@example.com", 
    "otp": "123456",
    "role": "mentor"
  }
  ```
- **Response:** Returns the JWT `token` and `user` object. Store the token for subsequent requests.

---

## 2. Mentor Onboarding

Once authenticated as a mentor, they must complete these two steps to appear on the platform.

### Step 1: Basic Profile
Set their name, age, and bio.
- **Route:** `PATCH /onboarding/profile`
- **Body:**
  ```json
  {
    "fullName": "Jane Doe",
    "age": 28,
    "gender": "female",
    "state": "California",
    "bio": "Expert in Mathematics."
  }
  ```

### Step 2: Mentor Application (Auto-Verifies)
Submit their professional mentor details along with their country, state, and exams they teach. **This instantly verifies them and lists them publicly.**
- **Route:** `POST /onboarding/mentor-application`
- **Body:**
  ```json
  {
    "title": "Senior Math Tutor",
    "qualification": "PhD in Mathematics",
    "experienceYears": 5,
    "hourlyPrice": 50,
    "about": "I specialize in calculus and algebra.",
    "countryId": "38a8df0b-222a-43cf-be72-a1b72e53efc1",
    "state": "California",
    "examIds": [
      "a90fb2f1-6cf1-45bd-89ab-e8b23f2f8121",
      "e29b128f-7f61-419b-a3d2-36c1c28f117a"
    ]
  }
  ```

---

## 3. Mentor Dashboard (/mentor/*)

These routes are restricted to users with the `mentor` role.

### 3.1 Profile Management

**Get Profile**
- **Route:** `GET /mentor/profile`
- **Response:** Returns the mentor's full profile, title, rating, stats, country, state, and exams list.

**Update Profile**
- **Route:** `PATCH /mentor/profile`
- **Body:** (All fields optional)
  ```json
  {
    "title": "Lead Instructor",
    "hourly_price": 60,
    "country_id": "38a8df0b-222a-43cf-be72-a1b72e53efc1",
    "state": "Nevada",
    "exam_ids": [
      "a90fb2f1-6cf1-45bd-89ab-e8b23f2f8121"
    ]
  }
  ```

### 3.2 Plan Management
Mentors create specific lesson plans/packages that students can book.

**List Plans**
- **Route:** `GET /mentor/plans`

**Create Plan**
- **Route:** `POST /mentor/plans`
- **Body:**
  ```json
  {
    "title": "1-on-1 Calculus Crash Course",
    "description": "Intensive 1 hour session",
    "duration_minutes": 60,
    "price": 40.00,
    "is_active": true
  }
  ```

**Update Plan**
- **Route:** `PATCH /mentor/plans/:id`
- **Body:** (Partial object of create plan)

**Delete Plan**
- **Route:** `DELETE /mentor/plans/:id`

### 3.3 Slot Management
Mentors define their availability by creating time slots.

**List Slots**
- **Route:** `GET /mentor/slots`

**Create Slot**
- **Route:** `POST /mentor/slots`
- **Body:**
  ```json
  {
    "start_time": "2026-07-05T10:00:00Z",
    "end_time": "2026-07-05T11:00:00Z"
  }
  ```

**Update Slot**
- **Route:** `PATCH /mentor/slots/:id`
- **Body:** `{ "start_time": "...", "end_time": "..." }`

**Delete Slot**
- **Route:** `DELETE /mentor/slots/:id`

### 3.4 Booking Management
Manage incoming requests from students.

**List Bookings**
- **Route:** `GET /mentor/bookings`

**Get Specific Booking**
- **Route:** `GET /mentor/bookings/:id`

**Confirm Booking**
- **Route:** `PATCH /mentor/bookings/:id/confirm`
- **Description:** Marks a pending booking as confirmed.

**Complete Booking**
- **Route:** `PATCH /mentor/bookings/:id/complete`
- **Description:** Marks an ongoing/finished session as completed.

**Cancel Booking**
- **Route:** `PATCH /mentor/bookings/:id/cancel`
- **Description:** Cancels the booking.
