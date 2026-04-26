# Stackd Backend API

Production-grade Node.js + Express + MongoDB REST API for the Stackd Startup Marketplace.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express 4
- **Database**: MongoDB + Mongoose ODM
- **Auth**: JWT (access + refresh token rotation)
- **Validation**: Joi
- **Security**: Helmet, CORS, express-rate-limit
- **File Upload**: Multer (logos + pitch decks)
- **Password Hashing**: bcryptjs (salt rounds: 12)

---

## Project Structure

```
stackd-backend/
├── src/
│   ├── server.js              # Entry point
│   ├── config/
│   │   └── database.js        # Mongoose connection
│   ├── controllers/
│   │   ├── authController.js       # Register, login, refresh, logout
│   │   ├── startupController.js    # Startup CRUD + analytics
│   │   ├── userController.js       # Profile management, admin
│   │   └── interactionController.js # Likes, bookmarks, comments, messages
│   ├── middleware/
│   │   ├── auth.js            # protect, optionalAuth, authorize
│   │   ├── errorHandler.js    # Global error handler
│   │   ├── notFound.js        # 404 handler
│   │   └── upload.js          # Multer configuration
│   ├── models/
│   │   ├── User.js            # User schema (bcrypt, roles, bookmarks)
│   │   ├── Startup.js         # Startup schema (slugs, full-text index)
│   │   ├── Comment.js         # Threaded comments
│   │   └── Message.js         # Investor-founder messaging
│   ├── routes/
│   │   ├── auth.js
│   │   ├── startups.js
│   │   ├── users.js
│   │   └── interactions.js
│   ├── utils/
│   │   ├── jwt.js             # Token generation + verification
│   │   ├── response.js        # Standardized API responses
│   │   └── seed.js            # Database seeder
│   └── validators/
│       └── index.js           # Joi schemas + validate middleware
├── uploads/                   # File uploads (auto-created)
├── .env.example
├── package.json
└── README.md
```

---

## Quick Start

### 1. Prerequisites
- Node.js 18+
- MongoDB 6+ (local or MongoDB Atlas)

### 2. Install dependencies
```bash
cd stackd-backend
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/stackd
JWT_ACCESS_SECRET=<generate a strong random string>
JWT_REFRESH_SECRET=<generate a different strong random string>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLIENT_URL=http://localhost:3000
```

Generate strong secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Seed the database (optional but recommended)
```bash
npm run seed
```

This creates demo accounts:
| Role     | Email                  | Password    |
|----------|------------------------|-------------|
| Founder  | founder@stackd.dev     | password123 |
| Investor | investor@stackd.dev    | password123 |
| Admin    | admin@stackd.dev       | password123 |

### 5. Start the server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

API will be available at: `http://localhost:5000`

---

## API Reference

### Authentication

| Method | Endpoint              | Auth     | Description         |
|--------|-----------------------|----------|---------------------|
| POST   | /api/auth/register    | None     | Create account      |
| POST   | /api/auth/login       | None     | Login               |
| POST   | /api/auth/refresh     | None     | Refresh tokens      |
| POST   | /api/auth/logout      | Bearer   | Logout + revoke RT  |
| GET    | /api/auth/me          | Bearer   | Get current user    |

**Register body:**
```json
{
  "name": "Alex Rivera",
  "email": "alex@example.com",
  "password": "password123",
  "role": "founder"
}
```

**Login response:**
```json
{
  "success": true,
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "user": { "_id": "...", "name": "...", "role": "founder" }
}
```

**Using tokens:**
```
Authorization: Bearer <accessToken>
```

**Refreshing:**
```json
POST /api/auth/refresh
{ "refreshToken": "eyJ..." }
```

---

### Startups

| Method | Endpoint                      | Auth            | Description           |
|--------|-------------------------------|-----------------|-----------------------|
| GET    | /api/startups                 | Optional        | List + search         |
| GET    | /api/startups/:id             | Optional        | Get single (by ID or slug) |
| POST   | /api/startups                 | Founder only    | Create startup        |
| PUT    | /api/startups/:id             | Owner/Admin     | Update startup        |
| DELETE | /api/startups/:id             | Owner/Admin     | Delete startup        |
| GET    | /api/startups/:id/analytics   | Owner/Admin     | View analytics        |

**GET /api/startups query params:**
```
?page=1&limit=12&search=AI&industry=Fintech&fundingStage=Seed&sort=trending
```

Sort options: `newest` | `oldest` | `trending` | `popular`

**POST /api/startups** (multipart/form-data):
```
name, tagline, description, industry, fundingStage, location, website
logo (file, optional), pitchDeck (file, optional)
```

---

### Users

| Method | Endpoint               | Auth        | Description           |
|--------|------------------------|-------------|-----------------------|
| GET    | /api/users/me          | Bearer      | Full profile + data   |
| PUT    | /api/users/me          | Bearer      | Update profile        |
| PUT    | /api/users/me/password | Bearer      | Change password       |
| GET    | /api/users/:id         | None        | Public profile        |
| GET    | /api/users             | Admin only  | List all users        |
| PUT    | /api/users/:id/status  | Admin only  | Activate/deactivate   |

---

### Interactions

| Method | Endpoint                            | Auth    | Description        |
|--------|-------------------------------------|---------|--------------------|
| POST   | /api/interactions/like/:startupId   | Bearer  | Toggle like        |
| POST   | /api/interactions/bookmark/:id      | Bearer  | Toggle bookmark    |
| GET    | /api/interactions/bookmarks         | Bearer  | My bookmarks       |
| GET    | /api/interactions/comments/:id      | None    | Get comments       |
| POST   | /api/interactions/comment/:id       | Bearer  | Post comment       |
| DELETE | /api/interactions/comment/:id       | Bearer  | Delete comment     |
| POST   | /api/interactions/message           | Bearer  | Send message       |
| GET    | /api/interactions/messages          | Bearer  | Get inbox          |
| PUT    | /api/interactions/messages/:id/read | Bearer  | Mark as read       |

---

## Security Features

- **JWT rotation**: Access tokens expire in 15m; refresh tokens in 7d and rotate on use
- **Token reuse detection**: Detects refresh token reuse and revokes all sessions
- **Password hashing**: bcryptjs with salt rounds = 12
- **Rate limiting**: 100 req/15min globally; 10 req/15min on auth routes
- **Helmet**: Sets secure HTTP headers
- **Input validation**: Joi schemas on all mutation endpoints
- **Soft deletes**: Comments are soft-deleted to preserve thread structure
- **Role-based access**: `founder`, `investor`, `admin` roles enforced per route

---

## Frontend Integration (Axios example)

```js
import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api' });

// Attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      const { data } = await api.post('/auth/refresh', {
        refreshToken: localStorage.getItem('refreshToken'),
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      err.config.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(err.config);
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## Deployment (Railway / Render / Fly.io)

1. Set all `.env` variables in your platform's dashboard
2. Set `NODE_ENV=production`
3. Set `MONGO_URI` to your MongoDB Atlas connection string
4. Deploy the `stackd-backend` directory
5. Update `CLIENT_URL` to your deployed frontend URL

**MongoDB Atlas free tier** works perfectly for this project.
