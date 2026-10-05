import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminOrganizations from "./pages/AdminOrganizations";
import AdminSubscriptions from "./pages/AdminSubscriptions";
import AdminActivity from "./pages/AdminActivity";
import AdminScans from "./pages/AdminScans";
import AdminSettings from "./pages/AdminSettings";
import AdminAnnouncements from "./pages/AdminAnnouncements";
import AdminServer from "./pages/AdminServer";
import AdminApiKeys from "./pages/AdminApiKeys";
import AdminAnalytics from "./pages/AdminAnalytics";
<Route path="/analytics" element={<AdminAnalytics />} />

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/dashboard" element={<AdminDashboard />} />
        <Route path="/users" element={<AdminUsers />} />
        <Route path="/organizations" element={<AdminOrganizations />} />
        <Route path="/subscriptions" element={<AdminSubscriptions />} />
        <Route path="/activity" element={<AdminActivity />} />
        <Route path="/scans" element={<AdminScans />} />
        <Route path="/settings" element={<AdminSettings />} />
        <Route path="/announcements" element={<AdminAnnouncements />} />
        <Route path="/server" element={<AdminServer />} />
        <Route path="/api-keys" element={<AdminApiKeys />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;