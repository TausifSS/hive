import { Routes, Route } from 'react-router-dom';
import AppLayout from "./layouts/AppLayout";
import Feed from "./pages/Feed";
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
const App = () => {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/ai" element={<HeyGHRPage />} /> 
        <Route path="/chat" element={<SocialChatPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/top-stories" element={<TopStoriesPage />} /> 
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/PCprofile" element={<PCProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} /> 
         <Route path="/messages/:userId" element={<MessagesPage />} /> 
           <Route path="/event/:eventId" element={<EventDetailsPage />} />
      </Routes>
    </AppLayout>
  );
};

export default App;

