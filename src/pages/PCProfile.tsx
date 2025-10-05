import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PCProfilePage = () => {
  const { user: currentUser } = useAuth();
  const { userId } = useParams<{ userId: string }>();

  const isMyProfile = !userId || userId === currentUser?.id;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.coverPhoto}></div>
        <div style={styles.profilePictureContainer}>
          <img
            src="https://placehold.co/128x128/EFEFEF/333?text=YP"
            alt="Profile"
            style={styles.profilePicture}
          />
        </div>
      </header>

      <section style={styles.userInfo}>
        <h1 style={styles.name}>Yash Parse</h1>
        <span style={styles.handle}>@yashparse</span>
        <p style={styles.bio}>
          Student at GHRCEM, Pune | Elevating brands through stunning web design ✨
        </p>

        <div style={styles.stats}>
          <div style={styles.statItem}><span style={styles.statValue}>22</span> Posts</div>
          <div style={styles.statItem}><span style={styles.statValue}>1</span> Followers</div>
          <div style={styles.statItem}><span style={styles.statValue}>0</span> Following</div>
        </div>

        <div style={styles.buttonContainer}>
          {isMyProfile ? (
            <>
              <button style={styles.editButton}>Edit Profile</button>
              <Link to={`/messages/${currentUser?.id}`} style={styles.messageButton}>Message</Link>
              <Link to="/settings" style={styles.moreButton}>
                <MoreHorizontal size={20} color="#6B7280" />
              </Link>
            </>
          ) : (
            <>
              <button style={{ ...styles.editButton, backgroundColor: 'var(--brand-purple)', color: 'white' }}>Follow</button>
              <Link to={`/messages/${userId}`} style={styles.messageButton}>Message</Link>
              <div style={styles.moreButton}>
                <MoreHorizontal size={20} color="#6B7280" />
              </div>
            </>
          )}
        </div>
      </section>

      <nav style={styles.tabNav}>
        <button style={{ ...styles.tabButton, ...styles.activeTab }}>Posts</button>
        <button style={styles.tabButton}>Events</button>
        <button style={styles.tabButton}>Notes</button>
        <button style={styles.tabButton}>Timetable</button>
      </nav>

      <div style={styles.tabContent}>
        <p>Posts will be displayed here...</p>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    backgroundColor: 'white',
    maxWidth: '1000px',
    margin: '20px auto',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  header: {
    position: 'relative',
    marginBottom: '60px',
  },
  coverPhoto: {
    height: '220px',
    backgroundColor: '#E5E7EB',
  },
  profilePictureContainer: {
    position: 'absolute',
    bottom: '-50px',
    left: '32px',
    border: '4px solid white',
    borderRadius: '50%',
    backgroundColor: 'white',
  },
  profilePicture: {
    width: '128px',
    height: '128px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  userInfo: {
    padding: '16px 32px 24px 32px',
  },
  name: {
    fontSize: '26px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
    color: '#111827',
  },
  handle: {
    fontSize: '16px',
    color: '#6B7280',
    marginBottom: '12px',
    display: 'block',
  },
  bio: {
    fontSize: '15px',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
    color: '#374151',
  },
  stats: {
    display: 'flex',
    gap: '32px',
    marginBottom: '16px',
    fontSize: '15px',
  },
  statItem: {
    color: '#6B7280',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#111827',
  },
  buttonContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  editButton: {
    padding: '10px 16px',
    backgroundColor: '#F3F4F6',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  messageButton: {
    padding: '10px 16px',
    backgroundColor: '#F3F4F6',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    color: '#111827',
  },
  moreButton: {
    marginLeft: 'auto',
    padding: '8px',
    backgroundColor: '#F3F4F6',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabNav: {
    display: 'flex',
    borderTop: '1px solid #E5E7EB',
  },
  tabButton: {
    padding: '16px 0',
    border: 'none',
    backgroundColor: 'transparent',
    fontWeight: '600',
    fontSize: '16px',
    color: '#6B7280',
    cursor: 'pointer',
    flex: 1,
    borderBottom: '2px solid transparent',
  },
  activeTab: {
    color: 'var(--brand-purple, #8B5CF6)',
    borderBottom: '2px solid var(--brand-purple, #8B5CF6)',
  },
  tabContent: {
    padding: '48px',
    textAlign: 'center',
    color: '#6B7280',
    fontSize: '16px',
  },
};

export default PCProfilePage;