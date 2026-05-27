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
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E202C', // Premium dark background during start
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#FFFFFF',
  }}>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 0.7; transform: scale(0.96); }
        50% { opacity: 1; transform: scale(1.04); }
      }
      .glowing-loader {
        width: 56px;
        height: 56px;
        border: 4px solid rgba(106, 75, 255, 0.15);
        border-top: 4px solid #6A4BFF;
        border-right: 4px solid #8B5CF6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        box-shadow: 0 0 20px rgba(106, 75, 255, 0.4);
        margin-bottom: 20px;
      }
      .loading-brand {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 0.15em;
        background: linear-gradient(135deg, #FFF 30%, #8B5CF6 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 2px 10px rgba(139, 92, 246, 0.35);
        margin: 0;
      }
      .loading-subtext {
        font-size: 13px;
        color: #8A9AAB;
        margin-top: 8px;
        font-weight: 500;
        animation: pulse 1.8s infinite ease-in-out;
      }
    `}</style>
    <div className="glowing-loader"></div>
    <h2 className="loading-brand">HIVE</h2>
    <div className="loading-subtext">Initializing Secure Session...</div>
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
