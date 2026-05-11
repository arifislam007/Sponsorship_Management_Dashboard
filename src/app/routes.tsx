import { createBrowserRouter } from "react-router";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./components/Login";
import { RootLayout } from "./components/RootLayout";
import { Home } from "./components/Home";
import { StudentProfile } from "./components/StudentProfile";
import { Dashboard } from "./components/Dashboard";
import { Students } from "./components/Students";
import { Donors } from "./components/Donors";
import { Sponsorships } from "./components/Sponsorships";
import { AcknowledgmentLetter } from "./components/AcknowledgmentLetter";
import { Admin } from "./components/Admin";
import { LeaveManagement } from "./components/LeaveManagement";
import { ICT } from "./components/ICT";
import { Navigate } from "react-router";
import { useAuth } from "./contexts/AuthContext";

function DashboardLanding() {
  const { hasRole } = useAuth();

  if (hasRole('admin')) {
    return <Dashboard />;
  }

  return <Navigate to="/dashboard/leaves" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/student/:id",
    Component: StudentProfile,
  },
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/dashboard",
    Component: RootLayout,
    children: [
      { index: true, Component: DashboardLanding },
      { path: "students", Component: () => (
        <ProtectedRoute requiredModule="Students">
          <Students />
        </ProtectedRoute>
      ) },
      { path: "donors", Component: () => (
        <ProtectedRoute requiredModule="Donors">
          <Donors />
        </ProtectedRoute>
      ) },
      { path: "sponsorships", Component: () => (
        <ProtectedRoute requiredModule="Sponsorships">
          <Sponsorships />
        </ProtectedRoute>
      ) },
      { path: "acknowledgment-letter", Component: () => (
        <ProtectedRoute requiredModule="Export">
          <AcknowledgmentLetter />
        </ProtectedRoute>
      ) },
      { path: "leaves", Component: () => (
        <ProtectedRoute requiredModule="Leave Management">
          <LeaveManagement />
        </ProtectedRoute>
      ) },
      { path: "ict", Component: () => (
        <ProtectedRoute requiredModule="ICT">
          <ICT />
        </ProtectedRoute>
      ) },
      { path: "settings", Component: () => (
        <ProtectedRoute requiredRole="admin">
          <Admin />
        </ProtectedRoute>
      ) },
    ],
  },
]);
