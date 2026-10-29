# TaskFlow — Student Task & Assignment Manager

TaskFlow is a modern, full-stack MERN application built specifically for colleges and universities to manage coursework, track assignment deadlines, and monitor semester progress with comprehensive Role-Based Access Control (RBAC) and multi-tier assignment scopes.

---

## 1. Features Overview

- **Three Assignment Scopes**:
  - **Institution-wide assignments**: Published by an instructor or administrator; instantly visible to all enrolled students with completely independent completion progress. Completing an assignment as one student never affects another student's status.
  - **Individual assignments**: Targeted coursework assigned by faculty to a specific student; visible only to that student and authorized administrators.
  - **Personal assignments**: Private tasks created by a student for personal study and task tracking; visible and editable exclusively by that student.

- **Independent Progress Decoupling**:
  - Assignment definitions (`Assignment`) are decoupled from student completion records (`AssignmentProgress`).
  - No redundant document duplication for shared coursework.
  - Students registering later automatically see applicable institution-wide assignments with an independent `Pending` status.
  - Compound unique indexes prevent duplicate progress records.

- **Personalized Student Dashboard & Real-Time Statistics**:
  - Live statistics calculated strictly from the student's applicable assignments: Total, Pending, In Progress, Completed, Overdue, and Upcoming assignments.
  - Semester completion percentage progress bar based on actual student progress.
  - Dynamic deadline countdown badges (`Due tomorrow`, `Due in 3 days`, `Overdue by 2 days`).
  - Recent activity feed with quick one-click completion toggles.

- **Search, Filter & Sorting**:
  - Instant live keyword search on assignment titles and subjects.
  - Multi-criteria filtering by Subject, Status (including an `Overdue only` filter), Priority, and Assignment Type.
  - Flexible sorting: Earliest Due Date, Latest Due Date, Alphabetical Title (A-Z), and Recently Created.

- **Institutional Administration Console**:
  - **Scope Selector**: Switch between "All Students (Institution-wide)" and "Individual Student".
  - **Target Student Selector**: Dynamically appears when assigning individual coursework.
  - **Student Directory**: Inspect enrollment, active workload metrics, and completion rates per student.
  - **Full Coursework Oversight**: Create, view, edit, or delete institutional assignments.

---

## 2. Technology Stack

- **Frontend**:
  - React 18 with Vite
  - Tailwind CSS 3
  - React Router 6 (Declarative client routing & protected routes)
  - Lucide React (Icons)
- **Backend**:
  - Node.js & Express.js
  - Mongoose 8 (MongoDB object modeling)
  - JSON Web Tokens (`jsonwebtoken`)
  - `bcryptjs` for cryptographic password hashing
  - `cors` & `dotenv`
- **Database**:
  - MongoDB (Local community instance on `mongodb://127.0.0.1:27017/taskflow` or MongoDB Atlas)

---

## 3. Database Schema Design (MongoDB & Mongoose)

```text
               ┌───────────────────────┐
               │         User          │
               │───────────────────────│
               │ _id                   │
               │ name, email, password │
               │ role: student | admin │
               └──────────┬────────────┘
                          │
         ┌────────────────┴────────────────┐
         │ 1:N                             │ 1:N
         ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│       Assignment        │       │   AssignmentProgress    │
│─────────────────────────│       │─────────────────────────│
│ _id                     │◀──────│ assignment (ObjectId)   │
│ title, subject, desc    │  1:N  │ student (ObjectId)      │
│ dueDate, priority       │       │ status: Pending |       │
│ scope: all | individual │       │   In Progress |         │
│        | personal       │       │   Completed             │
│ createdBy (ref: User)   │       │ completedAt (Date)      │
│ assignedTo (ref: User)  │       │ Unique: (assign,stud)   │
└─────────────────────────┘       └─────────────────────────┘
```

### Models:
1. **`Assignment`** (`server/models/Assignment.js`):
   - Stores the single canonical definition of an assignment.
   - `scope`: `'all'` (institution-wide), `'individual'` (assigned to one student), or `'personal'` (student private).
   - `createdBy`: ObjectId reference to `User`.
   - `assignedTo`: ObjectId reference to `User` (used for `'individual'` assignments).
2. **`AssignmentProgress`** (`server/models/AssignmentProgress.js`):
   - Stores each student's personal completion status.
   - `assignment`: ObjectId reference to `Assignment`.
   - `student`: ObjectId reference to `User`.
   - `status`: `'Pending'` | `'In Progress'` | `'Completed'`.
   - `completedAt`: Date timestamp when completed.
   - Compound index: `{ assignment: 1, student: 1 }` with `{ unique: true }`.

---

## 4. Migration Guide (Legacy Tasks to New Schema)

If you have existing task records in the MongoDB `tasks` collection, TaskFlow includes an **idempotent, non-destructive migration script**:

```bash
cd server
npm run migrate:assignments
```

**Safety Guarantees**:
- **Non-destructive**: Leaves the legacy `tasks` collection completely untouched.
- **Idempotent**: Safely skips already-migrated documents without creating duplicates.
- **ID Preservation**: Preserves the exact same MongoDB `_id` for every task.
- **Progress Decoupling**: Generates corresponding student progress records with existing completion states.

---

## 5. Quick Start Instructions (Windows PowerShell)

### Step 5.1: Install Dependencies
```powershell
# From the project root:
npm run install:all
```

### Step 5.2: Configure Environment Variables

> [!CAUTION]
> **Keep real `.env` files out of source control and project ZIP archives!**
> Never share or commit production credentials or hard-coded secrets. Use `server/.env.example` as a template and provide your own unique values.

Copy `server/.env.example` to `server/.env` if not already present:
```powershell
cd server
cp .env.example .env
```

Generate a cryptographically secure random 32-byte JWT secret:
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Configure `server/.env` with your unique secrets and database URIs:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/taskflow
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/taskflow_test
JWT_SECRET=<YOUR_GENERATED_32_BYTE_HEX_SECRET>
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173

ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@taskflow.edu
ADMIN_PASSWORD=<YOUR_STRONG_ADMIN_PASSWORD>
```

> [!NOTE]
> `TEST_MONGODB_URI` points to a dedicated test database (e.g., `taskflow_test`). Automated test suites require an isolated database and will safely refuse to execute against your primary development or production database.

### Step 5.3: Run Database Migration (if upgrading existing database)
```powershell
cd server
npm run migrate:assignments
```

### Step 5.4: Start the Applications

#### Option A: Run concurrently from root
```powershell
npm run dev
```

#### Option B: Run in separate terminals
**Terminal 1 (Backend Server):**
```powershell
cd server
npm run dev
```
*(Runs at `http://localhost:5000` — Health Check: `http://localhost:5000/api/health`)*

**Terminal 2 (Frontend Client):**
```powershell
cd client
npm run dev
```
*(Runs at `http://localhost:5173`)*

---

## 6. Administrator Account Setup

To initialize the administrator account configured in your `server/.env`:
```powershell
cd server
npm run seed:admin
```
- **Portal URL**: `http://localhost:5173/login`
- **Email**: Defined by `ADMIN_EMAIL` in `server/.env` (default: `admin@taskflow.edu`)
- **Password**: Defined by `ADMIN_PASSWORD` in `server/.env` (configured during Step 5.2)

*(The administrator role is granted exclusively during secure seed creation and cannot be escalated through the public student registration form).*

---

## 7. Automated Test Suites

### Suite 1: Assignment Visibility & Data Isolation (15 Tests)
```powershell
cd server
npm run test:visibility
```
Verifies:
1. Institution-wide assignment appears for two different students.
2. Both students initially have independent Pending statuses.
3. Completing as Student A does not change Student B's status.
4. Individual assignment appears only for its assigned student.
5. Other students cannot read or modify that individual assignment.
6. Personal assignment appears only for its owner.
7. Students cannot create institution-wide assignments.
8. Students cannot change scope, creator, or owner of admin assignments.
9. Students cannot delete admin assignment definitions.
10. Unauthenticated requests are rejected with HTTP 401.
11. Authenticated students are blocked from admin APIs with HTTP 403.
12. Admins can publish assignments to all students and assign work to a selected student.
13. Students registering later can see applicable institution-wide assignments.
14. Compound unique index prevents duplicate progress records.
15. Existing assignments remain accessible.

### Suite 2: Role-Based Access Control (RBAC)
```powershell
cd server
npm run test:rbac
```

### Suite 3: Backend Module Validation
```powershell
cd server
npm run test
```

### Suite 4: Frontend Production Build
```powershell
cd client
npm run build
```
*(Compiled with Vite into `client/dist/` with 0 errors).*
