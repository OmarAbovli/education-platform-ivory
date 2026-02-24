# Enterprise Educational Platform Architecture

**Architected and Develop by: omarabovli**

This repository houses a state-of-the-art Learning Management System (LMS) designed for high-scale, secure, and interactive educational content delivery. Built on the principles of performance, security, and modularity, the platform serves as a generic foundation for any online education business, agnostic of the specific subject matter.

## 1. System Architecture Overview

The platform leverages a modern Full-Stack architecture utilizing the **Next.js 15 App Router**. It embraces the **React Server Components (RSC)** paradigm to minimize client-side bundle size and maximize initial load performance.

*   **Framework:** Next.js 15 (React 19 RC)
*   **Language:** TypeScript (Strict Mode)
*   **Database:** PostgreSQL (Neon Serverless)
*   **Styling:** Tailwind CSS + Shadcn UI
*   **Runtime:** Node.js / Edge Runtime compatible

### Key Architectural Decisions

1.  **Server Actions over API Routes:**
    Instead of maintaining a separate REST API or GraphQL layer, the application uses Next.js Server Actions. This allows for type-safe, direct function calls from the client to the server, reducing serialization overhead and simplifying the mental model for data mutation.

2.  **Raw SQL for Performance:**
    We utilize `@neondatabase/serverless` to execute raw SQL queries. By bypassing heavyweight ORMs (like Prisma or TypeORM), we achieve sub-millisecond query construction times and maintain absolute control over the execution plan, essential for high-concurrency scenarios (e.g., thousands of students logging in simultaneously for an exam).

3.  **Edge-Ready Authentication:**
    The authentication system is custom-built to be stateless and compatible with Edge networks. It utilizes encrypted, HTTP-only cookies for session management, ensuring secure access without creating bottlenecks on a central authentication server.

---

## 2. Core Modules & Engineering

### 2.1. Professional Video Streaming Engine
The platform does not rely on standard progressive downloading (MP4). Instead, it implements a broadcast-grade **HTTP Live Streaming (HLS)** pipeline powered by Bunny.net.

*   **Adaptive Bitrate Streaming (ABR):** The player automatically switches between quality ladders (360p, 480p, 720p, 1080p) based on the user's continuously monitored bandwidth.
*   **Dynamic Watermarking:** To prevent intellectual property theft and screen recording, the system injects the authenticated user's identity (Name/ID) as a floating, semi-transparent layer over the video canvas.
*   **Signed URLs:** Access tokens are generated on-the-fly with short expiration times (TTL), ensuring that video segments cannot be hotlinked or shared outside the platform context.

### 2.2. Real-Time Interactive Classroom
Live sessions are engineered using **LiveKit**, a scalable WebRTC infrastructure.

*   **Unified Topology:** Unlike P2P approaches which fail at scale, this system uses a Selective Forwarding Unit (SFU) architecture. Clients send a single stream to the server, which then distributes it to subscribers, allowing for hundreds of participants with minimal bandwidth usage.
*   **Adaptive Simulcast:** The publisher's video is encoded in multiple layers. Viewers with poor connections retrieve the low-bitrate layer automatically, preserving the session stability.
*   **Features:** Low-latency screen sharing, participant moderation, and ephemeral chat channels.

### 2.3. Commerce & Access Control System
Access to content is governed by a **Tokenized Voucher System**, designed for markets where credit card penetration may be low or where physical distribution is preferred.

*   **Atomic Code Generation:** The admin dashboard allows for bulk generation of unique, cryptographically random access codes.
*   **Printable Asset Pipeline:** The system includes a rendering engine that dynamically generates high-resolution, printable A4 sheets containing QR codes and access instructions directly in the browser.
*   **Concurrency Control:** Database transactions ensure that a code can only be redeemed exactly once, preventing race conditions during high-volume enrollment periods.

### 2.4. Advanced Security Layer
*   **Session Fingerprinting:** Each session is bound to a specific `device_id` and fingerprint. The system actively monitors for "account sharing" behaviors. If a single account attempts simultaneous streams from disparate locations, defensive measures are triggered.
*   **Rate Limiting:** Critical mutations (login, code redemption) are protected by rate limiters to mitigate brute-force attacks.

### 2.5. Server-Driven UI & Theming
The User Interface is not static; it is driven by server-side configuration.

*   **Dynamic Backgrounds:** The application features a controllable atmospheric theme engine (e.g., Winter/Snow effects). This is managed via a database logic flag (`snow_enabled`). When toggled by an admin, the `revalidatePath` mechanism purges the Edge Cache, instantly propagating the visual state change to all connected clients without requiring a deployment.
*   **3D Integration:** The landing page utilizes `Three.js` (via `@react-three/fiber`) to render interactive 3D elements, optimized to run outside the main React render loop to prevent frame drops on lower-end devices.

---

## 3. Database Schema Philosophy

The database design favors **Normalisation** and **Referential Integrity**.
*   **`users`:** The central entity (Students & Teachers).
*   **`packages`:** Logic containers for educational content (Months, Units, Courses).
*   **`videos`:** Content assets linked to packages.
*   **`enrollments`:** The association table linking Users to Packages (Many-to-Many).
*   **`codes`:** The currency mechanism for creating Enrollments.

Indexes are heavily utilized on `foreign_keys` (e.g., `user_id`, `package_id`) to ensure `JOIN` operations remain performant as the dataset grows into the millions.

---

## 4. Operational Workflow

For developers looking to extend this architecture:

1.  **Environment Configuration:**
    The application requires accurate configuration of `POSTGRES_URL`, `BUNNY_API_KEY`, `LIVEKIT_*` credentials, and `BLOB_READ_WRITE_TOKEN` in the `.env` file.

2.  **Deployment Strategy:**
    The implementation is optimised for Vercel. Push events trigger a build pipeline that:
    *   Compiles TypeScript.
    *   Optimizes static assets.
    *   Generates Serverless Functions for dynamic routes.
    *   Deploys Edge Middleware for routing and auth checks.

---

*This documentation reflects the current production architecture designed by omarabovli.*
