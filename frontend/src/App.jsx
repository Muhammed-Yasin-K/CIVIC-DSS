import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Reports from './pages/Reports';
import Alerts from './pages/Alerts';
import RecurringHotspots from './pages/RecurringHotspots';
import Inspections from './pages/Inspections';
import AdminInspections from './pages/AdminInspections';
import RiskForecast from './pages/RiskForecast';
import EventManagement from './pages/EventManagement';
import UserManagement from './pages/UserManagement';
import SystemConfig from './pages/SystemConfig';
import AuditLogs from './pages/AuditLogs';
import ModelConfiguration from './pages/ModelConfiguration';
import DataManagement from './pages/DataManagement';
import ZoneManagement from './pages/ZoneManagement';
import TaskManagement from './pages/TaskManagement';
import KnowledgeBase from './pages/KnowledgeBase';
import Helpdesk from './pages/Helpdesk';
import AdminSupport from './pages/AdminSupport';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/" element={<Dashboard />} />

            <Route path="/alerts" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Alerts />
              </ProtectedRoute>
            } />

            <Route path="/hotspots" element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <RecurringHotspots />
              </ProtectedRoute>
            } />

            <Route path="/inspections" element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <Inspections />
              </ProtectedRoute>
            } />

            <Route path="/forecast" element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <RiskForecast />
              </ProtectedRoute>
            } />

            {/* My Work Section - Officer Only */}

            <Route path="/tasks" element={
              <ProtectedRoute allowedRoles={['officer']}>
                <TaskManagement />
              </ProtectedRoute>
            } />


            {/* Resources Section - Officer Only */}
            <Route path="/knowledge-base" element={
              <ProtectedRoute allowedRoles={['officer']}>
                <KnowledgeBase />
              </ProtectedRoute>
            } />

            {/* Admin-Only Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin/model-config" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ModelConfiguration />
              </ProtectedRoute>
            } />


            <Route path="/admin/data-management" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DataManagement />
              </ProtectedRoute>
            } />

            <Route path="/admin/zones" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ZoneManagement />
              </ProtectedRoute>
            } />

            <Route path="/events" element={
              <ProtectedRoute allowedRoles={['admin', 'officer']}>
                <EventManagement />
              </ProtectedRoute>
            } />

            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            } />

            <Route path="/config" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SystemConfig />
              </ProtectedRoute>
            } />

            <Route path="/audit-logs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AuditLogs />
              </ProtectedRoute>
            } />

            <Route path="/admin/inspections" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminInspections />
              </ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Reports />
              </ProtectedRoute>
            } />

            <Route path="/helpdesk" element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <Helpdesk />
              </ProtectedRoute>
            } />

            <Route path="/admin/support" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminSupport />
              </ProtectedRoute>
            } />

            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={['officer', 'admin']}>
                <Profile />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
