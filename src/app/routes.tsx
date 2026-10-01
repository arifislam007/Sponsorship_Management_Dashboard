import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import { Loader } from "lucide-react";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RootLayout } from "./components/RootLayout";
import { Home } from "./components/Home";
import { useAuth } from "./contexts/AuthContext";
import { AttendancePanel } from "./components/AttendancePanel";

// `Home` (the "/" first-load page) and the small structural pieces above
// (RootLayout, ProtectedRoute, AttendancePanel) stay as regular eager
// imports — they're needed immediately and are not heavy. Every other page
// is lazy-loaded so visiting "/" no longer pulls in recharts, html2canvas,
// jspdf, xlsx, or any other route's code until that route is actually
// visited. Each lazily-loaded module re-exports a named export, so the
// dynamic import is mapped to the `default` shape React.lazy expects.
const Login = lazy(() => import("./components/Login").then(m => ({ default: m.Login })));
const StudentProfile = lazy(() => import("./components/StudentProfile").then(m => ({ default: m.StudentProfile })));
const Dashboard = lazy(() => import("./components/Dashboard").then(m => ({ default: m.Dashboard })));
const Students = lazy(() => import("./components/Students").then(m => ({ default: m.Students })));
const Donors = lazy(() => import("./components/Donors").then(m => ({ default: m.Donors })));
const Sponsorships = lazy(() => import("./components/Sponsorships").then(m => ({ default: m.Sponsorships })));
const AcknowledgmentLetter = lazy(() => import("./components/AcknowledgmentLetter").then(m => ({ default: m.AcknowledgmentLetter })));
const Admin = lazy(() => import("./components/Admin").then(m => ({ default: m.Admin })));
const LeaveManagement = lazy(() => import("./components/LeaveManagement").then(m => ({ default: m.LeaveManagement })));
const ICT = lazy(() => import("./components/ICT").then(m => ({ default: m.ICT })));
const Accounting = lazy(() => import("./components/Accounting").then(m => ({ default: m.Accounting })));
const Projects = lazy(() => import("./components/Projects").then(m => ({ default: m.Projects })));
const HR = lazy(() => import("./components/HR").then(m => ({ default: m.HR })));
const School = lazy(() => import("./components/School").then(m => ({ default: m.School })));
const LeadManagement = lazy(() => import("./components/LeadManagement").then(m => ({ default: m.LeadManagement })));
const PublicICTAdmission = lazy(() => import("./components/PublicICTAdmission").then(m => ({ default: m.PublicICTAdmission })));

function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader className="animate-spin text-[#14856E]" size={32} />
    </div>
  );
}

function DashboardLanding() {
  const { hasRole, user } = useAuth();

  if (hasRole('admin')) {
    return (
      <Suspense fallback={<RouteFallback />}>
        <Dashboard />
      </Suspense>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome, {user?.fullName}</h1>
        <p className="text-sm text-gray-500 mt-1">Sombhabona Foundation</p>
      </div>
      <div className="max-w-sm">
        <AttendancePanel />
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/student/:id",
    Component: () => (
      <Suspense fallback={<RouteFallback />}>
        <StudentProfile />
      </Suspense>
    ),
  },
  {
    path: "/login",
    Component: () => (
      <Suspense fallback={<RouteFallback />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: "/ict-admission",
    Component: () => (
      <Suspense fallback={<RouteFallback />}>
        <PublicICTAdmission />
      </Suspense>
    ),
  },
  {
    path: "/dashboard",
    Component: RootLayout,
    children: [
      { index: true, Component: DashboardLanding },
      { path: "students", Component: () => (
        <ProtectedRoute requiredModule="Students">
          <Suspense fallback={<RouteFallback />}><Students /></Suspense>
        </ProtectedRoute>
      ) },
      { path: "donors", Component: () => (
        <ProtectedRoute requiredModule="Donors">
          <Suspense fallback={<RouteFallback />}><Donors /></Suspense>
        </ProtectedRoute>
      ) },
      { path: "sponsorships", Component: () => (
        <ProtectedRoute requiredModule="Sponsorships">
          <Suspense fallback={<RouteFallback />}><Sponsorships /></Suspense>
        </ProtectedRoute>
      ) },
      { path: "acknowledgment-letter", Component: () => (
        <ProtectedRoute requiredModule="Export">
          <Suspense fallback={<RouteFallback />}><AcknowledgmentLetter /></Suspense>
        </ProtectedRoute>
      ) },
      { path: "leaves", Component: () => (
        <ProtectedRoute requiredModule="Leave Management">
          <Suspense fallback={<RouteFallback />}><LeaveManagement /></Suspense>
        </ProtectedRoute>
      ) },
      { path: "ict", Component: () => (
        <ProtectedRoute requiredModule="ICT">
          <Suspense fallback={<RouteFallback />}><ICT /></Suspense>
        </ProtectedRoute>
      ) },
      { path: "accounting", Component: () => (
        <ProtectedRoute requiredModule="Accounting">
          <Suspense fallback={<RouteFallback />}><Accounting /></Suspense>
        </ProtectedRoute>
      ) },
      { path: "projects", Component: () => (
        <ProtectedRoute requiredModule="Projects">
          <Suspense fallback={<RouteFallback />}><Projects /></Suspense>
        </ProtectedRoute>
      ) },
      { path: "hr", Component: () => (
        <ProtectedRoute requiredModule="HR">
          <Suspense fallback={<RouteFallback />}><HR /></Suspense>
        </ProtectedRoute>
      ) },
      { path: "school", Component: () => (
        <ProtectedRoute requiredModule="School">
          <Suspense fallback={<RouteFallback />}><School /></Suspense>
        </ProtectedRoute>
      ) },
      { path: "lead-management", Component: () => (
        <ProtectedRoute requiredModule="Lead Management">
          <Suspense fallback={<RouteFallback />}><LeadManagement /></Suspense>
        </ProtectedRoute>
      ) },
      { path: "settings", Component: () => (
        <ProtectedRoute requiredRole="admin">
          <Suspense fallback={<RouteFallback />}><Admin /></Suspense>
        </ProtectedRoute>
      ) },
    ],
  },
]);
