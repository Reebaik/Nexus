
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RegisterPage from './pages/RegisterPage';
import Navbar from './components/Navbar';
import CreateProjectPage from './pages/CreateProjectPage';
import MyProjectsPage from './pages/MyProjectsPage';
import ProjectLayout from './pages/ProjectLayout';
import ProjectOverviewPageNew from './pages/ProjectOverviewPageNew';
import ProjectFoundationsPage from './pages/ProjectFoundationsPage';
import ProjectPlanningPage from './pages/ProjectPlanningPage';
import ProjectExecutionPage from './pages/ProjectExecutionPage';
import ProjectTrackingPage from './pages/ProjectTrackingPage';
import ProjectInsightsPage from './pages/ProjectInsightsPage';
import IntegrationsGithubConnected from './pages/IntegrationsGithubConnected';
import { UserProvider } from './contexts/UserContext';
import { SocketProvider } from './contexts/SocketContext';
import './App.css';





function App() {
  return (
    <UserProvider>
      <SocketProvider>
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
          <Navbar />
          <div style={{ flex: 1, marginTop: 70 }}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/create-project" element={<CreateProjectPage />} />
              <Route path="/integrations/github/connected" element={<IntegrationsGithubConnected />} />
              <Route path="/projects" element={<MyProjectsPage />} />
              <Route path="/projects/:id" element={<ProjectLayout />}>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<ProjectOverviewPageNew />} />
                <Route path="foundations" element={<ProjectFoundationsPage />} />
                <Route path="planning" element={<ProjectPlanningPage />} />
                <Route path="execution" element={<ProjectExecutionPage />} />
                <Route path="tracking" element={<ProjectTrackingPage />} />
                <Route path="insights" element={<ProjectInsightsPage />} />
              </Route>
              {/* Add more routes here later */}
            </Routes>
          </div>
        </div>
      </SocketProvider>
    </UserProvider>
  );
}

export default App;
