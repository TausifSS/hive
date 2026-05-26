import { useEffect, useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MoreHorizontal, Camera, Plus, Trash2, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { followUser, getUser, updateCurrentUserProfile, getPosts, getEvents, registerForEvent, getLeaderboard } from '../lib/api';
import type { User, Post, HiveEvent } from '../lib/api';
import PostCard from '../components/feed/PostCard';
import EventCard from '../components/events/EventCard';

interface LocalNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const PCProfilePage = () => {
  const { user: currentUser, setUser, logout } = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const targetUserId = userId || currentUser?.id;
  const [profileUser, setProfileUser] = useState<User | null>(currentUser);
  const [isLoading, setIsLoading] = useState(Boolean(targetUserId));
  const [error, setError] = useState('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'activity' | 'events' | 'notes' | 'timetable'>('activity');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '', avatarUrl: '', coverUrl: '' });
  
  // Dropdown state for three-dot menu
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Dynamic tabs data states
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<HiveEvent[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Notes tab local states
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  // Timetable tab states
  const [selectedDay, setSelectedDay] = useState<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'>('Monday');

  // Followers/following modal state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [connectionsModal, setConnectionsModal] = useState<{ open: boolean; type: 'followers' | 'following' }>({ open: false, type: 'followers' });

  const loadProfileData = async () => {
    if (!targetUserId) {
      setProfileUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await getUser(targetUserId);
      setProfileUser(response.user);

      // Fetch dynamic tab details
      setIsDataLoading(true);
      const [postsRes, eventsRes, leaderRes] = await Promise.all([
        getPosts(),
        getEvents(),
        getLeaderboard()
      ]);
      
      setUserPosts(postsRes.posts.filter((p) => p.authorId === targetUserId));
      setRegisteredEvents(eventsRes.events.filter((e) => e.registeredUserIds.includes(targetUserId)));
      setAllUsers(leaderRes.users);
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Unable to load profile');
    } finally {
      setIsLoading(false);
      setIsDataLoading(false);
    }
  };

  // Load local notes from localStorage
  const loadLocalNotes = () => {
    const saved = localStorage.getItem(`hive-notes-${targetUserId}`);
    if (saved) {
      try {
        setNotes(JSON.parse(saved) as LocalNote[]);
      } catch {
        setNotes([]);
      }
    } else {
      setNotes([
        {
          id: 'note-welcome',
          title: 'Welcome to your HIVE Notebook',
          content: 'This is a personal student notebook. Notes you type here are stored securely in your browser\'s local storage.',
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  useEffect(() => {
    void loadProfileData();
    loadLocalNotes();
  }, [targetUserId]);

  const isMyProfile = Boolean(profileUser && currentUser && profileUser.id === currentUser.id);
  const alreadyFollowing = Boolean(profileUser && currentUser && profileUser.followers?.includes(currentUser.id));

  const handleFollow = async () => {
    if (!profileUser || isMyProfile || alreadyFollowing || isFollowing) return;

    setIsFollowing(true);
    setError('');

    try {
      const response = await followUser(profileUser.id);
      setProfileUser(response.user);
      setUser(response.currentUser);
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : 'Unable to follow user');
    } finally {
      setIsFollowing(false);
    }
  };

  const openEditProfile = () => {
    if (!profileUser) return;
    setEditForm({
      name: profileUser.name,
      bio: profileUser.bio || '',
      avatarUrl: profileUser.avatarUrl || '',
      coverUrl: profileUser.coverUrl || '',
    });
    setIsEditOpen(true);
  };

  const handleSaveProfile = async () => {
    setError('');
    try {
      const response = await updateCurrentUserProfile(editForm);
      setProfileUser(response.user);
      setUser(response.user);
      setIsEditOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to update profile');
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, field: 'avatarUrl' | 'coverUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm((prev) => ({ ...prev, [field]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleCopyProfileLink = () => {
    const link = `${window.location.origin}/Hive/#/profile/${profileUser?.id}`;
    void navigator.clipboard.writeText(link)
      .then(() => alert('Profile link copied to clipboard!'))
      .catch(() => alert('Failed to copy link.'));
    setIsDropdownOpen(false);
  };

  const handlePostUpdated = (updatedPost: Post) => {
    setUserPosts((current) => current.map((p) => p.id === updatedPost.id ? updatedPost : p));
  };

  const handlePostDeleted = (postId: string) => {
    setUserPosts((current) => current.filter((p) => p.id !== postId));
  };

  const handleEventRegister = async (eventId: string) => {
    try {
      await registerForEvent(eventId);
      const eventsRes = await getEvents();
      setRegisteredEvents(eventsRes.events.filter((e) => e.registeredUserIds.includes(targetUserId || '')));
    } catch (err) {
      console.error('Failed to register for event', err);
    }
  };

  // Add a local note
  const handleAddNote = () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;
    const note: LocalNote = {
      id: `note-${Date.now()}`,
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString()
    };
    const updatedNotes = [note, ...notes];
    setNotes(updatedNotes);
    localStorage.setItem(`hive-notes-${targetUserId}`, JSON.stringify(updatedNotes));
    setNewNoteTitle('');
    setNewNoteContent('');
  };

  // Delete a local note
  const handleDeleteNote = (noteId: string) => {
    const updatedNotes = notes.filter((n) => n.id !== noteId);
    setNotes(updatedNotes);
    localStorage.setItem(`hive-notes-${targetUserId}`, JSON.stringify(updatedNotes));
  };

  const mockTimetable = {
    Monday: [
      { time: '09:30 AM - 10:30 AM', subject: 'Web Technology', venue: 'L-401', instructor: 'Prof. J. Patel' },
      { time: '10:30 AM - 11:30 AM', subject: 'Database Systems', venue: 'L-402', instructor: 'Dr. S. Sharma' },
      { time: '11:30 AM - 12:00 PM', subject: 'Short Break', venue: 'Campus Canteen', instructor: '-' },
      { time: '12:00 PM - 01:00 PM', subject: 'Software Engineering', venue: 'L-401', instructor: 'Prof. R. Sen' },
      { time: '02:00 PM - 04:00 PM', subject: 'Database Lab', venue: 'Computer Lab 3', instructor: 'Dr. S. Sharma' }
    ],
    Tuesday: [
      { time: '09:30 AM - 10:30 AM', subject: 'Operating Systems', venue: 'L-302', instructor: 'Prof. A. Rao' },
      { time: '10:30 AM - 11:30 AM', subject: 'Formal Languages & Automata', venue: 'L-302', instructor: 'Dr. M. Roy' },
      { time: '11:30 AM - 12:00 PM', subject: 'Short Break', venue: 'Campus Canteen', instructor: '-' },
      { time: '12:00 PM - 01:00 PM', subject: 'Operating Systems Lab', venue: 'Computer Lab 1', instructor: 'Prof. A. Rao' },
      { time: '02:00 PM - 04:00 PM', subject: 'Mini Project Development', venue: 'Lab 4', instructor: 'Prof. J. Patel' }
    ],
    Wednesday: [
      { time: '09:30 AM - 11:30 AM', subject: 'Artificial Intelligence', venue: 'L-402', instructor: 'Dr. K. Joshi' },
      { time: '11:30 AM - 12:00 PM', subject: 'Short Break', venue: 'Campus Canteen', instructor: '-' },
      { time: '12:00 PM - 01:00 PM', subject: 'Compiler Design', venue: 'L-401', instructor: 'Prof. V. Vyas' },
      { time: '02:00 PM - 04:00 PM', subject: 'Aptitude & Soft Skills', venue: 'Seminar Hall 2', instructor: 'Training Lead' }
    ],
    Thursday: [
      { time: '09:30 AM - 10:30 AM', subject: 'Database Systems', venue: 'L-402', instructor: 'Dr. S. Sharma' },
      { time: '10:30 AM - 11:30 AM', subject: 'Software Engineering', venue: 'L-401', instructor: 'Prof. R. Sen' },
      { time: '11:30 AM - 12:00 PM', subject: 'Short Break', venue: 'Campus Canteen', instructor: '-' },
      { time: '12:00 PM - 01:00 PM', subject: 'Compiler Design', venue: 'L-401', instructor: 'Prof. V. Vyas' },
      { time: '02:00 PM - 04:00 PM', subject: 'Compiler Lab', venue: 'Computer Lab 2', instructor: 'Prof. V. Vyas' }
    ],
    Friday: [
      { time: '09:30 AM - 11:30 AM', subject: 'Web Technology Lab', venue: 'Computer Lab 3', instructor: 'Prof. J. Patel' },
      { time: '11:30 AM - 12:00 PM', subject: 'Short Break', venue: 'Campus Canteen', instructor: '-' },
      { time: '12:00 PM - 01:00 PM', subject: 'Artificial Intelligence', venue: 'L-402', instructor: 'Dr. K. Joshi' },
      { time: '02:00 PM - 04:00 PM', subject: 'Sports / Library Hours', venue: 'Gymkhana / Library', instructor: '-' }
    ]
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
        <div style={{ ...styles.coverPhoto, backgroundColor: '#E5E7EB', animation: 'pulse 1.5s infinite' }}></div>
        <div style={{ padding: '16px 32px 24px 32px', position: 'relative', marginTop: '-50px' }}>
          <div style={{
            width: '128px',
            height: '128px',
            borderRadius: '50%',
            backgroundColor: '#E5E7EB',
            border: '4px solid white',
            animation: 'pulse 1.5s infinite',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}></div>
          <div style={{ marginTop: '16px' }}>
            <div style={{ width: '220px', height: '32px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ width: '120px', height: '20px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '16px', animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ width: '100%', height: '16px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '8px', animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ width: '60%', height: '16px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '24px', animation: 'pulse 1.5s infinite' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '32px', marginBottom: '24px' }}>
            <div style={{ width: '100px', height: '24px', backgroundColor: '#E5E7EB', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ width: '100px', height: '24px', backgroundColor: '#E5E7EB', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ width: '100px', height: '24px', backgroundColor: '#E5E7EB', borderRadius: '4px', animation: 'pulse 1.5s infinite' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ width: '150px', height: '40px', backgroundColor: '#E5E7EB', borderRadius: '8px', animation: 'pulse 1.5s infinite' }}></div>
            <div style={{ width: '150px', height: '40px', backgroundColor: '#E5E7EB', borderRadius: '8px', animation: 'pulse 1.5s infinite' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return <div style={styles.errorBox}>{error || 'Profile not found'}</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ ...styles.coverPhoto, backgroundImage: `url("${profileUser.coverUrl || 'https://placehold.co/600x200/374151/E5E7EB?text=Cover+Photo'}")` }}></div>
        <div style={styles.profilePictureContainer}>
          <img
            src={profileUser.avatarUrl || 'https://placehold.co/128x128/EFEFEF/333?text=HV'}
            alt={profileUser.name}
            style={styles.profilePicture}
          />
        </div>
      </header>

      <section style={styles.userInfo}>
        <h1 style={styles.name}>{profileUser.name}</h1>
        <span style={styles.handle}>@{profileUser.handle || profileUser.id}</span>
        <p style={styles.bio}>{profileUser.bio || 'HIVE community member'}</p>

        <div style={styles.stats}>
          <div style={styles.statItem}><span style={styles.statValue}>{profileUser.points || 0}</span> Points</div>
          <div style={{ ...styles.statItem, cursor: 'pointer' }} onClick={() => setConnectionsModal({ open: true, type: 'followers' })}>
            <span style={styles.statValue}>{profileUser.followers?.length || 0}</span> Followers
          </div>
          <div style={{ ...styles.statItem, cursor: 'pointer' }} onClick={() => setConnectionsModal({ open: true, type: 'following' })}>
            <span style={styles.statValue}>{profileUser.following?.length || 0}</span> Following
          </div>
        </div>

        <div style={styles.buttonContainer}>
          {isMyProfile ? (
            <>
              <button style={{ ...styles.editButton, padding: '10px 32px' }} onClick={openEditProfile}>Edit Profile</button>
              <div style={{ position: 'relative' }}>
                <button style={styles.moreButton} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                  <MoreHorizontal size={20} color="#6B7280" />
                </button>
                {isDropdownOpen && (
                  <div style={styles.dropdown}>
                    <button style={styles.dropdownItem} onClick={handleCopyProfileLink}>Copy Profile Link</button>
                    <Link to="/settings" style={{...styles.dropdownItem, textDecoration: 'none', color: '#1F2937', display: 'block'}} onClick={() => setIsDropdownOpen(false)}>Settings</Link>
                    <button style={{...styles.dropdownItem, color: '#EF4444'}} onClick={() => { setIsDropdownOpen(false); logout(); }}>Log out</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                style={{ ...styles.editButton, ...styles.followButton, ...(alreadyFollowing ? styles.followingButton : {}) }}
                onClick={handleFollow}
                disabled={alreadyFollowing || isFollowing}
              >
                {alreadyFollowing ? 'Following' : isFollowing ? 'Following...' : 'Follow'}
              </button>
              <Link to={`/messages/${profileUser.id}`} style={styles.messageButton}>Message</Link>
              <div style={{ position: 'relative' }}>
                <button style={styles.moreButton} onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                  <MoreHorizontal size={20} color="#6B7280" />
                </button>
                {isDropdownOpen && (
                  <div style={styles.dropdown}>
                    <button style={styles.dropdownItem} onClick={handleCopyProfileLink}>Copy Profile Link</button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <nav style={styles.tabNav}>
        <button style={{ ...styles.tabButton, ...(activeTab === 'activity' ? styles.activeTab : {}) }} onClick={() => setActiveTab('activity')}>Activity ({userPosts.length})</button>
        <button style={{ ...styles.tabButton, ...(activeTab === 'events' ? styles.activeTab : {}) }} onClick={() => setActiveTab('events')}>Events ({registeredEvents.length})</button>
        <button style={{ ...styles.tabButton, ...(activeTab === 'notes' ? styles.activeTab : {}) }} onClick={() => setActiveTab('notes')}>Notes ({notes.length})</button>
        <button style={{ ...styles.tabButton, ...(activeTab === 'timetable' ? styles.activeTab : {}) }} onClick={() => setActiveTab('timetable')}>Timetable</button>
      </nav>

      <div style={styles.tabContent}>
        {isDataLoading && (activeTab === 'activity' || activeTab === 'events') ? (
          <p style={{ textAlign: 'center', padding: '24px' }}>Loading tab details...</p>
        ) : activeTab === 'activity' ? (
          userPosts.length === 0 ? (
            <p style={styles.emptyState}>No activity posts yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '640px', margin: '0 auto', textAlign: 'left' }}>
              {userPosts.map((post) => (
                <PostCard key={post.id} post={post} onPostUpdated={handlePostUpdated} onPostDeleted={handlePostDeleted} />
              ))}
            </div>
          )
        ) : activeTab === 'events' ? (
          registeredEvents.length === 0 ? (
            <p style={styles.emptyState}>No registered campus events yet.</p>
          ) : (
            <div style={styles.eventsGrid}>
              {registeredEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  isRegistered={true} 
                  onRegister={handleEventRegister} 
                />
              ))}
            </div>
          )
        ) : activeTab === 'notes' ? (
          <div style={styles.notesContainer}>
            {isMyProfile && (
              <div style={styles.addNoteForm}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>Add Personal Note</h3>
                <input 
                  type="text" 
                  placeholder="Note Title" 
                  value={newNoteTitle} 
                  onChange={(e) => setNewNoteTitle(e.target.value)} 
                  style={styles.noteInput} 
                />
                <textarea 
                  placeholder="Type your notes here..." 
                  value={newNoteContent} 
                  onChange={(e) => setNewNoteContent(e.target.value)} 
                  style={{ ...styles.noteInput, ...styles.noteTextarea }} 
                />
                <button style={styles.addNoteButton} onClick={handleAddNote}>
                  <Plus size={16} />
                  <span>Add Note</span>
                </button>
              </div>
            )}
            
            <div style={styles.notesList}>
              {notes.length === 0 ? (
                <p style={styles.emptyState}>No personal notes saved.</p>
              ) : (
                notes.map((note) => (
                  <div key={note.id} style={styles.noteCard}>
                    <div style={styles.noteHeader}>
                      <h4 style={styles.noteTitle}>{note.title}</h4>
                      {isMyProfile && (
                        <button style={styles.deleteNoteButton} onClick={() => handleDeleteNote(note.id)} title="Delete note">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <p style={styles.noteContent}>{note.content}</p>
                    <span style={styles.noteDate}>{new Date(note.createdAt).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div style={styles.timetableContainer}>
            <div style={styles.daySelector}>
              {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const).map((day) => (
                <button 
                  key={day} 
                  style={{ ...styles.dayButton, ...(selectedDay === day ? styles.activeDayButton : {}) }} 
                  onClick={() => setSelectedDay(day)}
                >
                  {day}
                </button>
              ))}
            </div>
            
            <div style={styles.scheduleList}>
              {mockTimetable[selectedDay].map((slot, index) => (
                <div key={index} style={styles.slotCard}>
                  <div style={styles.slotTime}>
                    <Clock size={16} color="#6B7280" />
                    <span>{slot.time}</span>
                  </div>
                  <div style={styles.slotDetails}>
                    <h4 style={styles.slotSubject}>{slot.subject}</h4>
                    <div style={styles.slotMetadata}>
                      <span style={styles.slotVenue}>Room: {slot.venue}</span>
                      {slot.instructor !== '-' && (
                        <span style={styles.slotInstructor}>Instructor: {slot.instructor}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isEditOpen && (
        <div style={styles.modalBackdrop} onClick={() => setIsEditOpen(false)}>
          <div style={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <h2 style={styles.modalTitle}>Edit Profile</h2>
            
            {/* Cover Image Selector */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>Cover Photo</label>
                {editForm.coverUrl && (
                  <button 
                    type="button" 
                    onClick={() => setEditForm(prev => ({ ...prev, coverUrl: '' }))} 
                    style={styles.removeImageBtn}
                  >
                    Remove Cover
                  </button>
                )}
              </div>
              <div style={{ 
                height: '120px', 
                backgroundImage: `url("${editForm.coverUrl || 'https://placehold.co/600x200/374151/E5E7EB?text=Cover+Photo'}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '8px',
                position: 'relative',
                border: '1px solid #E5E7EB',
                overflow: 'hidden'
              }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileChange(e, 'coverUrl')} 
                  style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    opacity: 0, 
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%'
                  }} 
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '500',
                  pointerEvents: 'none',
                  gap: '4px'
                }}>
                  <Camera size={20} />
                  <span>Change Cover Photo</span>
                </div>
              </div>
            </div>

            {/* Avatar Image Selector */}
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundImage: `url("${editForm.avatarUrl || 'https://placehold.co/100x100/EFEFEF/333?text=HV'}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                position: 'relative',
                border: '1px solid #E5E7EB',
                overflow: 'hidden'
              }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleFileChange(e, 'avatarUrl')} 
                  style={{ 
                    position: 'absolute', 
                    inset: 0, 
                    opacity: 0, 
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%'
                  }} 
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  padding: '4px'
                }}>
                  Change
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '2px', color: '#374151' }}>Profile Picture</label>
                <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Click the circle to upload from device</span>
                {editForm.avatarUrl && (
                  <button 
                    type="button" 
                    onClick={() => setEditForm(prev => ({ ...prev, avatarUrl: '' }))} 
                    style={styles.removeImageBtn}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>

            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>Full Name</label>
            <input style={styles.input} placeholder="Name" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
            
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#374151' }}>Bio</label>
            <textarea style={{ ...styles.input, ...styles.textarea }} placeholder="Bio" value={editForm.bio} onChange={(event) => setEditForm({ ...editForm, bio: event.target.value })} />
            
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={() => setIsEditOpen(false)}>Cancel</button>
              <button style={styles.saveProfileButton} onClick={handleSaveProfile}>Save</button>
            </div>
          </div>
        </div>
      )}

      {connectionsModal.open && (
        <div style={styles.modalBackdrop} onClick={() => setConnectionsModal({ open: false, type: 'followers' })}>
          <div style={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#111827' }}>
                {connectionsModal.type === 'followers' ? 'Followers' : 'Following'}
              </h2>
              <button 
                style={{ border: 'none', background: 'none', fontSize: '22px', cursor: 'pointer', fontWeight: 'bold', color: '#6B7280' }}
                onClick={() => setConnectionsModal({ open: false, type: 'followers' })}
              >
                &times;
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
              {(() => {
                const listIds = connectionsModal.type === 'followers' ? (profileUser.followers || []) : (profileUser.following || []);
                if (listIds.length === 0) {
                  return <p style={{ textAlign: 'center', color: '#6B7280', margin: '20px 0' }}>No users found.</p>;
                }
                const listUsers = allUsers.filter(u => listIds.includes(u.id));
                const resolvedIds = listUsers.map(u => u.id);
                const missingIds = listIds.filter(id => !resolvedIds.includes(id));
                
                return (
                  <>
                    {listUsers.map((item) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img 
                            src={item.avatarUrl || 'https://placehold.co/100x100/EFEFEF/333?text=HV'} 
                            alt={item.name} 
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} 
                          />
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827', textAlign: 'left' }}>{item.name}</div>
                            <div style={{ fontSize: '12px', color: '#6B7280', textAlign: 'left' }}>@{item.handle || item.id}</div>
                          </div>
                        </div>
                        <Link 
                          to={`/profile/${item.id}`} 
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--brand-purple)',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            textDecoration: 'none'
                          }}
                          onClick={() => setConnectionsModal({ open: false, type: 'followers' })}
                        >
                          View
                        </Link>
                      </div>
                    ))}
                    {missingIds.map((id) => (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#9CA3AF' }}>?</div>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#111827', textAlign: 'left' }}>User</div>
                            <div style={{ fontSize: '12px', color: '#6B7280', textAlign: 'left' }}>@{id}</div>
                          </div>
                        </div>
                        <Link 
                          to={`/profile/${id}`} 
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--brand-purple)',
                            color: 'white',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            textDecoration: 'none'
                          }}
                          onClick={() => setConnectionsModal({ open: false, type: 'followers' })}
                        >
                          View
                        </Link>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: CSSProperties } = {
  container: {
    backgroundColor: 'white',
    maxWidth: '1000px',
    margin: '20px auto',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    border: '1px solid #E5E7EB',
  },
  header: {
    position: 'relative',
    marginBottom: '60px',
  },
  coverPhoto: {
    height: '220px',
    backgroundColor: '#E5E7EB',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  profilePictureContainer: {
    position: 'absolute',
    bottom: '-50px',
    left: '32px',
    border: '4px solid white',
    borderRadius: '50%',
    backgroundColor: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
    marginBottom: '20px',
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
    padding: '10px 24px',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '15px',
    cursor: 'pointer',
    color: '#374151',
  },
  followButton: {
    backgroundColor: 'var(--brand-purple)',
    color: 'white',
  },
  followingButton: {
    backgroundColor: '#F3F4F6',
    color: '#374151',
    cursor: 'default',
  },
  messageButton: {
    padding: '10px 24px',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '15px',
    cursor: 'pointer',
    textDecoration: 'none',
    color: '#374151',
  },
  moreButton: {
    padding: '8px',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  dropdown: {
    position: 'absolute',
    top: '44px',
    right: 0,
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 50,
    minWidth: '160px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: '10px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    textAlign: 'left',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600',
    width: '100%',
    color: '#374151',
  },
  tabNav: {
    display: 'flex',
    justifyContent: 'flex-start',
    borderTop: '1px solid #E5E7EB',
    borderBottom: '1px solid #E5E7EB',
    padding: '0 16px',
  },
  tabButton: {
    padding: '14px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    fontWeight: '600',
    fontSize: '16px',
    color: '#6B7280',
    cursor: 'pointer',
    position: 'relative',
  },
  activeTab: {
    color: 'var(--primary-dark)',
    borderBottom: '2px solid var(--primary-dark)',
  },
  tabContent: {
    padding: '24px 32px',
    color: '#6B7280',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    fontSize: '15px',
    color: '#6B7280',
  },
  eventsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  notesContainer: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 1.8fr)',
    gap: '24px',
    textAlign: 'left',
  },
  addNoteForm: {
    backgroundColor: '#F9FAFB',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #E5E7EB',
    alignSelf: 'start',
  },
  noteInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    marginBottom: '12px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  noteTextarea: {
    minHeight: '120px',
    resize: 'vertical',
  },
  addNoteButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: 'var(--brand-purple)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px',
  },
  notesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  noteCard: {
    backgroundColor: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  noteHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  noteTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#111827',
  },
  deleteNoteButton: {
    background: 'none',
    border: 'none',
    color: '#EF4444',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteContent: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
  noteDate: {
    fontSize: '11px',
    color: '#9CA3AF',
  },
  timetableContainer: {
    textAlign: 'left',
  },
  daySelector: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '1px solid #E5E7EB',
    paddingBottom: '12px',
  },
  dayButton: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '20px',
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
  },
  activeDayButton: {
    backgroundColor: 'var(--brand-purple)',
    color: 'white',
  },
  scheduleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  slotCard: {
    display: 'flex',
    gap: '24px',
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '16px',
    alignItems: 'center',
  },
  slotTime: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '200px',
    minWidth: '200px',
    fontSize: '14px',
    color: '#4B5563',
    fontWeight: '600',
  },
  slotDetails: {
    flex: 1,
  },
  slotSubject: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#111827',
  },
  slotMetadata: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#6B7280',
  },
  slotVenue: {
    fontWeight: '500',
  },
  slotInstructor: {},
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  modalContent: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #E5E7EB',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalTitle: {
    margin: '0 0 20px 0',
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#111827',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '15px',
    marginBottom: '16px',
    outline: 'none',
    fontFamily: 'inherit',
  },
  textarea: {
    minHeight: '80px',
    resize: 'vertical',
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    border: 'none',
    borderRadius: '8px',
    padding: '10px 16px',
    backgroundColor: '#F3F4F6',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '15px',
  },
  saveProfileButton: {
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    backgroundColor: 'var(--brand-purple)',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '15px',
  },
  stateBox: {
    padding: '40px 24px',
    color: '#6B7280',
    textAlign: 'center',
  },
  errorBox: {
    margin: '16px',
    padding: '16px',
    backgroundColor: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: '12px',
    color: '#DC2626',
    textAlign: 'center',
  },
  removeImageBtn: {
    border: 'none',
    background: 'none',
    color: '#EF4444',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
  },
};

export default PCProfilePage;
