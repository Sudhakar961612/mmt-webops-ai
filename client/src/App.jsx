import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Users from './pages/Users.jsx';
import SystemHealth from './pages/SystemHealth.jsx';
import Tasks from './pages/Tasks.jsx';
import TaskDetail from './pages/TaskDetail.jsx';
import NewTask from './pages/NewTask.jsx';
import Approvals from './pages/Approvals.jsx';
import Schedules from './pages/Schedules.jsx';
import Runs from './pages/Runs.jsx';
import RunDetail from './pages/RunDetail.jsx';
import ExtractedData from './pages/ExtractedData.jsx';
import Insights from './pages/Insights.jsx';
import Feedback from './pages/Feedback.jsx';
import Sources from './pages/Sources.jsx';
import Templates from './pages/Templates.jsx';
import Schemas from './pages/Schemas.jsx';
import AuditLog from './pages/AuditLog.jsx';
import DemoPages from './pages/DemoPages.jsx';
import OpsLab from './pages/OpsLab.jsx';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/health" element={<SystemHealth />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/tasks/new" element={<NewTask />} />
          <Route path="/tasks/:id" element={<TaskDetail />} />
          <Route path="/approvals" element={<Approvals />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="/extracted" element={<ExtractedData />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/schemas" element={<Schemas />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="/demo" element={<DemoPages />} />
          <Route path="/ops" element={<OpsLab />} />
        </Route>
        <Route path="*" element={<Login />} />
      </Routes>
    </ToastProvider>
  );
}
