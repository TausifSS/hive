import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadLocalEnv() {
  const candidates = [join(__dirname, '..', '.env'), join(process.cwd(), '.env')];
  const envFile = candidates.find((file) => existsSync(file));
  if (!envFile) return;

  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv();

const DATA_DIR = join(__dirname, 'data');
const DB_FILE = process.env.DATABASE_URL || join(DATA_DIR, 'hive.db');
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 7);
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES || 10);
const COLLEGE_EMAIL_DOMAINS = (process.env.COLLEGE_EMAIL_DOMAINS || process.env.COLLEGE_EMAIL_DOMAIN || 'raisoni.net,raisoni.edu,highschool.net,.edu,ghrcem.edu')
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

mkdirSync(DATA_DIR, { recursive: true });

const database = new DatabaseSync(DB_FILE);
database.exec('PRAGMA foreign_keys = ON;');
database.exec('PRAGMA journal_mode = WAL;');

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [type, salt, originalHash] = String(storedHash || '').split(':');
  if (type !== 'scrypt' || !salt || !originalHash) return false;

  const testHash = scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHash, 'hex');
  return originalBuffer.length === testHash.length && timingSafeEqual(originalBuffer, testHash);
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function emailDomain(email) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf('@');
  return atIndex === -1 ? '' : normalized.slice(atIndex + 1);
}

function matchesEmailDomain(email, domainPattern) {
  const domain = emailDomain(email);
  const pattern = String(domainPattern || '').trim().toLowerCase();

  if (!domain || !pattern) return false;
  if (pattern.startsWith('.')) return domain.endsWith(pattern);
  return domain === pattern || domain.endsWith(`.${pattern}`);
}

function isCollegeEmail(email) {
  const normalized = normalizeEmail(email);
  return ADMIN_EMAILS.includes(normalized) || COLLEGE_EMAIL_DOMAINS.some((domain) => matchesEmailDomain(normalized, domain));
}

function userCount() {
  return database.prepare('SELECT COUNT(*) AS count FROM users').get().count;
}

function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  database.prepare(`
    INSERT INTO auth_sessions (id, user_id, token_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(randomUUID(), userId, hashToken(token), now.toISOString(), expiresAt);

  return { token, expiresAt };
}

function getUserBySessionToken(token) {
  if (!token) return null;

  const session = database
    .prepare(`
      SELECT * FROM auth_sessions
      WHERE token_hash = ? AND revoked_at IS NULL
    `)
    .get(hashToken(token));

  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }

  const user = getUserById(session.user_id);
  return user?.blockedAt ? null : user;
}

function revokeSession(token) {
  if (!token) return;

  database
    .prepare('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL')
    .run(new Date().toISOString(), hashToken(token));
}

function createLoginOtp(email) {
  const normalizedEmail = normalizeEmail(email);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  database
    .prepare(`
      UPDATE auth_otps
      SET consumed_at = ?
      WHERE email = ? AND purpose = 'login' AND consumed_at IS NULL
    `)
    .run(now.toISOString(), normalizedEmail);
  database
    .prepare(`
      INSERT INTO auth_otps (id, email, otp_hash, purpose, attempts, created_at, expires_at, consumed_at)
      VALUES (?, ?, ?, 'login', 0, ?, ?, NULL)
    `)
    .run(randomUUID(), normalizedEmail, hashToken(`${normalizedEmail}:${otp}`), now.toISOString(), expiresAt);

  return { otp, expiresAt };
}

function verifyLoginOtp(email, otp) {
  const normalizedEmail = normalizeEmail(email);
  const record = database
    .prepare(`
      SELECT * FROM auth_otps
      WHERE email = ? AND purpose = 'login' AND consumed_at IS NULL
      ORDER BY datetime(created_at) DESC
      LIMIT 1
    `)
    .get(normalizedEmail);

  if (!record) return { ok: false, error: 'OTP not requested or already used' };
  if (new Date(record.expires_at).getTime() <= Date.now()) return { ok: false, error: 'OTP expired' };
  if (record.attempts >= 5) return { ok: false, error: 'Too many OTP attempts' };

  const isValid = record.otp_hash === hashToken(`${normalizedEmail}:${String(otp || '').trim()}`);
  database.prepare('UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?').run(record.id);

  if (!isValid) return { ok: false, error: 'Invalid OTP' };

  database.prepare('UPDATE auth_otps SET consumed_at = ? WHERE id = ?').run(new Date().toISOString(), record.id);
  return { ok: true };
}

function deleteExpiredSessions() {
  database
    .prepare('DELETE FROM auth_sessions WHERE expires_at <= ? OR revoked_at IS NOT NULL')
    .run(new Date().toISOString());
  database
    .prepare('DELETE FROM auth_otps WHERE expires_at <= ? OR consumed_at IS NOT NULL')
    .run(new Date().toISOString());
}

function camelUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    handle: row.handle,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    coverUrl: row.cover_url,
    points: row.points,
    blockedAt: row.blocked_at,
    followers: [],
    following: [],
  };
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function publicClubApplication(application) {
  if (!application) return null;
  const { passwordHash, certificateData, ...safeApplication } = application;
  return safeApplication;
}

function userWithConnections(user) {
  if (!user) return null;

  const followers = database
    .prepare('SELECT follower_id FROM follows WHERE following_id = ? ORDER BY created_at DESC')
    .all(user.id)
    .map((row) => row.follower_id);
  const following = database
    .prepare('SELECT following_id FROM follows WHERE follower_id = ? ORDER BY created_at DESC')
    .all(user.id)
    .map((row) => row.following_id);

  return { ...user, followers, following };
}

function camelEvent(row) {
  if (!row) return null;
  const registeredUserIds = database
    .prepare('SELECT user_id FROM event_registrations WHERE event_id = ? ORDER BY created_at ASC')
    .all(row.id)
    .map((registration) => registration.user_id);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    date: row.date,
    venue: row.venue,
    organizer: row.organizer,
    organizerId: row.organizer_id,
    capacity: row.capacity,
    points: row.points,
    imageUrl: row.image_url,
    registeredUserIds,
    registeredCount: registeredUserIds.length,
    createdAt: row.created_at,
  };
}

function camelPost(row) {
  if (!row) return null;
  return {
    id: row.id,
    authorId: row.author_id,
    content: row.content,
    mediaUrl: row.media_url,
    createdAt: row.created_at,
    likes: [],
    savedBy: [],
    comments: [],
    likesCount: 0,
    savedCount: 0,
    commentsCount: 0,
  };
}

function getUserById(id) {
  const row = database.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return userWithConnections(camelUser(row));
}

function getUserByIdOrHandle(idOrHandle) {
  const row = database.prepare('SELECT * FROM users WHERE id = ? OR handle = ?').get(idOrHandle, idOrHandle);
  return userWithConnections(camelUser(row));
}

function getUserByEmail(email) {
  const row = database.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email));
  return userWithConnections(camelUser(row));
}

function listUsers() {
  return database
    .prepare('SELECT * FROM users ORDER BY points DESC, name ASC')
    .all()
    .map((row) => userWithConnections(camelUser(row)));
}

function createUser({ id, name, email, password, passwordHash, role = 'student' }) {
  const normalizedEmail = normalizeEmail(email);
  const userId = id || createAvailableUserId(normalizedEmail);
  const initials = encodeURIComponent(name.slice(0, 2).toUpperCase());

  database.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, role, handle, bio, avatar_url, cover_url, points, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    name,
    normalizedEmail,
    passwordHash || hashPassword(password),
    role,
    userId,
    '',
    `https://placehold.co/100x100/EFEFEF/333?text=${initials}`,
    'https://placehold.co/600x200/374151/E5E7EB?text=Cover+Photo',
    0,
    new Date().toISOString(),
  );

  return getUserById(userId);
}

function setUserPassword(userId, password) {
  database.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), userId);
  return getUserById(userId);
}

function getFirstAdmin() {
  const row = database
    .prepare("SELECT * FROM users WHERE role = 'Admin' ORDER BY datetime(created_at) ASC LIMIT 1")
    .get();
  return userWithConnections(camelUser(row));
}

function createAvailableUserId(email) {
  const domainPart = emailDomain(email).split('.')[0] || 'user';
  const base = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase() || domainPart || 'user';
  let candidate = base;
  let suffix = 1;

  while (getUserById(candidate)) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }

  return candidate;
}

function followUser(followerId, followingId) {
  database
    .prepare('INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)')
    .run(followerId, followingId, new Date().toISOString());

  return {
    user: getUserById(followingId),
    currentUser: getUserById(followerId),
  };
}

function resolveRoleForNewUser() {
  return 'student';
}

function getOrCreateOtpUser({ email, name }) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = getUserByEmail(normalizedEmail);

  if (existingUser) return existingUser;

  return createUser({
    name: name || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    password: randomBytes(24).toString('base64url'),
    role: resolveRoleForNewUser(normalizedEmail),
  });
}

function getOrCreateStudentWithPassword({ email, name, password }) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = getUserByEmail(normalizedEmail);

  if (existingUser) {
    return setUserPassword(existingUser.id, password);
  }

  return createUser({
    name: name || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    password,
    role: 'student',
  });
}

function camelClubApplication(row) {
  if (!row) return null;
  return {
    id: row.id,
    clubName: row.club_name,
    officialEmail: row.official_email,
    passwordHash: row.password_hash,
    certificateName: row.certificate_name,
    certificateData: row.certificate_data,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    note: row.note,
  };
}

function getClubApplicationByEmail(email) {
  const row = database
    .prepare('SELECT * FROM club_applications WHERE official_email = ?')
    .get(normalizeEmail(email));
  return camelClubApplication(row);
}

function getClubApplicationById(id) {
  const row = database.prepare('SELECT * FROM club_applications WHERE id = ?').get(id);
  return camelClubApplication(row);
}

function listClubApplications() {
  return database
    .prepare("SELECT * FROM club_applications ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, datetime(submitted_at) DESC")
    .all()
    .map(camelClubApplication);
}

function upsertClubApplication({ clubName, officialEmail, password, certificateName, certificateData }) {
  const normalizedEmail = normalizeEmail(officialEmail);
  const existingApplication = getClubApplicationByEmail(normalizedEmail);
  const now = new Date().toISOString();
  const id = existingApplication?.id || randomUUID();

  database.prepare(`
    INSERT INTO club_applications (
      id, club_name, official_email, password_hash, certificate_name,
      certificate_data, status, submitted_at, reviewed_at, reviewed_by, note
    ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, NULL, NULL, '')
    ON CONFLICT(official_email) DO UPDATE SET
      club_name = excluded.club_name,
      password_hash = excluded.password_hash,
      certificate_name = excluded.certificate_name,
      certificate_data = excluded.certificate_data,
      status = 'pending',
      submitted_at = excluded.submitted_at,
      reviewed_at = NULL,
      reviewed_by = NULL,
      note = ''
  `).run(
    id,
    clubName,
    normalizedEmail,
    hashPassword(password),
    certificateName,
    certificateData,
    now,
  );

  return getClubApplicationByEmail(normalizedEmail);
}

function reviewClubApplication(applicationId, status, reviewerId, note = '') {
  const application = getClubApplicationById(applicationId);
  if (!application) return null;

  const reviewedAt = new Date().toISOString();
  database
    .prepare('UPDATE club_applications SET status = ?, reviewed_at = ?, reviewed_by = ?, note = ? WHERE id = ?')
    .run(status, reviewedAt, reviewerId, note, applicationId);

  if (status === 'approved') {
    const existingUser = getUserByEmail(application.officialEmail);
    if (existingUser) {
      database
        .prepare('UPDATE users SET role = ?, password_hash = ?, name = ? WHERE id = ?')
        .run('club_admin', application.passwordHash, application.clubName, existingUser.id);
    } else {
      createUser({
        name: application.clubName,
        email: application.officialEmail,
        passwordHash: application.passwordHash,
        role: 'club_admin',
      });
    }
  }

  return getClubApplicationById(applicationId);
}

function updateUserProfile(userId, fields) {
  const currentUser = getUserById(userId);
  if (!currentUser) return null;

  const name = String(fields.name || currentUser.name).trim().slice(0, 80);
  const bio = String(fields.bio ?? currentUser.bio ?? '').trim().slice(0, 240);
  const avatarUrl = String(fields.avatarUrl ?? currentUser.avatarUrl ?? '').trim().slice(0, 2000);
  const coverUrl = String(fields.coverUrl ?? currentUser.coverUrl ?? '').trim().slice(0, 2000);

  if (!name) return { error: 'name-required' };

  database.prepare(`
    UPDATE users
    SET name = ?, bio = ?, avatar_url = ?, cover_url = ?
    WHERE id = ?
  `).run(name, bio, avatarUrl, coverUrl, userId);

  return getUserById(userId);
}

function updateUserRole(userId, role) {
  database.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  return getUserById(userId);
}

function setUserBlocked(userId, blocked) {
  database
    .prepare('UPDATE users SET blocked_at = ? WHERE id = ?')
    .run(blocked ? new Date().toISOString() : null, userId);
  if (blocked) {
    database
      .prepare('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
      .run(new Date().toISOString(), userId);
  }
  return getUserById(userId);
}

function deleteUser(userId) {
  database.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

function getPostById(postId) {
  const post = camelPost(database.prepare('SELECT * FROM posts WHERE id = ?').get(postId));
  if (!post) return null;

  post.author = publicUser(getUserById(post.authorId));
  post.likes = database
    .prepare('SELECT user_id FROM post_likes WHERE post_id = ? ORDER BY created_at ASC')
    .all(post.id)
    .map((row) => row.user_id);
  post.savedBy = database
    .prepare('SELECT user_id FROM saved_posts WHERE post_id = ? ORDER BY created_at ASC')
    .all(post.id)
    .map((row) => row.user_id);
  post.comments = database
    .prepare('SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC')
    .all(post.id)
    .map((comment) => ({
      id: comment.id,
      authorId: comment.author_id,
      content: comment.content,
      createdAt: comment.created_at,
      author: publicUser(getUserById(comment.author_id)),
    }));
  post.likesCount = post.likes.length;
  post.savedCount = post.savedBy.length;
  post.commentsCount = post.comments.length;

  return post;
}

function listPosts() {
  return database
    .prepare('SELECT * FROM posts ORDER BY datetime(created_at) DESC')
    .all()
    .map((row) => getPostById(row.id));
}

function createPost({ authorId, content, mediaUrl = '' }) {
  const id = randomUUID();
  database
    .prepare('INSERT INTO posts (id, author_id, content, media_url, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, authorId, content, mediaUrl, new Date().toISOString());
  return getPostById(id);
}

function togglePostLike(postId, userId) {
  const existing = database
    .prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?')
    .get(postId, userId);

  if (existing) {
    database.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(postId, userId);
  } else {
    database
      .prepare('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)')
      .run(postId, userId, new Date().toISOString());
  }

  return getPostById(postId);
}

function togglePostSave(postId, userId) {
  const existing = database
    .prepare('SELECT 1 FROM saved_posts WHERE post_id = ? AND user_id = ?')
    .get(postId, userId);

  if (existing) {
    database.prepare('DELETE FROM saved_posts WHERE post_id = ? AND user_id = ?').run(postId, userId);
  } else {
    database
      .prepare('INSERT INTO saved_posts (post_id, user_id, created_at) VALUES (?, ?, ?)')
      .run(postId, userId, new Date().toISOString());
  }

  return getPostById(postId);
}

function addPostComment(postId, authorId, content) {
  const id = randomUUID();
  database
    .prepare('INSERT INTO post_comments (id, post_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, postId, authorId, content, new Date().toISOString());

  return {
    post: getPostById(postId),
    comment: {
      id,
      authorId,
      content,
      createdAt: new Date().toISOString(),
    },
  };
}

function getEventById(eventId) {
  const event = camelEvent(database.prepare('SELECT * FROM events WHERE id = ?').get(eventId));
  if (!event) return null;
  event.organizerUser = publicUser(getUserById(event.organizerId));
  return event;
}

function listEvents() {
  return database
    .prepare('SELECT * FROM events ORDER BY datetime(date) ASC')
    .all()
    .map((row) => getEventById(row.id));
}

function createEvent({
  title,
  description = '',
  category = 'General',
  date,
  venue,
  organizer,
  organizerId,
  capacity = 100,
  points = 0,
  imageUrl = 'https://placehold.co/400x200/cccccc/ffffff?text=Event+Image',
}) {
  const id = randomUUID();
  database.prepare(`
    INSERT INTO events (
      id, title, description, category, date, venue, organizer, organizer_id,
      capacity, points, image_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title,
    description,
    category,
    date,
    venue,
    organizer,
    organizerId,
    Number(capacity),
    Number(points),
    imageUrl,
    new Date().toISOString(),
  );

  return getEventById(id);
}

function registerForEvent(eventId, userId) {
  const event = getEventById(eventId);
  if (!event) return { error: 'not-found' };
  if (event.registeredCount >= event.capacity && !event.registeredUserIds.includes(userId)) {
    return { error: 'full' };
  }

  const alreadyRegistered = event.registeredUserIds.includes(userId);
  database
    .prepare('INSERT OR IGNORE INTO event_registrations (event_id, user_id, created_at) VALUES (?, ?, ?)')
    .run(eventId, userId, new Date().toISOString());

  if (!alreadyRegistered) {
    database.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(event.points, userId);
  }

  return {
    event: getEventById(eventId),
    user: getUserById(userId),
  };
}

function listLeaderboard() {
  return listUsers().map((user, index) => ({
    rank: index + 1,
    ...publicUser(user),
  }));
}

function conversationIdFor(userA, userB) {
  return `chat-${[userA, userB].sort().join('-')}`;
}

function getConversation(conversationId) {
  const conversation = database.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  if (!conversation) return null;

  const participantIds = database
    .prepare('SELECT user_id FROM conversation_participants WHERE conversation_id = ? ORDER BY user_id ASC')
    .all(conversationId)
    .map((row) => row.user_id);
  const messages = database
    .prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY datetime(created_at) ASC')
    .all(conversationId)
    .map((message) => ({
      id: message.id,
      senderId: message.sender_id,
      content: message.content,
      createdAt: message.created_at,
    }));

  return {
    id: conversation.id,
    participantIds,
    messages,
    updatedAt: conversation.updated_at,
  };
}

function getOrCreateConversation(userA, userB) {
  const id = conversationIdFor(userA, userB);
  const existing = getConversation(id);
  if (existing) return existing;

  const now = new Date().toISOString();
  database.prepare('INSERT INTO conversations (id, updated_at) VALUES (?, ?)').run(id, now);
  database
    .prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)')
    .run(id, userA);
  database
    .prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)')
    .run(id, userB);

  return getConversation(id);
}

function addConversationMessage(conversationId, senderId, content) {
  const message = {
    id: randomUUID(),
    senderId,
    content,
    createdAt: new Date().toISOString(),
  };

  database
    .prepare('INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(message.id, conversationId, senderId, content, message.createdAt);
  database.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(message.createdAt, conversationId);

  return {
    conversation: getConversation(conversationId),
    message,
  };
}

const CHAT_CHANNELS = new Set(['global', 'professional', 'placements']);

function listChannelMessages(channelId) {
  if (!CHAT_CHANNELS.has(channelId)) return null;

  return database
    .prepare('SELECT * FROM channel_messages WHERE channel_id = ? ORDER BY datetime(created_at) ASC')
    .all(channelId)
    .map((message) => ({
      id: message.id,
      channelId: message.channel_id,
      senderId: message.sender_id,
      content: message.content,
      createdAt: message.created_at,
      author: publicUser(getUserById(message.sender_id)),
    }));
}

function addChannelMessage(channelId, senderId, content) {
  if (!CHAT_CHANNELS.has(channelId)) return { error: 'not-found' };

  const message = {
    id: randomUUID(),
    channelId,
    senderId,
    content: String(content || '').trim().slice(0, 1000),
    createdAt: new Date().toISOString(),
  };

  if (!message.content) return { error: 'content-required' };

  database
    .prepare('INSERT INTO channel_messages (id, channel_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(message.id, channelId, senderId, message.content, message.createdAt);

  return {
    messages: listChannelMessages(channelId),
    message: {
      ...message,
      author: publicUser(getUserById(senderId)),
    },
  };
}

function camelStory(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    body: row.body,
    category: row.category,
    authorId: row.author_id,
    createdAt: row.created_at,
    author: row.author_id ? publicUser(getUserById(row.author_id)) : null,
  };
}

function listTopStories() {
  return database
    .prepare('SELECT * FROM top_stories ORDER BY datetime(created_at) DESC')
    .all()
    .map(camelStory);
}

function getTopStoryById(storyId) {
  return camelStory(database.prepare('SELECT * FROM top_stories WHERE id = ?').get(storyId));
}

function createTopStory({ title, summary, body, category = 'Official', authorId = null }) {
  const id = randomUUID();
  database.prepare(`
    INSERT INTO top_stories (id, title, summary, body, category, author_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    String(title || '').trim().slice(0, 140),
    String(summary || '').trim().slice(0, 260),
    String(body || summary || '').trim().slice(0, 3000),
    String(category || 'Official').trim().slice(0, 60),
    authorId,
    new Date().toISOString(),
  );

  return getTopStoryById(id);
}

function createSchema() {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student', 'club_admin', 'Admin')),
      handle TEXT NOT NULL UNIQUE,
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      cover_url TEXT NOT NULL DEFAULT '',
      points INTEGER NOT NULL DEFAULT 0,
      blocked_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id TEXT NOT NULL,
      following_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS auth_otps (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      purpose TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS club_applications (
      id TEXT PRIMARY KEY,
      club_name TEXT NOT NULL,
      official_email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      certificate_name TEXT NOT NULL,
      certificate_data TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
      submitted_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by TEXT,
      note TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      media_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_likes (
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS saved_posts (
      post_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (post_id, user_id),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      venue TEXT NOT NULL,
      organizer TEXT NOT NULL,
      organizer_id TEXT NOT NULL,
      capacity INTEGER NOT NULL DEFAULT 100,
      points INTEGER NOT NULL DEFAULT 0,
      image_url TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (event_id, user_id),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (conversation_id, user_id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS channel_messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS top_stories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Official',
      author_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_top_stories_created_at ON top_stories(created_at);
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_auth_otps_email ON auth_otps(email, purpose, created_at);
    CREATE INDEX IF NOT EXISTS idx_club_applications_status ON club_applications(status, submitted_at);
  `);
}

function columnExists(table, column) {
  return database.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
}

function runMigrations() {
  if (!columnExists('users', 'blocked_at')) {
    database.exec('ALTER TABLE users ADD COLUMN blocked_at TEXT;');
  }

  const marker = database.prepare("SELECT value FROM app_meta WHERE key = 'direct_admin_login_model_v1'").get();
  if (!marker) {
    let sql = "UPDATE users SET role = 'student' WHERE role = 'Admin' AND id <> 'college-admin'";
    const params = [];

    if (ADMIN_EMAILS.length > 0) {
      sql += ` AND email NOT IN (${ADMIN_EMAILS.map(() => '?').join(',')})`;
      params.push(...ADMIN_EMAILS);
    }

    database.prepare(sql).run(...params);
    database
      .prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('direct_admin_login_model_v1', ?)")
      .run(new Date().toISOString());
  }
}

function removeLegacyDemoData() {
  const marker = database.prepare("SELECT value FROM app_meta WHERE key = 'legacy_demo_cleanup_v1'").get();
  if (marker) return;

  database
    .prepare("DELETE FROM users WHERE email IN ('yash@ghrcem.edu', 'tausif@ghrcem.edu')")
    .run();
  database
    .prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('legacy_demo_cleanup_v1', ?)")
    .run(new Date().toISOString());
}

function seedTopStories() {
  const count = database.prepare('SELECT COUNT(*) AS count FROM top_stories').get().count;
  if (count > 0) return;

  const now = Date.now();
  const stories = [
    {
      title: 'HIVE campus backend is online',
      summary: 'College email OTP login, authenticated posting, events, chat, and admin control are now connected to the local database.',
      body: 'HIVE is now running on a local SQLite backend. Students can create posts, like and comment after login, register for events, and use role-aware screens. College Admin can manage user roles, block users, and delete accounts from the Admin panel.',
      category: 'Platform',
      createdAt: new Date(now).toISOString(),
    },
    {
      title: 'Use college mail for secure access',
      summary: 'Students should sign in with Raisoni college mail. Teachers using .edu mail are routed to club lead tools.',
      body: 'Authentication is now based on college email OTP. Local development shows the OTP on screen, while production can connect an email provider. Admin allow-lists can be configured from environment variables.',
      category: 'Security',
      createdAt: new Date(now - 60_000).toISOString(),
    },
    {
      title: 'Club leads can publish campus events',
      summary: 'Event creation is available to Club Admin and College Admin roles, with registrations and points stored in the database.',
      body: 'Events now use backend records instead of static UI. Registration updates event counts and student points immediately, so the leaderboard can reflect participation.',
      category: 'Events',
      createdAt: new Date(now - 120_000).toISOString(),
    },
  ];

  const insert = database.prepare(`
    INSERT INTO top_stories (id, title, summary, body, category, author_id, created_at)
    VALUES (?, ?, ?, ?, ?, NULL, ?)
  `);

  for (const story of stories) {
    insert.run(randomUUID(), story.title, story.summary, story.body, story.category, story.createdAt);
  }
}

createSchema();
runMigrations();
removeLegacyDemoData();
deleteExpiredSessions();

export const db = {
  publicUser,
  publicClubApplication,
  isCollegeEmail,
  verifyPassword,
  createLoginOtp,
  verifyLoginOtp,
  getOrCreateOtpUser,
  createSession,
  getUserBySessionToken,
  revokeSession,
  getUserById,
  getUserByIdOrHandle,
  getUserByEmail,
  getFirstAdmin,
  listUsers,
  createUser,
  setUserPassword,
  getOrCreateStudentWithPassword,
  getClubApplicationByEmail,
  getClubApplicationById,
  listClubApplications,
  upsertClubApplication,
  reviewClubApplication,
  updateUserProfile,
  followUser,
  updateUserRole,
  setUserBlocked,
  deleteUser,
  getPostById,
  listPosts,
  createPost,
  togglePostLike,
  togglePostSave,
  addPostComment,
  getEventById,
  listEvents,
  createEvent,
  registerForEvent,
  listLeaderboard,
  getConversation,
  getOrCreateConversation,
  addConversationMessage,
  listChannelMessages,
  addChannelMessage,
  listTopStories,
  getTopStoryById,
  createTopStory,
};

export { DB_FILE };
