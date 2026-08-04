import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import DashboardLayout from "./components/DashboardLayout";
import Projects from "./pages/Projects";
import Scans from "./pages/Scans";
import Vulnerabilities from "./pages/Vulnerabilities";
import AI from "./pages/AI";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Activity from "./pages/Activity";
import Settings from "./pages/Settings";
import LinkScanner from "./pages/LinkScanner";
import SqlmapTester from "./pages/SqlmapTester";
import ReconScanner from "./pages/ReconScanner";
import FileDiscovery from "./pages/FileDiscovery";
import SubdomainScanner from "./pages/SubdomainScanner";
import CodeScanner from "./pages/CodeScanner";
import Subscription from "./pages/Subscription";
import Verify from "./pages/Verify";
import Organization from "./pages/Organization";
import SubscriptionSuccess from "./pages/SubscriptionSuccess";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import About from "./pages/About";
import AppScanner from "./pages/AppScanner";


function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* صفحات عامة */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* صفحات محمية داخل هيكل المنصة */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/scans" element={<Scans />} />
          <Route path="/link-scanner" element={<LinkScanner />} />
          <Route path="sqlmap-tester" element={<SqlmapTester />} />
          <Route path="app-scanner" element={<AppScanner />} />
          <Route path="/vulnerabilities" element={<Vulnerabilities />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/users" element={<Users />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="recon" element={<ReconScanner />} />
          <Route path="file-discovery" element={<FileDiscovery />} />
          <Route path="subdomains" element={<SubdomainScanner />} />
          <Route path="code-scanner" element={<CodeScanner />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="about" element={<About />} />
          <Route path="/verify/:token" element={<Verify />} />
          <Route path="organization" element={<Organization />} />
          <Route path="subscription/success" element={<SubscriptionSuccess />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;