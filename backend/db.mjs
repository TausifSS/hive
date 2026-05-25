import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';

const { Pool } = pg;
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
const COLLEGE_EMAIL_DOMAINS = (process.env.COLLEGE_EMAIL_DOMAINS || process.env.COLLEGE_EMAIL_DOMAIN || 'raisoni.net,.edu,ghrcem.edu')
  .split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

mkdirSync(DATA_DIR, { recursive: true });

const isPostgres = DB_FILE.startsWith('postgres://') || DB_FILE.startsWith('postgresql://');
let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  pgPool = new Pool({
    connectionString: DB_FILE,
    ssl: { rejectUnauthorized: false },
  });
} else {
  sqliteDb = new DatabaseSync(DB_FILE);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
}

function translateSql(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

async function dbQueryGet(sql, params = []) {
  if (isPostgres) {
    const pgSql = translateSql(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows[0] || null;
  } else {
    return sqliteDb.prepare(sql).get(...params) || null;
  }
}

async function dbQueryAll(sql, params = []) {
  if (isPostgres) {
    const pgSql = translateSql(sql);
    const res = await pgPool.query(pgSql, params);
    return res.rows;
  } else {
    return sqliteDb.prepare(sql).all(...params);
  }
}

async function dbQueryRun(sql, params = []) {
  if (isPostgres) {
    const pgSql = translateSql(sql);
    const res = await pgPool.query(pgSql, params);
    return { changes: res.rowCount };
  } else {
    const result = sqliteDb.prepare(sql).run(...params);
    return { changes: result.changes };
  }
}

async function dbQueryExec(sql) {
  if (isPostgres) {
    await pgPool.query(sql);
  } else {
    sqliteDb.exec(sql);
  }
}

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

async function userCount() {
  const row = await dbQueryGet('SELECT COUNT(*) AS count FROM users');
  return Number(row?.count || 0);
}

async function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await dbQueryRun(`
    INSERT INTO auth_sessions (id, user_id, token_hash, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `, [randomUUID(), userId, hashToken(token), now.toISOString(), expiresAt]);

  return { token, expiresAt };
}

async function getUserBySessionToken(token) {
  if (!token) return null;

  const session = await dbQueryGet(`
    SELECT * FROM auth_sessions
    WHERE token_hash = ? AND revoked_at IS NULL
  `, [hashToken(token)]);

  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }

  const user = await getUserById(session.user_id);
  return user?.blockedAt ? null : user;
}

async function revokeSession(token) {
  if (!token) return;

  await dbQueryRun('UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL', [
    new Date().toISOString(),
    hashToken(token)
  ]);
}

async function createLoginOtp(email) {
  const normalizedEmail = normalizeEmail(email);
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

  await dbQueryRun(`
    UPDATE auth_otps
    SET consumed_at = ?
    WHERE email = ? AND purpose = 'login' AND consumed_at IS NULL
  `, [now.toISOString(), normalizedEmail]);

  await dbQueryRun(`
    INSERT INTO auth_otps (id, email, otp_hash, purpose, attempts, created_at, expires_at, consumed_at)
    VALUES (?, ?, ?, 'login', 0, ?, ?, NULL)
  `, [randomUUID(), normalizedEmail, hashToken(`${normalizedEmail}:${otp}`), now.toISOString(), expiresAt]);

  return { otp, expiresAt };
}

async function verifyLoginOtp(email, otp) {
  const normalizedEmail = normalizeEmail(email);
  const record = await dbQueryGet(`
    SELECT * FROM auth_otps
    WHERE email = ? AND purpose = 'login' AND consumed_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `, [normalizedEmail]);

  if (!record) return { ok: false, error: 'OTP not requested or already used' };
  if (new Date(record.expires_at).getTime() <= Date.now()) return { ok: false, error: 'OTP expired' };
  if (record.attempts >= 5) return { ok: false, error: 'Too many OTP attempts' };

  const isValid = record.otp_hash === hashToken(`${normalizedEmail}:${String(otp || '').trim()}`);
  await dbQueryRun('UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?', [record.id]);

  if (!isValid) return { ok: false, error: 'Invalid OTP' };

  await dbQueryRun('UPDATE auth_otps SET consumed_at = ? WHERE id = ?', [new Date().toISOString(), record.id]);
  return { ok: true };
}

async function deleteExpiredSessions() {
  const now = new Date().toISOString();
  await dbQueryRun('DELETE FROM auth_sessions WHERE expires_at <= ? OR revoked_at IS NOT NULL', [now]);
  await dbQueryRun('DELETE FROM auth_otps WHERE expires_at <= ? OR consumed_at IS NOT NULL', [now]);
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

async function userWithConnections(user) {
  if (!user) return null;

  const followersRows = await dbQueryAll('SELECT follower_id FROM follows WHERE following_id = ? ORDER BY created_at DESC', [user.id]);
  const followers = followersRows.map((row) => row.follower_id);

  const followingRows = await dbQueryAll('SELECT following_id FROM follows WHERE follower_id = ? ORDER BY created_at DESC', [user.id]);
  const following = followingRows.map((row) => row.following_id);

  return { ...user, followers, following };
}

async function camelEvent(row) {
  if (!row) return null;
  const registrations = await dbQueryAll('SELECT user_id FROM event_registrations WHERE event_id = ? ORDER BY created_at ASC', [row.id]);
  const registeredUserIds = registrations.map((registration) => registration.user_id);

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

async function getUserById(id) {
  const row = await dbQueryGet('SELECT * FROM users WHERE id = ?', [id]);
  return await userWithConnections(camelUser(row));
}

async function getUserByIdOrHandle(idOrHandle) {
  const row = await dbQueryGet('SELECT * FROM users WHERE id = ? OR handle = ?', [idOrHandle, idOrHandle]);
  return await userWithConnections(camelUser(row));
}

async function getUserByEmail(email) {
  const row = await dbQueryGet('SELECT * FROM users WHERE email = ?', [normalizeEmail(email)]);
  return await userWithConnections(camelUser(row));
}

async function listUsers() {
  const rows = await dbQueryAll('SELECT * FROM users ORDER BY points DESC, name ASC');
  const results = [];
  for (const row of rows) {
    results.push(await userWithConnections(camelUser(row)));
  }
  return results;
}

async function createUser({ id, name, email, password, passwordHash, role = 'student' }) {
  const normalizedEmail = normalizeEmail(email);
  const userId = id || (await createAvailableUserId(normalizedEmail));
  const initials = encodeURIComponent(name.slice(0, 2).toUpperCase());

  await dbQueryRun(`
    INSERT INTO users (
      id, name, email, password_hash, role, handle, bio, avatar_url, cover_url, points, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
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
  ]);

  return await getUserById(userId);
}

async function setUserPassword(userId, password) {
  await dbQueryRun('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(password), userId]);
  return await getUserById(userId);
}

async function getFirstAdmin() {
  const row = await dbQueryGet("SELECT * FROM users WHERE role = 'Admin' ORDER BY created_at ASC LIMIT 1");
  return await userWithConnections(camelUser(row));
}

async function createAvailableUserId(email) {
  const domainPart = emailDomain(email).split('.')[0] || 'user';
  const base = email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase() || domainPart || 'user';
  let candidate = base;
  let suffix = 1;

  while (await getUserById(candidate)) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }

  return candidate;
}

async function followUser(followerId, followingId) {
  await dbQueryRun('INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [
    followerId,
    followingId,
    new Date().toISOString()
  ]);

  return {
    user: await getUserById(followingId),
    currentUser: await getUserById(followerId),
  };
}

async function resolveRoleForNewUser(email) {
  const normalizedEmail = normalizeEmail(email);
  if (ADMIN_EMAILS.includes(normalizedEmail) || (await userCount()) === 0) {
    return 'Admin';
  }
  if (matchesEmailDomain(normalizedEmail, '.edu')) {
    return 'club_admin';
  }
  return 'student';
}

async function getOrCreateOtpUser({ email, name }) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await getUserByEmail(normalizedEmail);

  if (existingUser) return existingUser;

  const role = await resolveRoleForNewUser(normalizedEmail);
  return await createUser({
    name: name || normalizedEmail.split('@')[0],
    email: normalizedEmail,
    password: randomBytes(24).toString('base64url'),
    role,
  });
}

async function getOrCreateStudentWithPassword({ email, name, password }) {
  const normalizedEmail = normalizeEmail(email);
  const existingUser = await getUserByEmail(normalizedEmail);

  if (existingUser) {
    return await setUserPassword(existingUser.id, password);
  }

  return await createUser({
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

async function getClubApplicationByEmail(email) {
  const row = await dbQueryGet('SELECT * FROM club_applications WHERE official_email = ?', [normalizeEmail(email)]);
  return camelClubApplication(row);
}

async function getClubApplicationById(id) {
  const row = await dbQueryGet('SELECT * FROM club_applications WHERE id = ?', [id]);
  return camelClubApplication(row);
}

async function listClubApplications() {
  const rows = await dbQueryAll(`
    SELECT * FROM club_applications
    ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, submitted_at DESC
  `);
  return rows.map(camelClubApplication);
}

async function upsertClubApplication({ clubName, officialEmail, password, certificateName, certificateData }) {
  const normalizedEmail = normalizeEmail(officialEmail);
  const existingApplication = await getClubApplicationByEmail(normalizedEmail);
  const now = new Date().toISOString();
  const id = existingApplication?.id || randomUUID();

  await dbQueryRun(`
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
  `, [
    id,
    clubName,
    normalizedEmail,
    hashPassword(password),
    certificateName,
    certificateData,
    now,
  ]);

  return await getClubApplicationByEmail(normalizedEmail);
}

async function reviewClubApplication(applicationId, status, reviewerId, note = '') {
  const application = await getClubApplicationById(applicationId);
  if (!application) return null;

  const reviewedAt = new Date().toISOString();
  await dbQueryRun('UPDATE club_applications SET status = ?, reviewed_at = ?, reviewed_by = ?, note = ? WHERE id = ?', [
    status,
    reviewedAt,
    reviewerId,
    note,
    applicationId
  ]);

  if (status === 'approved') {
    const existingUser = await getUserByEmail(application.officialEmail);
    if (existingUser) {
      await dbQueryRun('UPDATE users SET role = ?, password_hash = ?, name = ? WHERE id = ?', [
        'club_admin',
        application.passwordHash,
        application.clubName,
        existingUser.id
      ]);
    } else {
      await createUser({
        name: application.clubName,
        email: application.officialEmail,
        passwordHash: application.passwordHash,
        role: 'club_admin',
      });
    }
  }

  return await getClubApplicationById(applicationId);
}

async function updateUserProfile(userId, fields) {
  const currentUser = await getUserById(userId);
  if (!currentUser) return null;

  const name = String(fields.name || currentUser.name).trim().slice(0, 80);
  const bio = String(fields.bio ?? currentUser.bio ?? '').trim().slice(0, 240);
  const avatarUrl = String(fields.avatarUrl ?? currentUser.avatarUrl ?? '').trim().slice(0, 2000);
  const coverUrl = String(fields.coverUrl ?? currentUser.coverUrl ?? '').trim().slice(0, 2000);

  if (!name) return { error: 'name-required' };

  await dbQueryRun(`
    UPDATE users
    SET name = ?, bio = ?, avatar_url = ?, cover_url = ?
    WHERE id = ?
  `, [name, bio, avatarUrl, coverUrl, userId]);

  return await getUserById(userId);
}

async function updateUserRole(userId, role) {
  await dbQueryRun('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
  return await getUserById(userId);
}

async function setUserBlocked(userId, blocked) {
  await dbQueryRun('UPDATE users SET blocked_at = ? WHERE id = ?', [blocked ? new Date().toISOString() : null, userId]);
  if (blocked) {
    await dbQueryRun('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL', [
      new Date().toISOString(),
      userId
    ]);
  }
  return await getUserById(userId);
}

async function deleteUser(userId) {
  await dbQueryRun('DELETE FROM users WHERE id = ?', [userId]);
}

async function getPostById(postId) {
  const postRow = await dbQueryGet('SELECT * FROM posts WHERE id = ?', [postId]);
  if (!postRow) return null;

  const post = camelPost(postRow);
  post.author = publicUser(await getUserById(post.authorId));

  const likesRows = await dbQueryAll('SELECT user_id FROM post_likes WHERE post_id = ? ORDER BY created_at ASC', [post.id]);
  post.likes = likesRows.map((row) => row.user_id);

  const savedRows = await dbQueryAll('SELECT user_id FROM saved_posts WHERE post_id = ? ORDER BY created_at ASC', [post.id]);
  post.savedBy = savedRows.map((row) => row.user_id);

  const commentsRows = await dbQueryAll('SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC', [post.id]);
  const comments = [];
  for (const comment of commentsRows) {
    comments.push({
      id: comment.id,
      authorId: comment.author_id,
      content: comment.content,
      createdAt: comment.created_at,
      author: publicUser(await getUserById(comment.author_id)),
    });
  }

  post.comments = comments;
  post.likesCount = post.likes.length;
  post.savedCount = post.savedBy.length;
  post.commentsCount = post.comments.length;

  return post;
}

async function listPosts() {
  const rows = await dbQueryAll('SELECT * FROM posts ORDER BY created_at DESC');
  const results = [];
  for (const row of rows) {
    results.push(await getPostById(row.id));
  }
  return results;
}

async function createPost({ authorId, content, mediaUrl = '' }) {
  const id = randomUUID();
  await dbQueryRun('INSERT INTO posts (id, author_id, content, media_url, created_at) VALUES (?, ?, ?, ?, ?)', [
    id,
    authorId,
    content,
    mediaUrl,
    new Date().toISOString()
  ]);
  return await getPostById(id);
}

async function togglePostLike(postId, userId) {
  const existing = await dbQueryGet('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);

  if (existing) {
    await dbQueryRun('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [postId, userId]);
  } else {
    await dbQueryRun('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)', [
      postId,
      userId,
      new Date().toISOString()
    ]);
  }

  return await getPostById(postId);
}

async function togglePostSave(postId, userId) {
  const existing = await dbQueryGet('SELECT 1 FROM saved_posts WHERE post_id = ? AND user_id = ?', [postId, userId]);

  if (existing) {
    await dbQueryRun('DELETE FROM saved_posts WHERE post_id = ? AND user_id = ?', [postId, userId]);
  } else {
    await dbQueryRun('INSERT INTO saved_posts (post_id, user_id, created_at) VALUES (?, ?, ?)', [
      postId,
      userId,
      new Date().toISOString()
    ]);
  }

  return await getPostById(postId);
}

async function addPostComment(postId, authorId, content) {
  const id = randomUUID();
  await dbQueryRun('INSERT INTO post_comments (id, post_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)', [
    id,
    postId,
    authorId,
    content,
    new Date().toISOString()
  ]);

  return {
    post: await getPostById(postId),
    comment: {
      id,
      authorId,
      content,
      createdAt: new Date().toISOString(),
    },
  };
}

async function getEventById(eventId) {
  const row = await dbQueryGet('SELECT * FROM events WHERE id = ?', [eventId]);
  if (!row) return null;

  const event = await camelEvent(row);
  event.organizerUser = publicUser(await getUserById(event.organizerId));
  return event;
}

async function listEvents() {
  const rows = await dbQueryAll('SELECT * FROM events ORDER BY date ASC');
  const results = [];
  for (const row of rows) {
    results.push(await getEventById(row.id));
  }
  return results;
}

async function createEvent({
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
  await dbQueryRun(`
    INSERT INTO events (
      id, title, description, category, date, venue, organizer, organizer_id,
      capacity, points, image_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
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
  ]);

  return await getEventById(id);
}

async function registerForEvent(eventId, userId) {
  const event = await getEventById(eventId);
  if (!event) return { error: 'not-found' };
  if (event.registeredCount >= event.capacity && !event.registeredUserIds.includes(userId)) {
    return { error: 'full' };
  }

  const alreadyRegistered = event.registeredUserIds.includes(userId);
  await dbQueryRun('INSERT INTO event_registrations (event_id, user_id, created_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [
    eventId,
    userId,
    new Date().toISOString()
  ]);

  if (!alreadyRegistered) {
    await dbQueryRun('UPDATE users SET points = points + ? WHERE id = ?', [event.points, userId]);
  }

  return {
    event: await getEventById(eventId),
    user: await getUserById(userId),
  };
}

async function listLeaderboard() {
  const users = await listUsers();
  return users.map((user, index) => ({
    rank: index + 1,
    ...publicUser(user),
  }));
}

function conversationIdFor(userA, userB) {
  return `chat-${[userA, userB].sort().join('-')}`;
}

async function getConversation(conversationId) {
  const conversation = await dbQueryGet('SELECT * FROM conversations WHERE id = ?', [conversationId]);
  if (!conversation) return null;

  const participantsRows = await dbQueryAll('SELECT user_id FROM conversation_participants WHERE conversation_id = ? ORDER BY user_id ASC', [conversationId]);
  const participantIds = participantsRows.map((row) => row.user_id);

  const messagesRows = await dbQueryAll('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', [conversationId]);
  const messages = messagesRows.map((message) => ({
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

async function getOrCreateConversation(userA, userB) {
  const id = conversationIdFor(userA, userB);
  const existing = await getConversation(id);
  if (existing) return existing;

  const now = new Date().toISOString();
  await dbQueryRun('INSERT INTO conversations (id, updated_at) VALUES (?, ?)', [id, now]);
  await dbQueryRun('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, userA]);
  await dbQueryRun('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING', [id, userB]);

  return await getConversation(id);
}

async function addConversationMessage(conversationId, senderId, content) {
  const message = {
    id: randomUUID(),
    senderId,
    content,
    createdAt: new Date().toISOString(),
  };

  await dbQueryRun('INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)', [
    message.id,
    conversationId,
    senderId,
    content,
    message.createdAt
  ]);
  await dbQueryRun('UPDATE conversations SET updated_at = ? WHERE id = ?', [message.createdAt, conversationId]);

  return {
    conversation: await getConversation(conversationId),
    message,
  };
}

const CHAT_CHANNELS = new Set(['global', 'professional', 'placements']);

async function listChannelMessages(channelId) {
  if (!CHAT_CHANNELS.has(channelId)) return null;

  const rows = await dbQueryAll('SELECT * FROM channel_messages WHERE channel_id = ? ORDER BY created_at ASC', [channelId]);
  const results = [];
  for (const message of rows) {
    results.push({
      id: message.id,
      channelId: message.channel_id,
      senderId: message.sender_id,
      content: message.content,
      createdAt: message.created_at,
      author: publicUser(await getUserById(message.sender_id)),
    });
  }
  return results;
}

async function addChannelMessage(channelId, senderId, content) {
  if (!CHAT_CHANNELS.has(channelId)) return { error: 'not-found' };

  const message = {
    id: randomUUID(),
    channelId,
    senderId,
    content: String(content || '').trim().slice(0, 1000),
    createdAt: new Date().toISOString(),
  };

  if (!message.content) return { error: 'content-required' };

  await dbQueryRun('INSERT INTO channel_messages (id, channel_id, sender_id, content, created_at) VALUES (?, ?, ?, ?, ?)', [
    message.id,
    channelId,
    senderId,
    message.content,
    message.createdAt
  ]);

  return {
    messages: await listChannelMessages(channelId),
    message: {
      ...message,
      author: publicUser(await getUserById(senderId)),
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
    author: null,
  };
}

async function listTopStories() {
  const rows = await dbQueryAll('SELECT * FROM top_stories ORDER BY created_at DESC');
  const results = [];
  for (const row of rows) {
    const story = camelStory(row);
    if (story.authorId) {
      story.author = publicUser(await getUserById(story.authorId));
    }
    results.push(story);
  }
  return results;
}

async function getTopStoryById(storyId) {
  const row = await dbQueryGet('SELECT * FROM top_stories WHERE id = ?', [storyId]);
  if (!row) return null;

  const story = camelStory(row);
  if (story.authorId) {
    story.author = publicUser(await getUserById(story.authorId));
  }
  return story;
}

async function createTopStory({ title, summary, body, category = 'Official', authorId = null }) {
  const id = randomUUID();
  await dbQueryRun(`
    INSERT INTO top_stories (id, title, summary, body, category, author_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    String(title || '').trim().slice(0, 140),
    String(summary || '').trim().slice(0, 260),
    String(body || summary || '').trim().slice(0, 3000),
    String(category || 'Official').trim().slice(0, 60),
    authorId,
    new Date().toISOString(),
  ]);

  return await getTopStoryById(id);
}

async function createSchema() {
  await dbQueryExec(`
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

async function columnExists(table, column) {
  if (isPostgres) {
    const res = await pgPool.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
      [table, column]
    );
    return res.rowCount > 0;
  } else {
    return sqliteDb.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
  }
}

async function runMigrations() {
  if (!(await columnExists('users', 'blocked_at'))) {
    await dbQueryExec('ALTER TABLE users ADD COLUMN blocked_at TEXT;');
  }
}

async function removeLegacyDemoData() {
  const marker = await dbQueryGet("SELECT value FROM app_meta WHERE key = 'legacy_demo_cleanup_v1'");
  if (marker) return;

  await dbQueryRun("DELETE FROM users WHERE email IN ('yash@ghrcem.edu', 'tausif@ghrcem.edu')");
  await dbQueryRun(`
    INSERT INTO app_meta (key, value)
    VALUES ('legacy_demo_cleanup_v1', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `, [new Date().toISOString()]);
}

async function seedTopStories() {
  const row = await dbQueryGet('SELECT COUNT(*) AS count FROM top_stories');
  const count = Number(row?.count || 0);
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

  for (const story of stories) {
    await dbQueryRun(`
      INSERT INTO top_stories (id, title, summary, body, category, author_id, created_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?)
    `, [randomUUID(), story.title, story.summary, story.body, story.category, story.createdAt]);
  }
}

// Initialize Database
await createSchema();
await runMigrations();
await removeLegacyDemoData();
await seedTopStories();
await deleteExpiredSessions();

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
