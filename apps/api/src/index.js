const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

console.log(`Using env file: ${envPath}`);
const uri = process.env.MONGODB_URI;
console.log(`MONGODB_URI prefix: ${uri ? uri.split(':')[0] + '://' : 'NOT SET'}`);

const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', require('./routes/auth'));
app.use('/sessions', require('./routes/sessions'));
app.use('/sessions/:id/join-requests', require('./routes/joinRequests'));
app.use('/join-requests', require('./routes/joinRequestActions'));
app.use('/sessions/:id', require('./routes/attendance'));
app.use('/notifications', require('./routes/notifications'));

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
