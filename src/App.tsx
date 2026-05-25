import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Feed from './pages/Feed';
import EventsPage from './pages/Events';
import HeyGHRPage from './pages/HeyGHR';
import SocialChatPage from './pages/SocialChat';
import LeaderboardPage from './pages/Leaderboard';
import TopStoriesPage from './pages/TopStories';
import ProfilePage from './pages/Profile';
import PCProfilePage from './pages/PCProfile';
import SettingsPage from './pages/Settings';
import MessagesPage from './pages/Messages';
import EventDetailsPage from './pages/EventDetails';
import AuthPage from './pages/AuthPage';
import AdminDashboardPage from './pages/AdminDashboard';
import ClubPanelPage from './pages/ClubPanel';
import { useAuth } from './context/AuthContext';
import { roleHomePath } from './lib/api';

const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6B7280',
    backgroundColor: 'var(--background-main)',
    fontFamily: 'system-ui, sans-serif',
  }}>
    Checking your HIVE session...
  </div>
);

const App = () => {
  const { user, isAuthLoading } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace state={{ from: location }} />} />
      </Routes>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/auth" element={<Navigate to={roleHomePath(user.role)} replace />} />
        <Route path="/club" element={['club_admin', 'Admin'].includes(user.role) ? <ClubPanelPage /> : <Navigate to="/" replace />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/ai" element={<HeyGHRPage />} />
        <Route path="/chat" element={<SocialChatPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/top-stories" element={<TopStoriesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/PCprofile" element={<PCProfilePage />} />
        <Route path="/PCprofile/:userId" element={<PCProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:userId" element={<MessagesPage />} />
        <Route path="/event/:eventId" element={<EventDetailsPage />} />
        <Route path="/admin" element={user.role === 'Admin' ? <AdminDashboardPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
};

export default App;
