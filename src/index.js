require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');

const authRoutes = require('./routes/auth');
const ssRoutes = require('./routes/ss');
const myhomeRoutes = require('./routes/myhome');
const draftsRoutes = require('./routes/drafts');
const usersRoutes = require('./routes/users');
const imagesRoutes = require('./routes/images');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: function(origin, callback) { callback(null, true); },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'refreshtoken', 'refreshToken', 'Global-Authorization', 'X-Website-Key'],
  exposedHeaders: ['*'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.options('*', cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.use('/auth', authRoutes);
app.use('/ss', ssRoutes);
app.use('/myhome', myhomeRoutes);
app.use('/drafts', draftsRoutes);
app.use('/users', usersRoutes);
app.use('/images', imagesRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'MyEstate Backend მუშაობს ✅' });
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ სერვერი გაეშვა: http://localhost:${PORT}`);
  });
}).catch(e => {
  console.error('სერვერის გაშვება ვერ მოხდა:', e.message);
  process.exit(1);
});
