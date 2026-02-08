# CodeSync — Real-Time Collaborative Code Editor

CodeSync is a real-time collaborative code editor that allows multiple users to write, edit, and sync code simultaneously in a shared workspace. Built using React, Node.js, and WebSockets, it delivers a seamless and interactive coding experience with live updates and user presence detection.

## Features

- ✅ Real-time collaborative editing
- ✅ Multiple programming language support (JavaScript, C++)
- ✅ Code execution with output display
- ✅ Syntax highlighting
- ✅ User presence detection
- ✅ Room-based collaboration

## Deploy (GitHub + live link)

To push this project to **GitHub** and **deploy** it so anyone can use it (free with Render + Vercel), see **[DEPLOYMENT.md](./DEPLOYMENT.md)**.

## Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (version 14.0.0 or higher) - [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js)
- **g++ compiler** (for C++ code execution)
  - **Windows**: Install [MinGW-w64](https://www.mingw-w64.org/downloads/) or use [MSYS2](https://www.msys2.org/)
  - **macOS**: `xcode-select --install` or install via Homebrew: `brew install gcc`
  - **Linux**: `sudo apt-get install g++` (Ubuntu/Debian) or `sudo yum install gcc-c++` (CentOS/RHEL)

## Installation

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone https://github.com/alankar25/CodeSync
   cd CodeSync-main
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Running the Project

This project consists of two parts: a backend server and a frontend React application. You need to run both simultaneously.

### Option 1: Development Mode (Recommended)

**Terminal 1 - Start the Backend Server:**
```bash
npm run dev
```
This starts the backend server with nodemon (auto-restarts on file changes). The server will run on `http://localhost:5000` by default.

**Terminal 2 - Start the Frontend:**
```bash
npm run start:front
```
This starts the React development server. The frontend will be available at `http://localhost:3000` and will automatically open in your browser.

### Option 2: Production Mode

**Terminal 1 - Start the Backend Server:**
```bash
npm start
```
The backend server will run on `http://localhost:5000` by default.

**Terminal 2 - Start the Frontend:**
```bash
npm run start:front
```
The frontend will be available at `http://localhost:3000`.

## Configuration

### Using Local Backend (Development)

By default, the frontend connects to a remote backend. To use your local backend server:

1. Create a `.env` file in the root directory:
   ```env
   REACT_APP_BACKEND_URL=http://localhost:5000
   ```

2. Restart the frontend server for changes to take effect.

### Backend Port Configuration

The backend server uses port 5000 by default. You can change it by setting the `PORT` environment variable:

```bash
# Windows (PowerShell)
$env:PORT=3001; npm start

# Windows (CMD)
set PORT=3001 && npm start

# macOS/Linux
PORT=3001 npm start
```

## Usage

1. **Start the application** (follow the running instructions above)

2. **Open your browser** and navigate to `http://localhost:3000`

3. **Create or Join a Room**:
   - Enter your username
   - Create a new room or join an existing one using a room ID

4. **Write and Run Code**:
   - Select your programming language (JavaScript or C++)
   - Write your code in the editor
   - Click the "Run Code" button to execute
   - View output in the output panel below the editor

5. **Collaborate**:
   - Share the room ID with others to collaborate
   - Code changes and language selection sync in real-time
   - See connected users in the sidebar

## Project Structure

```
CodeSync-main/
├── src/
│   ├── components/      # React components (Editor, Client)
│   ├── pages/          # Page components (Home, EditorPage)
│   ├── Actions.js      # Socket action constants
│   ├── App.js          # Main App component
│   └── socket.js       # Socket.io client configuration
├── server.js           # Express backend server
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## Available Scripts

- `npm start` - Start the backend server
- `npm run start:front` - Start the React frontend development server
- `npm run dev` - Start the backend server with nodemon (auto-reload)
- `npm run build` - Build the frontend for production
- `npm test` - Run tests

## Troubleshooting

### C++ Code Not Executing

- **Verify g++ is installed**: Run `g++ --version` in your terminal
- **Check PATH**: Make sure g++ is in your system PATH
- **Check backend logs**: Look for compilation errors in the backend console

### Connection Issues

- **Check both servers are running**: Ensure both backend and frontend are started
- **Verify ports**: Backend should be on port 5000, frontend on port 3000
- **Check `.env` file**: If using local backend, ensure `REACT_APP_BACKEND_URL` is set correctly

### Port Already in Use

If port 5000 or 3000 is already in use:
- Change the backend port using the `PORT` environment variable
- React will automatically suggest using a different port if 3000 is occupied

## Technology Stack

- **Frontend**: React, CodeMirror, Socket.io-client
- **Backend**: Node.js, Express, Socket.io
- **Code Execution**: Node.js (JavaScript), g++ (C++)

