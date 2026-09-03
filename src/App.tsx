import { BrowserRouter, Routes, Route } from "react-router";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Fields from "./pages/Fields";
import Workers from "./pages/Workers";
import Inventory from "./pages/Inventory";
import Sensors from "./pages/Sensors";
import Irrigation from "./pages/Irrigation";
import Alerts from "./pages/Alerts";
import Marketplace from "./pages/Marketplace";
import Analytics from "./pages/Analytics";
import CalendarPage from "./pages/Calendar";
import AiInsights from "./pages/AiInsights";
import SettingsPage from "./pages/SettingsPage";
import Help from "./pages/Help";
import Users from "./pages/Users";
import Team from "./pages/Team";
import NotFound from "./pages/NotFound";
import { RedirectIfNoRole } from "./components/RequireRole";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="fields" element={<Fields />} />
          <Route
            path="workers"
            element={
              <RedirectIfNoRole minRole="farm_manager">
                <Workers />
              </RedirectIfNoRole>
            }
          />
          <Route
            path="team"
            element={
              <RedirectIfNoRole minRole="farm_manager">
                <Team />
              </RedirectIfNoRole>
            }
          />
          <Route
            path="inventory"
            element={
              <RedirectIfNoRole minRole="farm_manager">
                <Inventory />
              </RedirectIfNoRole>
            }
          />
          <Route path="sensors" element={<Sensors />} />
          <Route path="irrigation" element={<Irrigation />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route
            path="analytics"
            element={
              <RedirectIfNoRole minRole="agronomist">
                <Analytics />
              </RedirectIfNoRole>
            }
          />
          <Route
            path="users"
            element={
              <RedirectIfNoRole minRole="admin">
                <Users />
              </RedirectIfNoRole>
            }
          />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="ai-insights" element={<AiInsights />} />
          <Route
            path="settings"
            element={
              <RedirectIfNoRole minRole="farm_manager">
                <SettingsPage />
              </RedirectIfNoRole>
            }
          />
          <Route path="help" element={<Help />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}