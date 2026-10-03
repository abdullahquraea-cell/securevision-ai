import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminOrganizations from "./pages/AdminOrganizations";
import AdminSubscriptions from "./pages/AdminSubscriptions";

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;