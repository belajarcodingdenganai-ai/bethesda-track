# TherapyOS - Therapy Attendance & Session Tracking System

A modern, enterprise-grade web application for managing therapy centers, ABA programs, and special education schools. Built with Next.js 14, PostgreSQL, and Prisma.

## 🎯 Features Implemented

### ✅ Phase 1-4: Database & Core System
- [x] **Complete Database Schema** - Students, Teachers, Programs, Packages, Attendance, Notifications
- [x] **QR Code System** - Unique QR codes for students and teachers
- [x] **Attendance Tracking** - Check-in/checkout with automatic session decrements
- [x] **Session Management** - Auto-calculate therapy package status (ACTIVE, WARNING, COMPLETED)
- [x] **Teacher Hours** - Track work hours, overtime, and attendance
- [x] **Notification System** - Alerts for low credits and package completion

### ✅ Phase 5: Dashboard
- [x] **Real-time Stats Cards** - Total students, teachers, daily attendance, attendance rate
- [x] **Low Credit Alerts** - Sidebar showing packages near completion
- [x] **Recent Attendance Table** - Live attendance records with filtering
- [x] **Responsive Design** - Mobile-first layout

### ✅ Phase 6-7: Pages & UI
- [x] **Student Management Page** - List all students with search and filtering
- [x] **Student Detail Page** - Complete student profile with sessions, attendance history
- [x] **Teacher Management Page** - Teacher cards with work hours and overtime tracking
- [x] **QR Scanner Page** - Live camera scanning with instructions
- [x] **Sidebar Navigation** - Clean navigation between pages

### ✅ API Routes
- [x] `GET /api/students` - List students with pagination
- [x] `POST /api/students` - Create new student
- [x] `GET /api/students/[id]` - Get student details
- [x] `PUT /api/students/[id]` - Update student
- [x] `DELETE /api/students/[id]` - Delete student
- [x] `GET /api/teachers` - List teachers

### ✅ Server Actions
- [x] `processAttendance()` - Handle QR scan with transaction
- [x] `scanStudentQR()` - Student attendance scanning
- [x] `teacherCheckIn()` - Teacher check-in
- [x] `teacherCheckOut()` - Teacher check-out with hour calculation
- [x] `getDashboardStats()` - Real-time dashboard data
- [x] `getStudentDetails()` - Student profile data
- [x] `getAttendanceHistory()` - Filtered attendance records

## 🚀 Tech Stack

- **Frontend**: Next.js 14, TypeScript, React 18, Tailwind CSS
- **Backend**: Next.js Server Actions, Node.js
- **Database**: PostgreSQL with Prisma ORM
- **QR Code**: html5-qrcode library
- **UI Components**: Shadcn UI, Lucide Icons
- **Notifications**: Sonner (toast library)
- **Date Handling**: date-fns

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+
- npm or yarn

### Setup Steps

1. **Clone and install dependencies**
```bash
cd /Users/deny/Documents/BethesdaTrack
npm install
```

2. **Configure environment**
```bash
# Edit .env with your PostgreSQL connection
DATABASE_URL="postgresql://user:password@localhost:5432/bethesda_db"
```

3. **Initialize an empty production-ready database**
```bash
npm run db:deploy
```

This creates the tables only. It does not insert demo students, teachers, parents, packages, or attendance records. The app is ready to be filled from the UI after this step.

Optional local demo data:
```bash
npm run seed
```

4. **Run development server**
```bash
npm run dev
```

Visit `http://localhost:3000`

## 📊 Database Schema

### Key Models

**Student**
- Identity fields: name, nickname, gender, DOB, age
- Contact: address, parentPhone, parentEmail
- Medical: diagnosis, school
- System: qrCode (unique), status, registrationNo

**Teacher**
- Profile: teacherId (unique), division, position, phone
- Tracking: checkInTime, checkOutTime, totalHours, overtime
- System: qrCode (unique), relatedUser

**TherapyPackage**
- Details: frequency (per week), totalSessions, usedSessions
- Status: ACTIVE, WARNING, COMPLETED
- Dates: startDate, endDate

**Attendance**
- Records: studentId, teacherId, programId, checkIn, checkOut
- Details: room, status (PRESENT, ABSENT, LATE, EXCUSED)
- Package tracking: packageId, duration

**Program**
- Types: ABA, SI, SPEECH, OT, ACADEMIC
- Relations: used by students and packages

## 🎮 Usage

### For Administrators

1. **Dashboard** - Overview of all systems
   - View total students, teachers, daily attendance
   - See packages approaching expiration
   - Monitor attendance trends

2. **Student Management**
   - Create/edit/delete students
   - Assign programs and packages
   - View complete student history

3. **Teacher Management**
   - Create/edit teacher profiles
   - Track working hours and overtime
   - Monitor attendance patterns

### For Teachers

1. **QR Scanner**
   - Scan student QR codes for check-in
   - Scan own QR code for time tracking
   - Automatic session decrements

2. **Attendance Tracking**
   - View student schedules
   - Record attendance with status
   - Access attendance history

### For Parents

- View child's attendance records
- Monitor remaining therapy sessions
- See therapy history

## 🔄 Workflow Example

1. **Student Check-in**
   - Teacher scans student QR code
   - System verifies student and active package
   - Records attendance and decrements session
   - Creates notification if package low/complete

2. **Session Tracking**
   - Automatic decrement on each scan
   - Status updates: ACTIVE → WARNING → COMPLETED
   - Notifications trigger at critical points

3. **Teacher Hours**
   - Teacher scans own QR code to check in
   - Scans again to check out
   - System calculates hours and overtime automatically

## 📱 API Documentation

### Attendance Scanning
```typescript
// Server Action
await processAttendance(qrCode: string, teacherId: string)
// Returns: { success, name, type, time, used, total, status }
```

### Dashboard Data
```typescript
// Server Action
await getDashboardStats()
// Returns: { totalStudents, totalTeachers, todayAttendance, ... }
```

### Student Management
```typescript
// API Routes
GET    /api/students                  // List all
POST   /api/students                  // Create
GET    /api/students/[id]             // Details
PUT    /api/students/[id]             // Update
DELETE /api/students/[id]             // Delete
```

## 🎨 UI/UX Features

- **Modern Design** - Clean, minimal interface inspired by Notion, Linear
- **Dark Mode** - Automatic theme support
- **Responsive** - Mobile, tablet, desktop optimized
- **Real-time Updates** - Instant feedback on actions
- **Smooth Animations** - Professional transitions
- **Error Handling** - User-friendly error messages
- **Loading States** - Clear loading indicators

## 📈 Planned Features (Phase 8-13)

### Phase 8-9: Advanced Features
- [ ] Student administration dashboard
- [ ] Bulk student import/export
- [ ] Therapy package management
- [ ] Program customization
- [ ] Advanced filtering and search

### Phase 10-11: Notifications & Alerts
- [ ] Email notifications
- [ ] WhatsApp integration
- [ ] In-app notifications center
- [ ] Custom alert thresholds

### Phase 12: Analytics & Reports
- [ ] Attendance analytics
- [ ] Revenue dashboard
- [ ] Teacher performance metrics
- [ ] Monthly reports generation
- [ ] PDF export capabilities

### Phase 13: Bonus Features
- [ ] Face recognition check-in
- [ ] NFC card support
- [ ] Geofence-based check-in
- [ ] AI attendance prediction
- [ ] Parent mobile app
- [ ] Advanced scheduling

## 🔐 Security Features

- Role-based access control (RBAC)
- Secure QR code validation
- Transaction integrity for attendance
- Data validation and sanitization
- Environment variable management

## 📝 Development Notes

- All database queries use Prisma ORM for type safety
- Server Actions handle all data mutations with transactions
- API routes support both REST and streaming
- Error handling includes proper HTTP status codes
- Middleware for request validation (to be added)

## 🤝 Contributing

When adding new features:
1. Update database schema if needed
2. Create corresponding API routes
3. Build UI components
4. Add error handling
5. Update documentation

## 📞 Support

For issues or questions:
- Check database schema in `prisma/schema.prisma`
- Review server actions in `app/actions/attendance.ts`
- Check API routes in `app/api/`

---

**Version**: 0.1.0  
**Last Updated**: May 31, 2026  
**Status**: 🟢 Development Phase - Core features complete, ready for testing
# bethesda-track
# bethesda-track
