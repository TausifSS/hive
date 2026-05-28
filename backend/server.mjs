import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { db, DB_FILE, isPostgres } from './db.mjs';

const PORT = Number(process.env.PORT || 4000);
const OTP_DELIVERY_MODE = (process.env.OTP_DELIVERY_MODE || (process.env.RESEND_API_KEY ? 'email' : 'development')).toLowerCase();
const OTP_EXPOSE_DEV_OTP = process.env.OTP_EXPOSE_DEV_OTP === 'true';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const OTP_FROM_EMAIL = process.env.OTP_FROM_EMAIL || 'HIVE <onboarding@resend.dev>';
const OTP_REPLY_TO = process.env.OTP_REPLY_TO || '';
const ADMIN_LOGIN_ID = process.env.ADMIN_LOGIN_ID || 'admin';
const ADMIN_LOGIN_PASSWORD = process.env.ADMIN_LOGIN_PASSWORD || 'admin123';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
const MAX_BODY_BYTES = 5_000_000;
const MIN_PASSWORD_LENGTH = 6;

const activeClients = [];

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of activeClients) {
    try {
      client.res.write(payload);
    } catch (e) {
      // connection broken or closed
    }
  }
}

function getJsonHeaders(req) {
  const origin = req.headers.origin;
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'https://tausifss.github.io'];
  const isAllowed = allowedOrigins.includes(origin) || (origin && (origin.endsWith('.vercel.app') || origin === 'https://vercel.app'));
  const corsOrigin = isAllowed ? origin : (process.env.CLIENT_ORIGIN || '*');

  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };
}

function send(req, res, status, payload) {
  res.writeHead(status, getJsonHeaders(req));
  res.end(JSON.stringify(payload));
}

function notFound(req, res) {
  send(req, res, 404, { error: 'Not found' });
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

async function requireUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return await db.getUserBySessionToken(token);
}

function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : '';
}

function isAdmin(user) {
  return user?.role === 'Admin';
}

function sendForbidden(req, res) {
  send(req, res, 403, { error: 'You do not have permission for this action' });
}

function validatePassword(password) {
  return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
}

async function sendSession(req, res, user) {
  const session = await db.createSession(user.id);
  send(req, res, 200, { token: session.token, expiresAt: session.expiresAt, user: db.publicUser(user) });
}

async function findAdminForLogin(adminId, password) {
  const loginId = String(adminId || '').trim();
  const loginPassword = String(password || '');

  const existingAdmin = loginId.includes('@')
    ? await db.getUserByEmail(loginId)
    : await db.getUserByIdOrHandle(loginId);

  if (existingAdmin?.role === 'Admin' && db.verifyPassword(loginPassword, existingAdmin.passwordHash)) {
    return existingAdmin;
  }

  if (ADMIN_LOGIN_PASSWORD && loginId === ADMIN_LOGIN_ID && loginPassword === ADMIN_LOGIN_PASSWORD) {
    const directAdmin = await db.getUserById('college-admin');
    if (directAdmin?.role === 'Admin') return directAdmin;
    if (directAdmin) {
      const admin = await db.updateUserRole(directAdmin.id, 'Admin');
      await db.setUserPassword(admin.id, ADMIN_LOGIN_PASSWORD);
      return admin;
    }

    return await db.createUser({
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

async function campusAssistantReply(message, user) {
  const text = String(message || '').trim();
  const lowerText = text.toLowerCase();
  const eventCount = (await db.listEvents()).length;
  const postCount = (await db.listPosts()).length;
  const storyCount = (await db.listTopStories()).length;
  const globalChatCount = (await db.listChannelMessages('global'))?.length || 0;

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
    res.writeHead(204, getJsonHeaders(req));
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname === '/api/updates' && req.method === 'GET') {
    const origin = req.headers.origin;
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'https://tausifss.github.io'];
    const isAllowed = allowedOrigins.includes(origin) || (origin && (origin.endsWith('.vercel.app') || origin === 'https://vercel.app'));
    const corsOrigin = isAllowed ? origin : (process.env.CLIENT_ORIGIN || '*');

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
    });

    res.write(':ok\n\n');

    const userId = url.searchParams.get('userId');
    const client = { res, userId };
    activeClients.push(client);

    req.on('close', () => {
      const idx = activeClients.indexOf(client);
      if (idx !== -1) {
        activeClients.splice(idx, 1);
      }
    });
    return;
  }

  const pathParts = url.pathname.split('/').filter(Boolean);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    send(req, res, 200, {
      status: 'ok',
      service: 'hive-api',
      storage: isPostgres ? 'postgresql' : 'sqlite',
      database: DB_FILE,
      time: new Date().toISOString(),
    });
    return;
  }
 
  if (url.pathname === '/api/users/online' && req.method === 'GET') {
    const onlineUserIds = activeClients.map((c) => c.userId).filter(Boolean);
    send(req, res, 200, {
      success: true,
      onlineUserIds: Array.from(new Set(onlineUserIds)),
    });
    return;
  }

  if (url.pathname === '/api/auth/request-otp' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(req, res, 400, { error: 'Use your college email address to continue' });
      return;
    }

    const user = await db.getUserByEmail(body.email);
    if (user?.blockedAt) {
      send(req, res, 403, { error: 'This account is blocked. Contact college admin.' });
      return;
    }

    const otp = await db.createLoginOtp(body.email);
    let delivery;
    try {
      delivery = await deliverOtpEmail(body.email, otp.otp, otp.expiresAt);
    } catch (emailError) {
      send(req, res, 502, { error: emailError.message });
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

    send(req, res, 200, {
      ...payload,
    });
    return;
  }

  if ((url.pathname === '/api/auth/login' || url.pathname === '/api/auth/student-login') && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(req, res, 400, { error: 'Use your college email address to continue' });
      return;
    }

    const user = await db.getUserByEmail(body.email);
    if (!user) {
      send(req, res, 404, { error: 'Account not found. Use Forgot Password to verify email and set your password.' });
      return;
    }
    if (user.blockedAt) {
      send(req, res, 403, { error: 'This account is blocked. Contact college admin.' });
      return;
    }
    if (!db.verifyPassword(body.password, user.passwordHash)) {
      send(req, res, 401, { error: 'Invalid email or password' });
      return;
    }

    await sendSession(req, res, user);
    return;
  }

  if (url.pathname === '/api/auth/student/set-password' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(req, res, 400, { error: 'Use your college email address to continue' });
      return;
    }
    if (!validatePassword(body.password)) {
      send(req, res, 400, { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }

    const result = await db.verifyLoginOtp(body.email, body.otp);
    if (!result.ok) {
      send(req, res, 401, { error: result.error });
      return;
    }

    const user = await db.getOrCreateStudentWithPassword({
      email: body.email,
      name: body.name,
      password: body.password,
    });
    await sendSession(req, res, user);
    return;
  }

  if (url.pathname === '/api/auth/google' && req.method === 'POST') {
    const body = await parseBody(req);
    try {
      const profile = await verifyGoogleIdToken(body.idToken);
      if (!db.isCollegeEmail(profile.email)) {
        send(req, res, 400, { error: 'Use your college Google account to continue' });
        return;
      }

      let user = await db.getUserByEmail(profile.email);
      if (!user) {
        user = await db.createUser({
          name: profile.name,
          email: profile.email,
          password: randomUUID(),
          role: 'student',
        });
        if (profile.picture) {
          user = await db.updateUserProfile(user.id, { name: user.name, avatarUrl: profile.picture });
        }
      }
      if (user.blockedAt) {
        send(req, res, 403, { error: 'This account is blocked. Contact college admin.' });
        return;
      }

      await sendSession(req, res, user);
    } catch (googleError) {
      send(req, res, 502, { error: googleError.message });
    }
    return;
  }

  if (url.pathname === '/api/auth/club-login' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(req, res, 400, { error: 'Use your college email address to continue' });
      return;
    }

    const user = await db.getUserByEmail(body.email);
    if (user) {
      if (user.blockedAt) {
        send(req, res, 403, { error: 'This account is blocked. Contact college admin.' });
        return;
      }
      if (!db.verifyPassword(body.password, user.passwordHash)) {
        send(req, res, 401, { error: 'Invalid email or password' });
        return;
      }
      await sendSession(req, res, user);
      return;
    }

    const application = await db.getClubApplicationByEmail(body.email);
    if (application) {
      send(req, res, 202, { application: db.publicClubApplication(application), error: `Club verification is ${application.status}` });
      return;
    }

    send(req, res, 404, { error: 'Club account not found. Upload certificate for verification.' });
    return;
  }

  if (url.pathname === '/api/auth/club/register' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(req, res, 400, { error: 'Use your club official college email' });
      return;
    }
    if (!body.clubName || !body.certificateName || !body.certificateData) {
      send(req, res, 400, { error: 'Club name and registration certificate are required' });
      return;
    }
    if (!validatePassword(body.password)) {
      send(req, res, 400, { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
      return;
    }

    const existingUser = await db.getUserByEmail(body.email);
    if (existingUser?.role === 'club_admin') {
      send(req, res, 409, { error: 'Club account is already verified. Use Club login.' });
      return;
    }
    if (existingUser) {
      send(req, res, 409, { error: 'This email already belongs to another HIVE account.' });
      return;
    }

    const application = await db.upsertClubApplication({
      clubName: body.clubName,
      officialEmail: body.email,
      password: body.password,
      certificateName: body.certificateName,
      certificateData: body.certificateData,
    });
    send(req, res, 202, { application: db.publicClubApplication(application) });
    return;
  }

  if (url.pathname === '/api/auth/club/status' && req.method === 'GET') {
    const email = url.searchParams.get('email');
    if (!email) {
      send(req, res, 400, { error: 'email is required' });
      return;
    }

    const user = await db.getUserByEmail(email);
    if (user?.role === 'club_admin') {
      send(req, res, 200, { status: 'approved', user: db.publicUser(user) });
      return;
    }

    const application = await db.getClubApplicationByEmail(email);
    if (!application) {
      send(req, res, 404, { error: 'No club verification request found' });
      return;
    }
    send(req, res, 200, { status: application.status, application: db.publicClubApplication(application) });
    return;
  }

  if (url.pathname === '/api/auth/admin-login' && req.method === 'POST') {
    const body = await parseBody(req);
    const admin = await findAdminForLogin(body.adminId, body.password);
    if (!admin) {
      send(req, res, 401, { error: 'Invalid admin ID or password' });
      return;
    }
    if (admin.blockedAt) {
      send(req, res, 403, { error: 'This admin account is blocked.' });
      return;
    }

    await sendSession(req, res, admin);
    return;
  }

  if (url.pathname === '/api/auth/verify-otp' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!db.isCollegeEmail(body.email)) {
      send(req, res, 400, { error: 'Use your college email address to continue' });
      return;
    }

    const result = await db.verifyLoginOtp(body.email, body.otp);
    if (!result.ok) {
      send(req, res, 401, { error: result.error });
      return;
    }

    const user = await db.getOrCreateOtpUser({ email: body.email, name: body.name });
    if (user.blockedAt) {
      send(req, res, 403, { error: 'This account is blocked. Contact college admin.' });
      return;
    }

    await sendSession(req, res, user);
    return;
  }

  if (url.pathname === '/api/auth/register' && req.method === 'POST') {
    send(req, res, 410, { error: 'Direct registration is disabled. Use college email OTP login.' });
    return;
  }

  if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
    await db.revokeSession(getBearerToken(req));
    send(req, res, 200, { ok: true });
    return;
  }

  if (url.pathname === '/api/auth/me' && req.method === 'GET') {
    const user = await requireUser(req);
    if (!user) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    send(req, res, 200, { user: db.publicUser(user) });
    return;
  }

  if (url.pathname === '/api/users/me' && req.method === 'PATCH') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }

    const body = await parseBody(req);
    const updatedUser = await db.updateUserProfile(currentUser.id, body);
    if (updatedUser?.error === 'name-required') {
      send(req, res, 400, { error: 'Name is required' });
      return;
    }
    send(req, res, 200, { user: db.publicUser(updatedUser) });
    return;
  }

  if (url.pathname === '/api/users' && req.method === 'GET') {
    const users = await db.listUsers();
    send(req, res, 200, { users: users.map(db.publicUser) });
    return;
  }

  if (url.pathname === '/api/stories' && req.method === 'GET') {
    await db.deleteExpiredTopStories();
    const stories = await db.listTopStories();
    send(req, res, 200, { stories });
    return;
  }

  if (url.pathname === '/api/stories' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser) && currentUser.role !== 'club_admin') {
      sendForbidden(req, res);
      return;
    }

    const body = await parseBody(req);
    if (!body.title || !body.summary) {
      send(req, res, 400, { error: 'title and summary are required' });
      return;
    }
    const story = await db.createTopStory({ ...body, authorId: currentUser.id });
    send(req, res, 201, { story });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'stories' && pathParts[2] && req.method === 'GET') {
    const story = await db.getTopStoryById(pathParts[2]);
    if (!story) {
      notFound(req, res);
      return;
    }
    send(req, res, 200, { story });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'stories' && pathParts[2] && req.method === 'PATCH') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser) && currentUser.role !== 'club_admin') {
      sendForbidden(req, res);
      return;
    }

    const body = await parseBody(req);
    if (!body.title || !body.summary) {
      send(req, res, 400, { error: 'title and summary are required' });
      return;
    }

    const updated = await db.updateTopStory(pathParts[2], body);
    send(req, res, 200, { story: updated });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'stories' && pathParts[2] && req.method === 'DELETE') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser) && currentUser.role !== 'club_admin') {
      sendForbidden(req, res);
      return;
    }

    await db.deleteTopStory(pathParts[2]);
    send(req, res, 200, { ok: true });
    return;
  }

  if (url.pathname === '/api/admin/users' && req.method === 'GET') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(req, res);
      return;
    }
    const users = await db.listUsers();
    send(req, res, 200, { users: users.map(db.publicUser) });
    return;
  }

  if (url.pathname === '/api/admin/club-applications' && req.method === 'GET') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(req, res);
      return;
    }
    const applications = await db.listClubApplications();
    send(req, res, 200, { applications: applications.map(db.publicClubApplication) });
    return;
  }

  if (url.pathname === '/api/admin/reports' && req.method === 'GET') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(req, res);
      return;
    }

    const reports = await db.listPostReports();
    send(req, res, 200, { reports });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'admin' && pathParts[2] === 'reports' && pathParts[3] && req.method === 'DELETE') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(req, res);
      return;
    }

    await db.deletePostReport(pathParts[3]);
    send(req, res, 200, { ok: true });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'admin' && pathParts[2] === 'club-applications' && pathParts[3] && pathParts[4] === 'review' && req.method === 'PATCH') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(req, res);
      return;
    }

    const body = await parseBody(req);
    if (!['approved', 'rejected'].includes(body.status)) {
      send(req, res, 400, { error: 'status must be approved or rejected' });
      return;
    }

    const application = await db.reviewClubApplication(pathParts[3], body.status, currentUser.id, body.note || '');
    if (!application) {
      notFound(req, res);
      return;
    }

    send(req, res, 200, { application: db.publicClubApplication(application) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'admin' && pathParts[2] === 'users' && pathParts[3] && pathParts[4] === 'role' && req.method === 'PATCH') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(req, res);
      return;
    }

    const targetUser = await db.getUserById(pathParts[3]);
    const body = await parseBody(req);
    const allowedRoles = ['student', 'club_admin', 'Admin'];
    if (!targetUser) {
      notFound(req, res);
      return;
    }
    if (!allowedRoles.includes(body.role)) {
      send(req, res, 400, { error: 'Invalid role' });
      return;
    }
    if (targetUser.id === currentUser.id && body.role !== 'Admin') {
      send(req, res, 400, { error: 'College admin cannot remove their own admin role' });
      return;
    }

    const updated = await db.updateUserRole(targetUser.id, body.role);
    send(req, res, 200, { user: db.publicUser(updated) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'admin' && pathParts[2] === 'users' && pathParts[3] && pathParts[4] === 'block' && req.method === 'PATCH') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(req, res);
      return;
    }

    const targetUser = await db.getUserById(pathParts[3]);
    const body = await parseBody(req);
    if (!targetUser) {
      notFound(req, res);
      return;
    }
    if (targetUser.id === currentUser.id) {
      send(req, res, 400, { error: 'College admin cannot block their own account' });
      return;
    }

    const updated = await db.setUserBlocked(targetUser.id, Boolean(body.blocked));
    send(req, res, 200, { user: db.publicUser(updated) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'admin' && pathParts[2] === 'users' && pathParts[3] && req.method === 'DELETE') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!isAdmin(currentUser)) {
      sendForbidden(req, res);
      return;
    }

    const targetUser = await db.getUserById(pathParts[3]);
    if (!targetUser) {
      notFound(req, res);
      return;
    }
    if (targetUser.id === currentUser.id) {
      send(req, res, 400, { error: 'College admin cannot delete their own account' });
      return;
    }

    await db.deleteUser(targetUser.id);
    send(req, res, 200, { ok: true });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'users' && pathParts[2] && req.method === 'GET') {
    const user = await db.getUserByIdOrHandle(pathParts[2]);
    if (!user) {
      notFound(req, res);
      return;
    }
    send(req, res, 200, { user: db.publicUser(user) });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'users' && pathParts[3] === 'follow' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    const targetUser = await db.getUserById(pathParts[2]);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!targetUser) {
      notFound(req, res);
      return;
    }

    const result = await db.followUser(currentUser.id, targetUser.id);
    send(req, res, 200, {
      user: db.publicUser(result.user),
      currentUser: db.publicUser(result.currentUser),
    });
    return;
  }

  if (url.pathname === '/api/posts' && req.method === 'GET') {
    const posts = await db.listPosts();
    send(req, res, 200, { posts });
    return;
  }

  if (url.pathname === '/api/posts' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }

    const body = await parseBody(req);
    if (!body.content && !body.mediaUrl) {
      send(req, res, 400, { error: 'content or mediaUrl is required' });
      return;
    }

    const post = await db.createPost({
      authorId: currentUser.id,
      content: body.content || '',
      mediaUrl: body.mediaUrl || '',
    });
    send(req, res, 201, { post });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'posts' && pathParts[2] && !pathParts[3] && req.method === 'DELETE') {
    const currentUser = await requireUser(req);
    const post = await db.getPostById(pathParts[2]);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!post) {
      notFound(req, res);
      return;
    }
    if (post.authorId !== currentUser.id && currentUser.role !== 'Admin') {
      sendForbidden(req, res);
      return;
    }

    await db.deletePost(post.id);
    send(req, res, 200, { ok: true });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'posts' && pathParts[2] && !pathParts[3] && req.method === 'PATCH') {
    const currentUser = await requireUser(req);
    const post = await db.getPostById(pathParts[2]);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!post) {
      notFound(req, res);
      return;
    }
    if (post.authorId !== currentUser.id) {
      sendForbidden(req, res);
      return;
    }

    const body = await parseBody(req);
    if (!body.content) {
      send(req, res, 400, { error: 'content is required' });
      return;
    }

    const updated = await db.updatePost(post.id, body.content);
    send(req, res, 200, { post: updated });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'posts' && pathParts[3] === 'like' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    const post = await db.getPostById(pathParts[2]);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!post) {
      notFound(req, res);
      return;
    }

    const updated = await db.togglePostLike(post.id, currentUser.id);
    send(req, res, 200, { post: updated });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'posts' && pathParts[3] === 'save' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    const post = await db.getPostById(pathParts[2]);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!post) {
      notFound(req, res);
      return;
    }

    const updated = await db.togglePostSave(post.id, currentUser.id);
    send(req, res, 200, { post: updated });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'posts' && pathParts[3] === 'comments' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    const post = await db.getPostById(pathParts[2]);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!post) {
      notFound(req, res);
      return;
    }

    const body = await parseBody(req);
    if (!body.content) {
      send(req, res, 400, { error: 'content is required' });
      return;
    }

    const commentRes = await db.addPostComment(post.id, currentUser.id, body.content);
    send(req, res, 201, commentRes);
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'posts' && pathParts[2] && pathParts[3] === 'report' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }

    const post = await db.getPostById(pathParts[2]);
    if (!post) {
      notFound(req, res);
      return;
    }

    const body = await parseBody(req);
    if (!body.reason) {
      send(req, res, 400, { error: 'reason is required' });
      return;
    }

    const report = await db.createPostReport(post.id, currentUser.id, body.reason);
    send(req, res, 201, { success: true, report });
    return;
  }

  if (url.pathname === '/api/events' && req.method === 'GET') {
    const events = await db.listEvents();
    send(req, res, 200, { events });
    return;
  }

  if (url.pathname === '/api/events' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!['club_admin', 'Admin'].includes(currentUser.role)) {
      send(req, res, 403, { error: 'Only club admins can create events' });
      return;
    }

    const body = await parseBody(req);
    if (!body.title || !body.date || !body.venue) {
      send(req, res, 400, { error: 'title, date, and venue are required' });
      return;
    }

    const event = await db.createEvent({
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
    send(req, res, 201, { event });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'events' && pathParts[2] && !pathParts[3] && req.method === 'GET') {
    const event = await db.getEventById(pathParts[2]);
    if (!event) {
      notFound(req, res);
      return;
    }
    send(req, res, 200, { event });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'events' && pathParts[2] && !pathParts[3] && req.method === 'DELETE') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const event = await db.getEventById(pathParts[2]);
    if (!event) {
      notFound(req, res);
      return;
    }
    if (event.organizerId !== currentUser.id && currentUser.role !== 'Admin') {
      send(req, res, 403, { error: 'Forbidden' });
      return;
    }
    await db.deleteEvent(pathParts[2]);
    send(req, res, 200, { ok: true });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'events' && pathParts[2] && !pathParts[3] && req.method === 'PATCH') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const event = await db.getEventById(pathParts[2]);
    if (!event) {
      notFound(req, res);
      return;
    }
    if (event.organizerId !== currentUser.id && currentUser.role !== 'Admin') {
      sendForbidden(req, res);
      return;
    }

    const body = await parseBody(req);
    const updated = await db.updateEvent(event.id, body);
    send(req, res, 200, { event: updated });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'events' && pathParts[2] && pathParts[3] === 'registrations' && req.method === 'GET') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const event = await db.getEventById(pathParts[2]);
    if (!event) {
      notFound(req, res);
      return;
    }
    if (event.organizerId !== currentUser.id && currentUser.role !== 'Admin') {
      send(req, res, 403, { error: 'Forbidden' });
      return;
    }
    const list = await db.listEventRegistrations(pathParts[2]);
    send(req, res, 200, { registrations: list });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'events' && pathParts[3] === 'register' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }

    const result = await db.registerForEvent(pathParts[2], currentUser.id);
    if (result.error === 'not-found') {
      notFound(req, res);
      return;
    }
    if (result.error === 'full') {
      send(req, res, 409, { error: 'Event capacity is full' });
      return;
    }

    send(req, res, 200, {
      event: result.event,
      user: db.publicUser(result.user),
    });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'events' && pathParts[2] && pathParts[3] === 'attendance' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    if (!['club_admin', 'Admin'].includes(currentUser.role)) {
      sendForbidden(req, res);
      return;
    }

    const event = await db.getEventById(pathParts[2]);
    if (!event) {
      notFound(req, res);
      return;
    }

    const body = await parseBody(req);
    const targetUser = await db.getUserByIdOrHandle(body.userId);
    if (!targetUser) {
      send(req, res, 404, { error: 'Student not found. Double check their student ID/username.' });
      return;
    }

    const result = await db.verifyAttendance(event.id, targetUser.id);
    if (!result) {
      send(req, res, 500, { error: 'Verification failed' });
      return;
    }

    send(req, res, 200, {
      success: true,
      event: result.event,
      user: db.publicUser(result.user)
    });
    return;
  }

  if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
    const users = await db.listLeaderboard();
    send(req, res, 200, { users });
    return;
  }

  if (url.pathname === '/api/conversations' && req.method === 'GET') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const conversations = await db.listConversationsForUser(currentUser.id);
    send(req, res, 200, { conversations });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && req.method === 'GET') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const otherUser = await db.getUserById(pathParts[2]);
    if (!otherUser || otherUser.blockedAt) {
      notFound(req, res);
      return;
    }

    const conversation = await db.getOrCreateConversation(currentUser.id, pathParts[2]);
    send(req, res, 200, { conversation });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[3] === 'messages' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }

    const conversation = await db.getConversation(pathParts[2]);
    if (!conversation || !conversation.participantIds.includes(currentUser.id)) {
      notFound(req, res);
      return;
    }

    const body = await parseBody(req);
    if (!body.content && !body.mediaUrl) {
      send(req, res, 400, { error: 'content is required' });
      return;
    }

    const msgRes = await db.addConversationMessage(conversation.id, currentUser.id, body.content || '', body.mediaUrl || '');
    
    // Broadcast message via SSE
    broadcast('message', { conversationId: conversation.id, message: msgRes.message });

    send(req, res, 201, msgRes);
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[3] === 'typing' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }

    const body = await parseBody(req);
    broadcast('typing', {
      conversationId: pathParts[2],
      userId: currentUser.id,
      name: currentUser.name,
      isTyping: Boolean(body.isTyping),
    });

    send(req, res, 200, { ok: true });
    return;
  }

  // Conversation Message Unsend (Delete)
  if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] === 'messages' && pathParts[3] && req.method === 'DELETE') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const result = await db.deleteConversationMessage(pathParts[3], currentUser.id);
    if (result.error === 'not-found') {
      notFound(req, res);
      return;
    }
    if (result.error === 'forbidden') {
      send(req, res, 403, { error: 'You can only unsend your own messages' });
      return;
    }
    // Broadcast message deletion via SSE
    broadcast('message_deleted', { conversationId: result.conversationId, messageId: pathParts[3] });
    send(req, res, 200, { ok: true });
    return;
  }

  // Channel Message Unsend (Delete)
  if (pathParts[0] === 'api' && pathParts[1] === 'chat' && pathParts[2] === 'channels' && pathParts[3] === 'messages' && pathParts[4] && req.method === 'DELETE') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const result = await db.deleteChannelMessage(pathParts[4], currentUser.id);
    if (result.error === 'not-found') {
      notFound(req, res);
      return;
    }
    if (result.error === 'forbidden') {
      send(req, res, 403, { error: 'You can only unsend your own messages' });
      return;
    }
    // Broadcast channel message deletion via SSE
    broadcast('channel_message_deleted', { channelId: result.channelId, messageId: pathParts[4] });
    send(req, res, 200, { ok: true });
    return;
  }

  // Conversation Auto-Delete Settings Update
  if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && pathParts[3] === 'settings' && req.method === 'PATCH') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const body = await parseBody(req);
    const autoDeleteHours = Number(body.autoDeleteHours || 0);
    
    await db.updateConversationSettings(pathParts[2], autoDeleteHours);
    // Broadcast settings update via SSE
    broadcast('settings_updated', { type: 'conversation', id: pathParts[2], autoDeleteHours });
    
    send(req, res, 200, { ok: true });
    return;
  }

  // Channel Auto-Delete Settings Update
  if (pathParts[0] === 'api' && pathParts[1] === 'chat' && pathParts[2] === 'channels' && pathParts[3] && pathParts[4] === 'settings' && req.method === 'PATCH') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const body = await parseBody(req);
    const autoDeleteHours = Number(body.autoDeleteHours || 0);
    
    await db.updateChannelSettings(pathParts[3], autoDeleteHours);
    // Broadcast settings update via SSE
    broadcast('settings_updated', { type: 'channel', id: pathParts[3], autoDeleteHours });
    
    send(req, res, 200, { ok: true });
    return;
  }

  // Chat Reporting API
  if (url.pathname === '/api/reports/chat' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const body = await parseBody(req);
    if (!body.type || !body.targetId || !body.reason) {
      send(req, res, 400, { error: 'type, targetId, and reason are required' });
      return;
    }
    
    const result = await db.createChatReport(body.type, body.targetId, currentUser.id, body.reason);
    send(req, res, 201, result);
    return;
  }

  if (url.pathname === '/api/chat/channels' && req.method === 'GET') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const channels = await db.listChannels();
    send(req, res, 200, { channels });
    return;
  }

  if (url.pathname === '/api/chat/channels' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }
    const body = await parseBody(req);
    if (!body.name || !body.category) {
      send(req, res, 400, { error: 'name and category are required' });
      return;
    }
    const channel = await db.createChannel({
      name: body.name,
      category: body.category,
      createdBy: currentUser.id,
    });
    send(req, res, 201, { channel });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'chat' && pathParts[2] === 'channels' && pathParts[3] && pathParts[4] === 'messages' && req.method === 'GET') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }

    const messages = await db.listChannelMessages(pathParts[3]);
    if (!messages) {
      notFound(req, res);
      return;
    }
    send(req, res, 200, { messages });
    return;
  }

  if (pathParts[0] === 'api' && pathParts[1] === 'chat' && pathParts[2] === 'channels' && pathParts[3] && pathParts[4] === 'messages' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }

    const body = await parseBody(req);
    const result = await db.addChannelMessage(pathParts[3], currentUser.id, body.content || '', body.mediaUrl || '');
    if (result.error === 'not-found') {
      notFound(req, res);
      return;
    }
    if (result.error === 'content-required') {
      send(req, res, 400, { error: 'content is required' });
      return;
    }

    // Broadcast channel message via SSE
    broadcast('channel_message', { channelId: pathParts[3], message: result.message });

    send(req, res, 201, result);
    return;
  }

  if (url.pathname === '/api/assistant/message' && req.method === 'POST') {
    const currentUser = await requireUser(req);
    if (!currentUser) {
      send(req, res, 401, { error: 'Authentication required' });
      return;
    }

    const body = await parseBody(req);
    const replyText = await campusAssistantReply(body.message, currentUser);
    send(req, res, 200, {
      reply: {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content: replyText,
        createdAt: new Date().toISOString(),
      },
    });
    return;
  }

  notFound(req, res);
}

const server = createServer((req, res) => {
  handleRoute(req, res).catch((error) => {
    send(req, res, error.message === 'Payload too large' ? 413 : 500, { error: error.message });
  });
});

server.listen(PORT, () => {
  console.log(`HIVE backend running at http://localhost:${PORT}`);
  console.log(`SQLite database: ${DB_FILE}`);
});
