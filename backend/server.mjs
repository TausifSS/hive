import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { db, DB_FILE } from './db.mjs';

const PORT = Number(process.env.PORT || 4000);
const OTP_DELIVERY_MODE = (process.env.OTP_DELIVERY_MODE || (process.env.RESEND_API_KEY ? 'email' : 'development')).toLowerCase();
const OTP_EXPOSE_DEV_OTP = process.env.OTP_EXPOSE_DEV_OTP === 'true';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const OTP_FROM_EMAIL = process.env.OTP_FROM_EMAIL || 'HIVE <onboarding@resend.dev>';
const OTP_REPLY_TO = process.env.OTP_REPLY_TO || '';
const ADMIN_LOGIN_ID = process.env.ADMIN_LOGIN_ID || 'admin';
const ADMIN_LOGIN_PASSWORD = process.env.ADMIN_LOGIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'admin123');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
const MAX_BODY_BYTES = 5_000_000;
const MIN_PASSWORD_LENGTH = 6;

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': process.env.CLIENT_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

function send(res, status, payload) {
  res.writeHead(status, jsonHeaders);
  res.end(JSON.stringify(payload));
}

function notFound(res) {
  send(res, 404, { error: 'Not found' });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
  });
}

function requireUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return db.getUserBySessionToken(token);
}

function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

function isAdmin(user) {
  return user?.role === 'Admin';
}

function sendForbidden(res) {
  send(res, 403, { error: 'You do not have permission for this action' });
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}

function sendSession(res, user) {
  const session = db.createSession(user.id);
  send(res, 200, { token: session.token, expiresAt: session.expiresAt, user: db.publicUser(user) });
}

function findAdminForLogin(adminId, password) {
  const loginId = String(adminId || '').trim();
  const loginPassword = String(password || '');

  const existingAdmin = loginId.includes('@')
    ? db.getUserByEmail(loginId)
    : db.getUserByIdOrHandle(loginId);

  if (existingAdmin?.role === 'Admin' && db.verifyPassword(loginPassword, existingAdmin.passwordHash)) {
    return existingAdmin;
  }

  if (ADMIN_LOGIN_PASSWORD && loginId === ADMIN_LOGIN_ID && loginPassword === ADMIN_LOGIN_PASSWORD) {
    const directAdmin = db.getUserById('college-admin');
    if (directAdmin?.role === 'Admin') return directAdmin;
    if (directAdmin) {
      const admin = db.updateUserRole(directAdmin.id, 'Admin');
      db.setUserPassword(admin.id, ADMIN_LOGIN_PASSWORD);
      return admin;
    }

    return db.createUser({
      id: 'college-admin',
      name: 'College Admin',
      email: 'college.admin@ghrcemp.raisoni.net',
      password: ADMIN_LOGIN_PASSWORD,
      role: 'Admin',
    });
  }

  return null;
}

async function verifyGoogleIdToken(idToken) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google login is not configured. Set VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID.');
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw new Error('Google token verification failed');
  }

  const tokenInfo = await response.json();
  if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Google token audience mismatch');
  }
  if (tokenInfo.email_verified !== 'true' && tokenInfo.email_verified !== true) {
    throw new Error('Google email is not verified');
  }

  return {
    email: tokenInfo.email,
    name: tokenInfo.name || tokenInfo.email?.split('@')[0],
    picture: tokenInfo.picture || '',
  };
}

async function deliverOtpEmail(email, otp, expiresAt) {
  if (OTP_DELIVERY_MODE === 'development' || OTP_DELIVERY_MODE === 'dev') {
    return { mode: 'development', delivered: false };
  }

  if (OTP_DELIVERY_MODE !== 'email') {
    return { mode: OTP_DELIVERY_MODE, delivered: false };
  }

  if (!RESEND_API_KEY) {
    throw new Error('OTP email provider is not configured. Set RESEND_API_KEY and OTP_FROM_EMAIL.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: OTP_FROM_EMAIL,
      to: [email],
      reply_to: OTP_REPLY_TO || undefined,
      subject: 'Your HIVE login OTP',
      text: `Your HIVE login OTP is ${otp}. It expires at ${new Date(expiresAt).toLocaleString()}.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
          <h2>Your HIVE login OTP</h2>
          <p>Use this code to sign in to HIVE:</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:4px">${otp}</p>
          <p>This code expires at ${new Date(expiresAt).toLocaleString()}.</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`OTP email failed${text ? `: ${text}` : ''}`);
  }

  return { mode: 'email', delivered: true };
}

function campusAssistantReply(message, user) {
  const text = String(message || '').trim();
  const lowerText = text.toLowerCase();
  const eventCount = db.listEvents().length;
  const postCount = db.listPosts().length;
  const storyCount = db.listTopStories().length;
  const globalChatCount = db.listChannelMessages('global')?.length || 0;

  if (!text) return 'Ask me about events, points, posting, chat, profile, or admin access.';
  if (lowerText.includes('status') || lowerText.includes('working')) return `HIVE backend is working: ${postCount} posts, ${eventCount} events, ${storyCount} official stories, and ${globalChatCount} global chat messages are in the database.`;
  if (lowerText.includes('event')) return `Open Events to view campus events. There are ${eventCount} events right now. Club Admin and College Admin accounts can create events, and students can register to earn points.`;
  if (lowerText.includes('point') || lowerText.includes('leaderboard')) return `You currently have ${user.points || 0} points. Event registrations add points and the Leaderboard updates from the backend database.`;
  if (lowerText.includes('post') || lowerText.includes('like') || lowerText.includes('comment')) return 'Feed actions are protected by login now. You can create posts, like, comment, save, and share from the Home feed.';
  if (lowerText.includes('admin') || lowerText.includes('block') || lowerText.includes('role')) return user.role === 'Admin'
    ? 'Admin mode is active for your account. Use Admin > User Control to change roles, block users, or delete accounts.'
    : 'Only College Admin accounts can open the Admin panel. The first verified user becomes College Admin unless ADMIN_EMAILS is configured.';
  if (lowerText.includes('mail') || lowerText.includes('otp') || lowerText.includes('login')) return OTP_DELIVERY_MODE === 'email'
    ? 'Login is college-email OTP based. Email OTP delivery is enabled on the backend.'
    : 'Login is college-email OTP based. Local development shows OTP on screen; set RESEND_API_KEY and OTP_DELIVERY_MODE=email to send real email OTPs.';
  if (lowerText.includes('chat') || lowerText.includes('message')) return `Social Chat has campus channels. The global channel has ${globalChatCount} messages. Direct profile messages are stored separately in one-to-one conversations.`;

  return `I noted: "${text}". For now I can help with HIVE navigation, backend status, events, posts, points, chat, and admin roles.`;
}

async function handleRoute(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, jsonHeaders);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(Boolean);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    send(res, 200, {
      status: 'ok',
      service: 'hive-api',
      storage: 'sqlite',
      database: DB_FILE,
      time: new Date().toISOString(),
    });
    return;
  }

  if (url.pathname === '/api/auth/request-otp' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(res, 400, { error: 'Use your college email address to continue' });
      return;
    }

    const user = db.getUserByEmail(body.email);
    if (user?.blockedAt) {
      send(res, 403, { error: 'This account is blocked. Contact college admin.' });
      return;
    }

    const otp = db.createLoginOtp(body.email);
    let delivery;
    try {
      delivery = await deliverOtpEmail(body.email, otp.otp, otp.expiresAt);
    } catch (emailError) {
      send(res, 502, { error: emailError.message });
      return;
    }

    const payload = {
      ok: true,
      expiresAt: otp.expiresAt,
      delivery: delivery.mode,
      message: delivery.delivered
        ? 'OTP sent to your college email address.'
        : 'Development OTP created. Configure email delivery to send OTP to inbox.',
    };

    if (delivery.mode === 'development' || OTP_EXPOSE_DEV_OTP) {
      payload.devOtp = otp.otp;
    }

    send(res, 200, {
      ...payload,
    });
    return;
  }

  if ((url.pathname === '/api/auth/login' || url.pathname === '/api/auth/student-login') && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(res, 400, { error: 'Use your college email address to continue' });
      return;
    }

    const user = db.getUserByEmail(body.email);
    if (!user) {
      send(res, 404, { error: 'Account not found. Use Forgot Password to verify email and set your password.' });
      return;
    }
    if (user.blockedAt) {
      send(res, 403, { error: 'This account is blocked. Contact college admin.' });
      return;
    }
    if (!db.verifyPassword(body.password, user.passwordHash)) {
      send(res, 401, { error: 'Invalid email or password' });
      return;
    }

    sendSession(res, user);
    return;
  }

  if (url.pathname === '/api/auth/student/set-password' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(res, 400, { error: 'Use your college email address to continue' });
      return;
    }
    if (!validatePassword(body.password)) {
      send(res, 400, { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }

    const result = db.verifyLoginOtp(body.email, body.otp);
    if (!result.ok) {
      send(res, 401, { error: result.error });
      return;
    }

    const user = db.getOrCreateStudentWithPassword({
      email: body.email,
      name: body.name,
      password: body.password,
    });
    sendSession(res, user);
    return;
  }

  if (url.pathname === '/api/auth/google' && req.method === 'POST') {
    const body = await parseBody(req);
    try {
      const profile = await verifyGoogleIdToken(body.idToken);
      if (!db.isCollegeEmail(profile.email)) {
        send(res, 400, { error: 'Use your college Google account to continue' });
        return;
      }

      let user = db.getUserByEmail(profile.email);
      if (!user) {
        user = db.createUser({
          name: profile.name,
          email: profile.email,
          password: randomUUID(),
          role: 'student',
        });
        if (profile.picture) {
          user = db.updateUserProfile(user.id, { name: user.name, avatarUrl: profile.picture });
        }
      }
      if (user.blockedAt) {
        send(res, 403, { error: 'This account is blocked. Contact college admin.' });
        return;
      }

      sendSession(res, user);
    } catch (googleError) {
      send(res, 502, { error: googleError.message });
    }
    return;
  }

  if (url.pathname === '/api/auth/club-login' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(res, 400, { error: 'Use your college email address to continue' });
      return;
    }

    const user = db.getUserByEmail(body.email);
    if (user) {
      if (user.blockedAt) {
        send(res, 403, { error: 'This account is blocked. Contact college admin.' });
        return;
      }
      if (!db.verifyPassword(body.password, user.passwordHash)) {
        send(res, 401, { error: 'Invalid email or password' });
        return;
      }
      sendSession(res, user);
      return;
    }

    const application = db.getClubApplicationByEmail(body.email);
    if (application) {
      send(res, 202, { application: db.publicClubApplication(application), error: `Club verification is ${application.status}` });
      return;
    }

    send(res, 404, { error: 'Club account not found. Upload certificate for verification.' });
    return;
  }

  if (url.pathname === '/api/auth/club/register' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(res, 400, { error: 'Use your club official college email' });
      return;
    }
    if (!body.clubName || !body.certificateName || !body.certificateData) {
      send(res, 400, { error: 'Club name and registration certificate are required' });
      return;
    }
    if (!validatePassword(body.password)) {
      send(res, 400, { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }

    const existingUser = db.getUserByEmail(body.email);
    if (existingUser?.role === 'club_admin') {
      send(res, 409, { error: 'Club account is already verified. Use the main Login tab.' });
      return;
    }
    if (existingUser) {
      send(res, 409, { error: 'This email already belongs to another HIVE account.' });
      return;
    }

    const application = db.upsertClubApplication({
      clubName: body.clubName,
      officialEmail: body.email,
      password: body.password,
      certificateName: body.certificateName,
      certificateData: body.certificateData,
    });
    send(res, 202, { application: db.publicClubApplication(application) });
    return;
  }

  if (url.pathname === '/api/auth/club/status' && req.method === 'GET') {
    const email = url.searchParams.get('email');
    if (!email) {
      send(res, 400, { error: 'email is required' });
      return;
    }

    const user = db.getUserByEmail(email);
    if (user?.role === 'club_admin') {
      send(res, 200, { status: 'approved', user: db.publicUser(user) });
      return;
    }

    const application = db.getClubApplicationByEmail(email);
    if (!application) {
      send(res, 404, { error: 'No club verification request found' });
      return;
    }
    send(res, 200, { status: application.status, application: db.publicClubApplication(application) });
    return;
  }

  if (url.pathname === '/api/auth/admin-login' && req.method === 'POST') {
    const body = await parseBody(req);
    const admin = findAdminForLogin(body.adminId, body.password);
    if (!admin) {
      send(res, 401, { error: 'Invalid admin ID or password' });
      return;
    }
    if (admin.blockedAt) {
      send(res, 403, { error: 'This admin account is blocked.' });
      return;
    }

    sendSession(res, admin);
    return;
  }

  if (url.pathname === '/api/auth/verify-otp' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(res, 400, { error: 'Use your college email address to continue' });
      return;
    }

    const result = db.verifyLoginOtp(body.email, body.otp);
    if (!result.ok) {
      send(res, 401, { error: result.error });
      return;
    }

    const user = db.getOrCreateOtpUser({ email: body.email, name: body.name });
    if (user.blockedAt) {
      send(res, 403, { error: 'This account is blocked. Contact college admin.' });
      return;
    }

    sendSession(res, user);
    return;
  }

  if (url.pathname === '/api/auth/register' && req.method === 'POST') {
    send(res, 410, { error: 'Direct registration is disabled. Use college email OTP login.' });
    return;
  }

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    db.revokeSession(getBearerToken(req));
    send(res, 200, { ok: true });
    return;
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    const user = requireUser(req);
    if (!user) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    send(res, 200, { user: db.publicUser(user) });
    return;
  }

  if (url.pathname === '/api/users/me' && req.method === 'PATCH') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }

    const body = await parseBody(req);
    const updatedUser = db.updateUserProfile(currentUser.id, body);
    if (updatedUser?.error === 'name-required') {
      send(res, 400, { error: 'Name is required' });
      return;
    }
    send(res, 200, { user: db.publicUser(updatedUser) });
    return;
  }

  if (url.pathname === '/api/users' && req.method === 'GET') {
    send(res, 200, { users: db.listUsers().map(db.publicUser) });
    return;
  }

  if (url.pathname === '/api/stories' && req.method === 'GET') {
    send(res, 200, { stories: db.listTopStories() });
    return;
  }

  if (url.pathname === '/api/stories' && req.method === 'POST') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(res);
      return;
    }

    const body = await parseBody(req);
    if (!body.title || !body.summary) {
      send(res, 400, { error: 'title and summary are required' });
      return;
    }
    send(res, 201, { story: db.createTopStory({ ...body, authorId: currentUser.id }) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'stories' && pathParts[2] && req.method === 'GET') {
    const story = db.getTopStoryById(pathParts[2]);
    if (!story) {
      notFound(res);
      return;
    }
    send(res, 200, { story });
    return;
  }

  if (url.pathname === '/api/admin/users' && req.method === 'GET') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(res);
      return;
    }
    send(res, 200, { users: db.listUsers().map(db.publicUser) });
    return;
  }

  if (url.pathname === '/api/admin/club-applications' && req.method === 'GET') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(res);
      return;
    }
    send(res, 200, { applications: db.listClubApplications().map(db.publicClubApplication) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'admin' && pathParts[2] === 'club-applications' && pathParts[3] && pathParts[4] === 'review' && req.method === 'PATCH') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(res);
      return;
    }

    const body = await parseBody(req);
    if (!['approved', 'rejected'].includes(body.status)) {
      send(res, 400, { error: 'status must be approved or rejected' });
      return;
    }

    const application = db.reviewClubApplication(pathParts[3], body.status, currentUser.id, body.note || '');
    if (!application) {
      notFound(res);
      return;
    }

    send(res, 200, { application: db.publicClubApplication(application) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'admin' && pathParts[2] === 'users' && pathParts[3] && pathParts[4] === 'role' && req.method === 'PATCH') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(res);
      return;
    }

    const targetUser = db.getUserById(pathParts[3]);
    const body = await parseBody(req);
    const allowedRoles = ['student', 'club_admin', 'Admin'];
    if (!targetUser) {
      notFound(res);
      return;
    }
    if (!allowedRoles.includes(body.role)) {
      send(res, 400, { error: 'Invalid role' });
      return;
    }
    if (targetUser.id === currentUser.id && body.role !== 'Admin') {
      send(res, 400, { error: 'College admin cannot remove their own admin role' });
      return;
    }

    send(res, 200, { user: db.publicUser(db.updateUserRole(targetUser.id, body.role)) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'admin' && pathParts[2] === 'users' && pathParts[3] && pathParts[4] === 'block' && req.method === 'PATCH') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(res);
      return;
    }

    const targetUser = db.getUserById(pathParts[3]);
    const body = await parseBody(req);
    if (!targetUser) {
      notFound(res);
      return;
    }
    if (targetUser.id === currentUser.id) {
      send(res, 400, { error: 'College admin cannot block their own account' });
      return;
    }

    send(res, 200, { user: db.publicUser(db.setUserBlocked(targetUser.id, Boolean(body.blocked))) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'admin' && pathParts[2] === 'users' && pathParts[3] && req.method === 'DELETE') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(res);
      return;
    }

    const targetUser = db.getUserById(pathParts[3]);
    if (!targetUser) {
      notFound(res);
      return;
    }
    if (targetUser.id === currentUser.id) {
      send(res, 400, { error: 'College admin cannot delete their own account' });
      return;
    }

    db.deleteUser(targetUser.id);
    send(res, 200, { ok: true });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'users' && pathParts[2] && req.method === 'GET') {
    const user = db.getUserByIdOrHandle(pathParts[2]);
    if (!user) {
      notFound(res);
      return;
    }
    send(res, 200, { user: db.publicUser(user) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'users' && pathParts[3] === 'follow' && req.method === 'POST') {
    const currentUser = requireUser(req);
    const targetUser = db.getUserById(pathParts[2]);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!targetUser) {
      notFound(res);
      return;
    }

    const result = db.followUser(currentUser.id, targetUser.id);
    send(res, 200, {
      user: db.publicUser(result.user),
      currentUser: db.publicUser(result.currentUser),
    });
    return;
  }

  if (url.pathname === '/api/posts' && req.method === 'GET') {
    send(res, 200, { posts: db.listPosts() });
    return;
  }

  if (url.pathname === '/api/posts' && req.method === 'POST') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }

    const body = await parseBody(req);
    if (!body.content && !body.mediaUrl) {
      send(res, 400, { error: 'content or mediaUrl is required' });
      return;
    }

    const post = db.createPost({
      authorId: currentUser.id,
      content: body.content || '',
      mediaUrl: body.mediaUrl || '',
    });
    send(res, 201, { post });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'posts' && pathParts[3] === 'like' && req.method === 'POST') {
    const currentUser = requireUser(req);
    const post = db.getPostById(pathParts[2]);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!post) {
      notFound(res);
      return;
    }

    send(res, 200, { post: db.togglePostLike(post.id, currentUser.id) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'posts' && pathParts[3] === 'save' && req.method === 'POST') {
    const currentUser = requireUser(req);
    const post = db.getPostById(pathParts[2]);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!post) {
      notFound(res);
      return;
    }

    send(res, 200, { post: db.togglePostSave(post.id, currentUser.id) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'posts' && pathParts[3] === 'comments' && req.method === 'POST') {
    const currentUser = requireUser(req);
    const post = db.getPostById(pathParts[2]);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!post) {
      notFound(res);
      return;
    }

    const body = await parseBody(req);
    if (!body.content) {
      send(res, 400, { error: 'content is required' });
      return;
    }

    send(res, 201, db.addPostComment(post.id, currentUser.id, body.content));
    return;
  }

  if (url.pathname === '/api/events' && req.method === 'GET') {
    send(res, 200, { events: db.listEvents() });
    return;
  }

  if (url.pathname === '/api/events' && req.method === 'POST') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    if (!['club_admin', 'Admin'].includes(currentUser.role)) {
      send(res, 403, { error: 'Only club admins can create events' });
      return;
    }

    const body = await parseBody(req);
    if (!body.title || !body.date || !body.venue) {
      send(res, 400, { error: 'title, date, and venue are required' });
      return;
    }

    const event = db.createEvent({
      title: body.title,
      description: body.description || '',
      category: body.category || 'General',
      date: body.date,
      venue: body.venue,
      organizer: body.organizer || currentUser.name,
      organizerId: currentUser.id,
      capacity: body.capacity || 100,
      points: body.points || 0,
      imageUrl: body.imageUrl,
    });
    send(res, 201, { event });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'events' && pathParts[2] && req.method === 'GET') {
    const event = db.getEventById(pathParts[2]);
    if (!event) {
      notFound(res);
      return;
    }
    send(res, 200, { event });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'events' && pathParts[3] === 'register' && req.method === 'POST') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }

    const result = db.registerForEvent(pathParts[2], currentUser.id);
    if (result.error === 'not-found') {
      notFound(res);
      return;
    }
    if (result.error === 'full') {
      send(res, 409, { error: 'Event capacity is full' });
      return;
    }

    send(res, 200, {
      event: result.event,
      user: db.publicUser(result.user),
    });
    return;
  }

  if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
    send(res, 200, { users: db.listLeaderboard() });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && req.method === 'GET') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }
    const otherUser = db.getUserById(pathParts[2]);
    if (!otherUser || otherUser.blockedAt) {
      notFound(res);
      return;
    }

    send(res, 200, { conversation: db.getOrCreateConversation(currentUser.id, pathParts[2]) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[3] === 'messages' && req.method === 'POST') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }

    const conversation = db.getConversation(pathParts[2]);
    if (!conversation || !conversation.participantIds.includes(currentUser.id)) {
      notFound(res);
      return;
    }

    const body = await parseBody(req);
    if (!body.content) {
      send(res, 400, { error: 'content is required' });
      return;
    }

    send(res, 201, db.addConversationMessage(conversation.id, currentUser.id, body.content));
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'chat' && pathParts[2] === 'channels' && pathParts[3] && pathParts[4] === 'messages' && req.method === 'GET') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }

    const messages = db.listChannelMessages(pathParts[3]);
    if (!messages) {
      notFound(res);
      return;
    }
    send(res, 200, { messages });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'chat' && pathParts[2] === 'channels' && pathParts[3] && pathParts[4] === 'messages' && req.method === 'POST') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }

    const body = await parseBody(req);
    const result = db.addChannelMessage(pathParts[3], currentUser.id, body.content);
    if (result.error === 'not-found') {
      notFound(res);
      return;
    }
    if (result.error === 'content-required') {
      send(res, 400, { error: 'content is required' });
      return;
    }
    send(res, 201, result);
    return;
  }

  if (url.pathname === '/api/assistant/message' && req.method === 'POST') {
    const currentUser = requireUser(req);
    if (!currentUser) {
      send(res, 401, { error: 'Authentication required' });
      return;
    }

    const body = await parseBody(req);
    send(res, 200, {
      reply: {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content: campusAssistantReply(body.message, currentUser),
        createdAt: new Date().toISOString(),
      },
    });
    return;
  }

  notFound(res);
}

const server = createServer((req, res) => {
  handleRoute(req, res).catch((error) => {
    send(res, error.message === 'Payload too large' ? 413 : 500, { error: error.message });
  });
});

server.listen(PORT, () => {
  console.log(`HIVE backend running at http://localhost:${PORT}`);
  console.log(`SQLite database: ${DB_FILE}`);
});
