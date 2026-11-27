import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// Sub-navigation for each service module, rendered by AdminLayout above the
// page. "Dashboard" is first so each module opens on its live overview, with
// the existing management pages one click away.
export const MODULE_TABS = {
  '/payment-plan': [
    ['/payment-plan/dashboard', '💳 Payments & transactions'], ['/payment-plan/bookings', '🏘️ Property bookings'], ['/payment-plan', '🗂️ Plans by property'],
  ],
  '/services': [
    ['/services/dashboard', '📊 Dashboard'], ['/services', '🗂️ Categories & providers'], ['/services/bookings', '🧾 Bookings'],
  ],
  '/food': [
    ['/food/dashboard', '📊 Dashboard'], ['/food', '🗂️ Menu & items'], ['/food/orders', '🧾 Orders'],
    ['/food/tiffin', '🥡 Tiffin plans'], ['/food/tiffin/subscriptions', '🔁 Subscriptions'],
  ],
  '/healthcare': [
    ['/healthcare/dashboard', '📊 Dashboard'], ['/healthcare', '🩺 Doctors'], ['/healthcare/specialties', '🏷️ Specialties'],
    ['/healthcare/appointments', '📅 Appointments'], ['/healthcare/medicine', '💊 Medicine orders'],
  ],
  '/mobility': [
    ['/mobility/dashboard', '📊 Dashboard'], ['/mobility', '🦽 Equipment'], ['/mobility/categories', '🏷️ Categories'], ['/mobility/requests', '🧾 Requests'],
  ],
  '/wellness': [
    ['/wellness/dashboard', '📊 Dashboard'], ['/wellness', '🧘 Categories & therapies'], ['/wellness/spiritual', '🪔 Spiritual services'], ['/wellness/bookings', '🧾 Bookings'],
  ],
  '/temples': [
    ['/temples/dashboard', '📊 Dashboard'], ['/temples', '🛕 Temples & festivals'], ['/temples/darshan', '🙏 Darshan bookings'],
  ],
  '/transport': [
    ['/transport/dashboard', '📊 Dashboard'], ['/transport', '🚕 Vehicles'], ['/transport/places', '📍 Places'],
    ['/transport/fares', '💲 Fare rules'], ['/transport/rides', '🧾 Rides'],
  ],
  '/amenities': [
    ['/amenities/dashboard', '📊 Dashboard'], ['/amenities', '🏛️ Facilities'], ['/amenities/categories', '🏷️ Categories'], ['/amenities/bookings', '🧾 Bookings'],
  ],
};

export function moduleOf(pathname) {
  return Object.keys(MODULE_TABS).find(p => pathname === p || pathname.startsWith(`${p}/`)) || null;
}

export default function ModuleTabs() {
  const { pathname } = useLocation();
  const mod = moduleOf(pathname);
  if (!mod) return null;
  return (
    <div className="flex flex-wrap gap-1 mb-5 border-b border-slate-200">
      {MODULE_TABS[mod].map(([to, label]) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) => `px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${isActive ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          {label}
        </NavLink>
      ))}
    </div>
  );
}
