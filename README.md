# Rhythm Music API — Backend

Node.js + Express REST API for the Rhythm Music Streaming app. Uses MongoDB (Mongoose) and Cloudinary for file storage.

---

## Tech Stack

- Node.js / Express
- MongoDB / Mongoose
- Cloudinary (audio + image uploads)
- JWT Authentication
- Google & Apple OAuth

---

## Setup

```bash
cd music-player-backend
npm install
cp .env.example .env   # fill in your values
npm run dev
```

### Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRE` | Token expiry (default: 30d) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `NODE_ENV` | `development` or `production` |

---

## Base URL

```
http://localhost:5000/api
```

---

## Authentication

All protected routes require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <token>
```

Roles:
- `user` — regular user
- `admin` — full access including admin routes

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login with email & password |
| GET | `/api/auth/me` | Private | Get current user profile |
| POST | `/auth/google` | Public | Login / register via Google |
| POST | `/auth/apple` | Public | Login / register via Apple |

#### POST `/auth/register`
```json
// Request
{ "name": "John", "email": "john@example.com", "password": "secret123" }

// Response 201
{
  "success": true,
  "token": "<jwt>",
  "user": { "_id": "...", "name": "John", "email": "...", "role": "user", "avatar": "" }
}
```

#### POST `/auth/login`
```json
// Request
{ "email": "john@example.com", "password": "secret123" }

// Response 200
{
  "success": true,
  "token": "<jwt>",
  "user": { "_id": "...", "name": "John", "email": "...", "role": "user" }
}
```

#### POST `/auth/google`
```json
// Request
{ "idToken": "<google_id_token>" }
```

#### POST `/auth/apple`
```json
// Request
{ "identityToken": "<apple_identity_token>", "email": "user@example.com", "fullName": { "givenName": "John", "familyName": "Doe" } }
```

---

### Songs — `/api/songs`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/songs` | Public | Get all songs |
| GET | `/songs/trending` | Public | Get trending songs |
| GET | `/songs/:id` | Public | Get song by ID |
| POST | `/songs` | Admin | Upload a new song |
| PUT | `/songs/:id` | Admin | Update song metadata |
| DELETE | `/songs/:id` | Admin | Delete a song |
| POST | `/songs/:id/like` | Private | Toggle like on a song |
| POST | `/songs/:id/play` | Private | Track a play |

#### GET `/songs` — Query Params
| Param | Type | Description |
|---|---|---|
| `page` | number | Page number |
| `limit` | number | Results per page |
| `genre` | string | Filter by genre |
| `search` | string | Search by title/artist |

#### POST `/songs` — `multipart/form-data`
| Field | Type | Required |
|---|---|---|
| `audio` | file | Yes |
| `coverImage` | file | No |
| `title` | string | Yes |
| `artist` | string | Yes |
| `album` | string | No |
| `genre` | string | No |
| `duration` | number | No |
| `year` | number | No |

---

### Playlists — `/api/playlists`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/playlists` | Private | Create a playlist |
| GET | `/playlists/:userId` | Private | Get user's playlists |
| GET | `/playlists/single/:id` | Private | Get playlist by ID |
| PUT | `/playlists/:id` | Private | Update playlist |
| DELETE | `/playlists/:id` | Private | Delete playlist |
| POST | `/playlists/:id/songs/:songId` | Private | Add song to playlist |
| DELETE | `/playlists/:id/songs/:songId` | Private | Remove song from playlist |

#### POST `/playlists`
```json
{ "name": "My Playlist", "description": "Optional description" }
```

---

### Users — `/api/users`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/users/:id/liked` | Private | Get liked songs |
| GET | `/users/:id/recently-played` | Private | Get recently played songs |
| GET | `/users/:id/recommendations` | Private | Get recommended songs |
| PUT | `/users/profile` | Private | Update profile (name, bio, avatar) |

#### PUT `/users/profile`
- Send `multipart/form-data` with `avatar` file for image upload
- Send `application/json` for text-only updates (`name`, `bio`)

#### GET `/users/:id/recommendations`
| Param | Type | Description |
|---|---|---|
| `limit` | number | Max results (default: 20) |

---

### Search — `/api/search`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/search` | Public | Search songs |

#### GET `/search` — Query Params
| Param | Type | Description |
|---|---|---|
| `q` | string | Search query (title, artist, album, genre) |
| `page` | number | Page number |
| `limit` | number | Results per page |

---

### Admin — `/api/admin`

> All routes require `Authorization: Bearer <admin_token>`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/stats` | Dashboard stats (users, songs, plays) |
| GET | `/admin/analytics` | Analytics data for charts |
| GET | `/admin/users` | List all users |
| PUT | `/admin/users/:id/role` | Update user role |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/songs` | List all songs (with inactive) |
| PATCH | `/admin/songs/:id/toggle` | Toggle song active/inactive |

#### PUT `/admin/users/:id/role`
```json
{ "role": "admin" }
```

---

### Health Check

```
GET /api/health
→ { "status": "ok", "message": "Rhythm Music API is running 🎵" }
```

---

## Scripts

```bash
npm run dev    # Start with nodemon
npm start      # Start production
npm run seed   # Seed sample data
```

---

## Docker

```bash
docker build -t rhythm-backend .
docker run -p 5000:5000 --env-file .env rhythm-backend
```
