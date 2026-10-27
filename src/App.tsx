import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { AppLayout } from './components/layout/app-layout';
import { ProtectedRoute } from './components/layout/protected-route';
import { LandingPage } from './features/landing/landing-page';
import { LoginPage } from './features/auth/login-page';
import { RegisterPage } from './features/auth/register-page';
import { RadarPage } from './features/radar/radar-page';
import { TournamentDetailPage } from './features/radar/tournament-detail-page';
import { DashboardPage } from './features/dashboard/dashboard-page';
import { TeamsPage } from './features/teams/teams-page';
import { TeamDetailPage } from './features/teams/team-detail-page';
import { StrategyPage } from './features/strategy/strategy-page';
import { RemindersPage } from './features/reminders/reminders-page';
import { ProfilePage } from './features/profile/profile-page';
import { OrganizersPage } from './features/tournaments/organizers-page';
import { ImportAnnouncementPage } from './features/tournaments/import-announcement-page';
import { Button } from './components/ui/button';
import { Compass } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/radar" element={<RadarPage />} />
        <Route path="/radar/:id" element={<TournamentDetailPage />} />
        <Route path="/organizers" element={<OrganizersPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Authenticated / Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams"
          element={
            <ProtectedRoute>
              <TeamsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teams/:id"
          element={
            <ProtectedRoute>
              <TeamDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategy"
          element={
            <ProtectedRoute>
              <StrategyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/strategy/:roomId"
          element={
            <ProtectedRoute>
              <StrategyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reminders"
          element={
            <ProtectedRoute>
              <RemindersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/import-announcement"
          element={
            <ProtectedRoute>
              <ImportAnnouncementPage />
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route
          path="*"
          element={
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
              <span className="font-mono text-sm font-bold uppercase text-editorial-orange tracking-widest">
                404 — Coordinate Out of Bounds
              </span>
              <h1 className="font-heading font-bold text-3xl sm:text-4xl text-editorial-charcoal">
                Tournament sector not found
              </h1>
              <p className="text-xs text-editorial-muted max-w-md">
                The bracket or route you are looking for has concluded or does not exist on the current radar.
              </p>
              <Link to="/radar" className="mt-2">
                <Button variant="primary" size="md" leftIcon={<Compass className="w-4 h-4" />}>
                  Return to Tournament Radar
                </Button>
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
};
