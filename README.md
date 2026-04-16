# Dobby Ads - Full Stack Drive Assignment

A Google Drive-like web application with nested folders, image uploads, and user-specific access control.

**Tech Stack:** React · Node.js · MongoDB · Express · JWT Auth  
**Bonus:** MCP Server for AI assistant integration (Claude Desktop)

---

## Features

- **Auth** — Signup / Login / Logout with JWT (no Firebase)
- **Nested Folders** — Create folders inside folders, unlimited depth
- **Folder Size** — Each folder shows total size of all images recursively
- **Image Upload** — Upload images with a custom name, drag-and-drop support
- **User Isolation** — Each user only sees their own folders and images
- **MCP Server (Bonus)** — AI assistants can manage your drive via natural language

---

## Project Structure

```
dobby-ads/
├── backend/              Express + MongoDB API
│   ├── models/           User, Folder, Image schemas
│   ├── controllers/      Auth, Folder, Image logic
│   ├── routes/           REST endpoints
│   ├── middleware/        JWT auth, Multer upload
│   └── uploads/          Stored image files
├── frontend/             React SPA
│   └── src/
│       ├── pages/        Login, Signup, Drive
│       ├── components/   Modals, Lightbox, ProtectedRoute
│       ├── api/          Axios wrappers
│       ├── context/      Auth context
│       └── utils/        Helpers
├── mcp-server/           MCP server (Bonus)
└── docker-compose.yml    Full stack Docker setup
```

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB running locally (or use [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Backend

```bash
cd backend
cp .env.example .env          # On Windows: copy .env.example .env
# Edit .env: set MONGO_URI and JWT_SECRET
npm install
npm run dev                   # Runs on http://localhost:5000
```

> Generate a secure JWT secret:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 2. Frontend

```bash
cd frontend
npm install
npm start                     # Runs on http://localhost:3000
```

The frontend proxies `/api` requests to `localhost:5000` automatically.

> **Note:** Both backend and frontend must be running simultaneously in separate terminals.

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (protected) |

### Folders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/folders?parent=<id>` | List folders (root or children) |
| GET | `/api/folders/:id` | Get folder + breadcrumbs + size |
| POST | `/api/folders` | Create folder `{ name, parent? }` |
| PUT | `/api/folders/:id` | Rename folder `{ name }` |
| DELETE | `/api/folders/:id` | Delete folder + all contents |

### Images
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/images?folder=<id>` | List images in a folder |
| POST | `/api/images` | Upload image `multipart/form-data { name, image, folder }` |
| DELETE | `/api/images/:id` | Delete image |

All routes except auth require `Authorization: Bearer <token>` header.

---

## Docker Deployment

```bash
# At project root
cp backend/.env.example .env   # set JWT_SECRET etc.
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- MongoDB: localhost:27017

---

## MCP Server (Bonus)

Exposes drive actions as tools for Claude Desktop and other MCP-compatible AI assistants.

### Setup

```bash
cd mcp-server
cp .env.example .env
# Set API_BASE_URL and API_TOKEN (get token by logging in via API)
npm install
```

### Get your API token

**macOS / Linux:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"yourpassword"}'
```

**Windows (PowerShell):**
```powershell
Invoke-RestMethod -Uri http://localhost:5000/api/auth/login -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"email":"you@example.com","password":"yourpassword"}'
```

Copy the `token` from the response into `mcp-server/.env`.

### Configure Claude Desktop

Add to your Claude Desktop config:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dobby-ads-drive": {
      "command": "node",
      "args": ["/absolute/path/to/dobby-ads/mcp-server/index.js"],
      "env": {
        "API_BASE_URL": "http://localhost:5000/api",
        "API_TOKEN": "your_jwt_token_here"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_folders` | List folders (optionally by parent) |
| `create_folder` | Create a folder by name + optional parent |
| `get_folder` | Get folder details including size |
| `delete_folder` | Delete folder and all contents |
| `list_images` | List images inside a folder |
| `upload_image` | Upload a local file into a folder |
| `delete_image` | Delete an image by ID |
| `get_me` | Get authenticated user info |

### Testing with MCP Inspector

You can test the MCP server independently (without Claude Desktop) using the official inspector:

```bash
cd mcp-server
npx @modelcontextprotocol/inspector node index.js
```

This opens a web UI (usually at `http://localhost:5173`) where you can connect and manually trigger each tool.

### Example Claude Desktop Prompts

> *"Create a folder called Campaigns inside the Projects folder"*  
> *"List all images in my Marketing folder"*  
> *"Upload /Users/me/Desktop/logo.png to the Brand Assets folder"*  
> *"How big is my Projects folder?"*

---

## Environment Variables

### Backend `.env`
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dobby-ads
JWT_SECRET=your_very_long_random_secret
JWT_EXPIRE=7d
NODE_ENV=development
```

### MCP Server `.env`
```env
API_BASE_URL=http://localhost:5000/api
API_TOKEN=jwt_token_from_login
```

---

## Design Decisions

**Folder ancestry array** — Each folder stores an `ancestors` array of its parent IDs. This makes breadcrumb rendering and recursive size calculation efficient without multiple round-trips.

**Recursive size calculation** — `calculateFolderSize()` collects all descendant folder IDs, then runs a single MongoDB aggregation to sum image sizes across all of them.

**UUID filenames** — Uploaded images are stored with UUID filenames to prevent collisions and avoid exposing original filenames on disk.

**JWT only** — Authentication is implemented purely in Node.js with `jsonwebtoken` and `bcryptjs`. No Firebase or third-party auth provider.
