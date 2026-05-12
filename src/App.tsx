import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import { isAuthenticated, getAuthRole } from "@/lib/store";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import AttendanceUpload from "./pages/AttendanceUpload";
import LeaveTracker from "./pages/LeaveTracker";
import BonusManagement from "./pages/BonusManagement";
import PayrollExport from "./pages/PayrollExport";
import AdminManagement from "./pages/AdminManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  if (!isAuthenticated()) return <Navigate to="/" replace />;
  if (allowedRoles) {
    const role = getAuthRole();
    if (!role || !allowedRoles.includes(role)) return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/attendance" element={<AttendanceUpload />} />
            <Route path="/leaves" element={<LeaveTracker />} />
            <Route path="/bonus" element={<BonusManagement />} />
            <Route path="/payroll" element={<PayrollExport />} />
            <Route path="/admin-management" element={<ProtectedRoute allowedRoles={["root"]}><AdminManagement /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
