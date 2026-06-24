import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import { AgentAuthProvider } from './context/AgentAuthContext';
import Protected from './components/Protected';
import AgentProtected from './components/AgentProtected';
import AdminLayout, { MODULES } from './layouts/AdminLayout';
import AgentLayout from './layouts/AgentLayout';
import AgentLogin from './pages/agent/auth/AgentLogin';
import AgentRegister from './pages/agent/auth/AgentRegister';
import AgentDashboard from './pages/agent/AgentDashboard';
import AgentKyc from './pages/agent/AgentKyc';
import AgentBank from './pages/agent/AgentBank';
import AgentInventory from './pages/agent/AgentInventory';
import AgentLeads from './pages/agent/leads/AgentLeads';
import AgentPipeline from './pages/agent/leads/AgentPipeline';
import AgentTasks from './pages/agent/tasks/AgentTasks';
import AgentVisits from './pages/agent/visits/AgentVisits';
import AgentBookings from './pages/agent/bookings/AgentBookings';
import AgentEarnings from './pages/agent/earnings/AgentEarnings';
import AgentPayouts from './pages/agent/payouts/AgentPayouts';
import AgentTargets from './pages/agent/targets/AgentTargets';
import AgentLeaderboard from './pages/agent/leaderboard/AgentLeaderboard';
import AgentNotifications from './pages/agent/notifications/AgentNotifications';
import AgentCollateral from './pages/agent/resources/AgentCollateral';
import AgentTraining from './pages/agent/resources/AgentTraining';
import AgentNews from './pages/agent/news/AgentNews';
import AgentTickets from './pages/agent/support/AgentTickets';
import AgentAi from './pages/agent/ai/AgentAi';
import Login from './pages/auth/Login';
import UsersList from './pages/users/UsersList';
import UserDetail from './pages/users/UserDetail';
import AgentsList from './pages/agents/AgentsList';
import AgentDetail from './pages/agents/AgentDetail';
import AgentTiers from './pages/agents/AgentTiers';
import AmsDashboard from './pages/agents/AmsDashboard';
import Projects from './pages/agents/inventory/Projects';
import ProjectInventory from './pages/agents/inventory/ProjectInventory';
import Leads from './pages/agents/leads/Leads';
import Pipeline from './pages/agents/leads/Pipeline';
import Visits from './pages/agents/visits/Visits';
import Bookings from './pages/agents/bookings/Bookings';
import CommissionRules from './pages/agents/commission/CommissionRules';
import CommissionLedger from './pages/agents/commission/CommissionLedger';
import Payouts from './pages/agents/payouts/Payouts';
import Targets from './pages/agents/targets/Targets';
import LeaderboardPage from './pages/agents/leaderboard/LeaderboardPage';
import Analytics from './pages/agents/analytics/Analytics';
import AgentNotify from './pages/agents/notify/AgentNotify';
import Collateral from './pages/agents/resources/Collateral';
import Training from './pages/agents/resources/Training';
import Announcements from './pages/agents/news/Announcements';
import Tickets from './pages/agents/support/Tickets';
import Templates from './pages/agents/templates/Templates';
import Bi from './pages/agents/bi/Bi';
import AmsSettings from './pages/agents/settings/AmsSettings';
import ConstructionList from './pages/construction/ConstructionList';
import ConstructionManage from './pages/construction/ConstructionManage';
import PaymentPlanList from './pages/payments/PaymentPlanList';
import PaymentPlanManage from './pages/payments/PaymentPlanManage';
import SosEmergency from './pages/sos/SosEmergency';
import BookingDockets from './pages/documents/BookingDockets';
import SiteOverview from './pages/site/SiteOverview';
import ServiceCategories from './pages/services/Categories';
import ServiceProviders from './pages/services/Providers';
import ServiceOfferings from './pages/services/Offerings';
import ServiceBookings from './pages/services/Bookings';
import FoodCategories from './pages/food/Categories';
import FoodItems from './pages/food/Items';
import FoodOrders from './pages/food/Orders';
import FoodTiffin from './pages/food/Tiffin';
import TiffinPlans from './pages/food/TiffinPlans';
import Temples from './pages/temples/Temples';
import TempleFestivals from './pages/temples/Festivals';
import DarshanBookings from './pages/temples/DarshanBookings';
import Vehicles from './pages/transport/Vehicles';
import TransportPlaces from './pages/transport/Places';
import FareRules from './pages/transport/FareRules';
import Rides from './pages/transport/Rides';
import Facilities from './pages/amenities/Facilities';
import AmenityCategories from './pages/amenities/Categories';
import Blackouts from './pages/amenities/Blackouts';
import AmenityBookings from './pages/amenities/Bookings';
import Doctors from './pages/healthcare/Doctors';
import Specialties from './pages/healthcare/Specialties';
import Appointments from './pages/healthcare/Appointments';
import MedicineOrders from './pages/healthcare/MedicineOrders';
import WellnessCategories from './pages/wellness/Categories';
import WellnessActivities from './pages/wellness/Activities';
import Spiritual from './pages/wellness/Spiritual';
import WellnessBookings from './pages/wellness/Bookings';
import Equipment from './pages/mobility/Equipment';
import MobilityCategories from './pages/mobility/Categories';
import MobilityRequests from './pages/mobility/Requests';
import CommunityAnnouncements from './pages/community/Announcements';
import CommunityEvents from './pages/community/Events';
import Visitors from './pages/community/Visitors';
import Offers from './pages/rewards/Offers';
import Redemptions from './pages/rewards/Redemptions';
import RewardProjects from './pages/rewards/Projects';
import Referrals from './pages/rewards/Referrals';
import Notifications from './pages/notifications/Notifications';
import Dashboard from './pages/dashboard/Dashboard';
import Media from './pages/media/Media';
import Settings from './pages/settings/Settings';
import DailyContent from './pages/settings/DailyContent';
import ReminderCategories from './pages/settings/ReminderCategories';
import AuditLog from './pages/audit/AuditLog';
import Admins from './pages/audit/Admins';
import Ai from './pages/ai/Ai';

// Modules with real pages now (excluded from the ComingSoon fallback).
const BUILT = ['/users', '/agents', '/agents/dashboard', '/agents/inventory', '/agents/leads', '/agents/pipeline', '/agents/visits', '/agents/bookings', '/agents/commission', '/agents/payouts', '/agents/targets', '/agents/leaderboard', '/agents/analytics', '/agents/notify', '/agents/collateral', '/agents/training', '/agents/news', '/agents/support', '/agents/templates', '/agents/bi', '/agents/settings', '/construction', '/payment-plan', '/sos', '/dockets', '/site', '/services', '/food', '/temples', '/transport', '/amenities', '/healthcare', '/wellness', '/mobility', '/community', '/rewards', '/notifications', '/media', '/settings', '/audit', '/ai'];

function ComingSoon() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
      <div className="text-4xl mb-3">🚧</div>
      <h2 className="text-lg font-bold text-slate-800">Module not built yet</h2>
      <p className="text-slate-500 mt-1">Implement this module following the documentation PDF + contextadmin.md.</p>
    </div>
  );
}

// Auth-provider shells — scope each portal's auth context to its own route tree
// so admin and agent sessions stay fully isolated inside one app.
function AdminShell() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
function AgentShell() {
  return (
    <AgentAuthProvider>
      <Outlet />
    </AgentAuthProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* ===== Agent (Channel Partner) portal — separate auth domain ===== */}
        <Route element={<AgentShell />}>
          <Route path="/agent/login" element={<AgentLogin />} />
          <Route path="/agent/register" element={<AgentRegister />} />
          <Route
            path="/agent"
            element={
              <AgentProtected>
                <AgentLayout />
              </AgentProtected>
            }
          >
            <Route index element={<AgentDashboard />} />
            <Route path="kyc" element={<AgentKyc />} />
            <Route path="bank" element={<AgentBank />} />
            <Route path="inventory" element={<AgentInventory />} />
            <Route path="leads" element={<AgentLeads />} />
            <Route path="pipeline" element={<AgentPipeline />} />
            <Route path="tasks" element={<AgentTasks />} />
            <Route path="visits" element={<AgentVisits />} />
            <Route path="bookings" element={<AgentBookings />} />
            <Route path="earnings" element={<AgentEarnings />} />
            <Route path="payouts" element={<AgentPayouts />} />
            <Route path="targets" element={<AgentTargets />} />
            <Route path="leaderboard" element={<AgentLeaderboard />} />
            <Route path="notifications" element={<AgentNotifications />} />
            <Route path="collateral" element={<AgentCollateral />} />
            <Route path="training" element={<AgentTraining />} />
            <Route path="news" element={<AgentNews />} />
            <Route path="support" element={<AgentTickets />} />
            <Route path="ai" element={<AgentAi />} />
          </Route>
        </Route>

        {/* ===== Admin portal ===== */}
        <Route element={<AdminShell />}>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <Protected>
                <AdminLayout />
              </Protected>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* A3 — Users & Residents */}
            <Route path="/users" element={<UsersList />} />
            <Route path="/users/:id" element={<UserDetail />} />

            {/* AMS — Agents (CRM): directory, tiers, detail (1.2/1.4/1.5) */}
            <Route path="/agents/dashboard" element={<AmsDashboard />} />
            <Route path="/agents" element={<AgentsList />} />
            <Route path="/agents/tiers" element={<AgentTiers />} />
            {/* AMS — Inventory (2.1) — declared before /agents/:id so static wins */}
            <Route path="/agents/inventory" element={<Projects />} />
            <Route path="/agents/inventory/:projectId" element={<ProjectInventory />} />
            <Route path="/agents/leads" element={<Leads />} />
            <Route path="/agents/pipeline" element={<Pipeline />} />
            <Route path="/agents/visits" element={<Visits />} />
            <Route path="/agents/bookings" element={<Bookings />} />
            <Route path="/agents/commission" element={<CommissionRules />} />
            <Route path="/agents/commission/ledger" element={<CommissionLedger />} />
            <Route path="/agents/payouts" element={<Payouts />} />
            <Route path="/agents/targets" element={<Targets />} />
            <Route path="/agents/leaderboard" element={<LeaderboardPage />} />
            <Route path="/agents/analytics" element={<Analytics />} />
            <Route path="/agents/notify" element={<AgentNotify />} />
            <Route path="/agents/collateral" element={<Collateral />} />
            <Route path="/agents/training" element={<Training />} />
            <Route path="/agents/news" element={<Announcements />} />
            <Route path="/agents/support" element={<Tickets />} />
            <Route path="/agents/templates" element={<Templates />} />
            <Route path="/agents/bi" element={<Bi />} />
            <Route path="/agents/settings" element={<AmsSettings />} />
            <Route path="/agents/:id" element={<AgentDetail />} />

            {/* Construction System Management */}
            <Route path="/construction" element={<ConstructionList />} />
            <Route path="/construction/:propertyId" element={<ConstructionManage />} />

            {/* SOS & Emergency */}
            <Route path="/sos" element={<SosEmergency />} />

            {/* Booking Dockets */}
            <Route path="/dockets" element={<BookingDockets />} />

            {/* Site Overview */}
            <Route path="/site" element={<SiteOverview />} />

            {/* Payments & Plan (per-property) */}
            <Route path="/payment-plan" element={<PaymentPlanList />} />
            <Route path="/payment-plan/:propertyId" element={<PaymentPlanManage />} />

            {/* A4 — Services & Providers */}
            <Route path="/services" element={<ServiceCategories />} />
            <Route path="/services/bookings" element={<ServiceBookings />} />
            <Route path="/services/categories/:categoryId/providers" element={<ServiceProviders />} />
            <Route path="/services/providers/:providerId/offerings" element={<ServiceOfferings />} />

            {/* A5 — Food Ordering */}
            <Route path="/food" element={<FoodCategories />} />
            <Route path="/food/orders" element={<FoodOrders />} />
            <Route path="/food/tiffin" element={<TiffinPlans />} />
            <Route path="/food/tiffin/subscriptions" element={<FoodTiffin />} />
            <Route path="/food/categories/:categoryId/items" element={<FoodItems />} />

            {/* A9 — Temple Directory */}
            <Route path="/temples" element={<Temples />} />
            <Route path="/temples/darshan" element={<DarshanBookings />} />
            <Route path="/temples/:templeId/festivals" element={<TempleFestivals />} />

            {/* A10 — Transport (Cabs/Auto/Bus) */}
            <Route path="/transport" element={<Vehicles />} />
            <Route path="/transport/places" element={<TransportPlaces />} />
            <Route path="/transport/fares" element={<FareRules />} />
            <Route path="/transport/rides" element={<Rides />} />

            {/* A11 — Amenities & Clubhouse */}
            <Route path="/amenities" element={<Facilities />} />
            <Route path="/amenities/categories" element={<AmenityCategories />} />
            <Route path="/amenities/bookings" element={<AmenityBookings />} />
            <Route path="/amenities/:amenityId/blackouts" element={<Blackouts />} />

            {/* A6 — Doctors & Healthcare */}
            <Route path="/healthcare" element={<Doctors />} />
            <Route path="/healthcare/specialties" element={<Specialties />} />
            <Route path="/healthcare/appointments" element={<Appointments />} />
            <Route path="/healthcare/medicine" element={<MedicineOrders />} />

            {/* A8 — Wellness & Spiritual (categories → activities) */}
            <Route path="/wellness" element={<WellnessCategories />} />
            <Route path="/wellness/categories/:categoryId/activities" element={<WellnessActivities />} />
            <Route path="/wellness/spiritual" element={<Spiritual />} />
            <Route path="/wellness/bookings" element={<WellnessBookings />} />

            {/* A7 — Mobility Aids */}
            <Route path="/mobility" element={<Equipment />} />
            <Route path="/mobility/categories" element={<MobilityCategories />} />
            <Route path="/mobility/requests" element={<MobilityRequests />} />

            {/* A12 — Community & Visitors */}
            <Route path="/community" element={<CommunityAnnouncements />} />
            <Route path="/community/events" element={<CommunityEvents />} />
            <Route path="/community/visitors" element={<Visitors />} />

            {/* A13 — Rewards & Projects */}
            <Route path="/rewards" element={<Offers />} />
            <Route path="/rewards/redemptions" element={<Redemptions />} />
            <Route path="/rewards/projects" element={<RewardProjects />} />
            <Route path="/rewards/referrals" element={<Referrals />} />

            {/* A14 — Notifications & Broadcast */}
            <Route path="/notifications" element={<Notifications />} />

            {/* A17 — Media Library */}
            <Route path="/media" element={<Media />} />

            {/* A18 — App Settings & Content */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/daily" element={<DailyContent />} />
            <Route path="/settings/reminders" element={<ReminderCategories />} />

            {/* A19 — Audit Logs & Role Admin (superadmin) */}
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/audit/admins" element={<Admins />} />

            {/* A15 — AI Concierge (RAG) */}
            <Route path="/ai" element={<Ai />} />

            {MODULES.filter(m => m.path !== '/dashboard' && !BUILT.includes(m.path)).map(m => (
              <Route key={m.path} path={m.path} element={<ComingSoon />} />
            ))}
            <Route path="*" element={<ComingSoon />} />
          </Route>
        </Route>
      </Routes>
    </ToastProvider>
  );
}
