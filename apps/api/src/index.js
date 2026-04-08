const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

console.log(`Using env file: ${envPath}`);
const uri = process.env.MONGODB_URI;
console.log(`MONGODB_URI prefix: ${uri ? uri.split(':')[0] + '://' : 'NOT SET'}`);

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  /^http:\/\/localhost(:\d+)?$/,
  /^https?:\/\/[a-z0-9-]+\.onrender\.com$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/,
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = ALLOWED_ORIGINS.some((o) =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
  },
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));
app.options('*', cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', require('./routes/auth'));
app.use('/sessions', require('./routes/sessions'));
app.use('/sessions/:id/join-requests', require('./routes/joinRequests'));
app.use('/join-requests', require('./routes/joinRequestActions'));
app.use('/sessions/:id', require('./routes/attendance'));
app.use('/notifications', require('./routes/notifications'));
app.use('/me', require('./routes/me'));
app.use('/users', require('./routes/users'));
app.use('/sessions/:id', require('./routes/messages'));

if (uri) {
  mongoose
    .connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error(`MongoDB connection failed: ${err.message}`));
}

const { startNotificationJobs } = require('./jobs/notificationJobs');

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
  startNotificationJobs();
});
