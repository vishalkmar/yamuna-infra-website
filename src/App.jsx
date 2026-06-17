import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './context/AuthContext';
import Protected from './components/Protected';
import AdminLayout, { MODULES } from './layouts/AdminLayout';
import Login from './pages/auth/Login';
import UsersList from './pages/users/UsersList';
import UserDetail from './pages/users/UserDetail';
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
import Announcements from './pages/community/Announcements';
import CommunityEvents from './pages/community/Events';
import Visitors from './pages/community/Visitors';
import Offers from './pages/rewards/Offers';
import Redemptions from './pages/rewards/Redemptions';
import Projects from './pages/rewards/Projects';
import Referrals from './pages/rewards/Referrals';
import Notifications from './pages/notifications/Notifications';
import Dashboard from './pages/dashboard/Dashboard';
import Payments from './pages/payments/Payments';
import Media from './pages/media/Media';
import Settings from './pages/settings/Settings';
import DailyContent from './pages/settings/DailyContent';
import ReminderCategories from './pages/settings/ReminderCategories';
import AuditLog from './pages/audit/AuditLog';
import Admins from './pages/audit/Admins';
import Ai from './pages/ai/Ai';

// Modules with real pages now (excluded from the ComingSoon fallback).
const BUILT = ['/users', '/services', '/food', '/temples', '/transport', '/amenities', '/healthcare', '/wellness', '/mobility', '/community', '/rewards', '/notifications', '/payments', '/media', '/settings', '/audit', '/ai'];

function ComingSoon() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
      <div className="text-4xl mb-3">🚧</div>
      <h2 className="text-lg font-bold text-slate-800">Module not built yet</h2>
      <p className="text-slate-500 mt-1">Implement this module following the documentation PDF + contextadmin.md.</p>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
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
            <Route path="/community" element={<Announcements />} />
            <Route path="/community/events" element={<CommunityEvents />} />
            <Route path="/community/visitors" element={<Visitors />} />

            {/* A13 — Rewards & Projects */}
            <Route path="/rewards" element={<Offers />} />
            <Route path="/rewards/redemptions" element={<Redemptions />} />
            <Route path="/rewards/projects" element={<Projects />} />
            <Route path="/rewards/referrals" element={<Referrals />} />

            {/* A14 — Notifications & Broadcast */}
            <Route path="/notifications" element={<Notifications />} />

            {/* A16 — Payments & Reports */}
            <Route path="/payments" element={<Payments />} />

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
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}
