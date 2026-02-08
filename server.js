const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');
const { exec, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const cors = require("cors");
// CORS middleware for HTTP requests


app.use(cors({
    origin: "*"
  }));

app.options("*", cors());

app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    maxHttpBufferSize: 1e8,
});

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'CodeSync Backend is running' });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'CodeSync Backend API',
        endpoints: {
            health: '/health',
            execute: '/api/execute',
            websocket: 'WebSocket connection available'
        }
    });
});

// Code execution endpoint - wrap in try/catch so we always return JSON
app.post('/api/execute', async (req, res) => {
    try {
        const { code, language } = req.body || {};
        
        if (!code || !language) {
            return res.status(400).json({ error: 'Code and language are required', success: false });
        }

        if (language === 'cpp') {
        try {
            // Create temporary directory for compilation
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            const timestamp = Date.now();
            const fileName = `code_${timestamp}`;
            const cppFile = path.join(tempDir, `${fileName}.cpp`);
            const exeFile = path.join(tempDir, fileName);
            
            // Write code to file
            fs.writeFileSync(cppFile, code);

            try {
                // Compile C++ code using execFile (avoids path-with-spaces issues on Windows)
                const { stderr: compileError } = await execFileAsync('g++', ['-o', exeFile, cppFile], {
                    timeout: 10000,
                    maxBuffer: 1024 * 1024,
                    cwd: tempDir
                });

                if (compileError) {
                    if (fs.existsSync(cppFile)) fs.unlinkSync(cppFile);
                    return res.json({ 
                        output: '', 
                        error: compileError,
                        success: false 
                    });
                }

                // On Windows g++ produces exeFile.exe; on Unix just exeFile
                const exePath = process.platform === 'win32' ? `${exeFile}.exe` : exeFile;

                const { stdout: execOutput, stderr: execError } = await execFileAsync(exePath, [], {
                    timeout: 5000,
                    maxBuffer: 1024 * 1024,
                    cwd: tempDir
                });

                // Cleanup
                if (fs.existsSync(cppFile)) fs.unlinkSync(cppFile);
                if (fs.existsSync(exePath)) fs.unlinkSync(exePath);

                res.json({ 
                    output: execOutput || execError || '', 
                    error: '', 
                    success: true 
                });
            } catch (error) {
                // Cleanup on error
                if (fs.existsSync(cppFile)) fs.unlinkSync(cppFile);
                const exePath = process.platform === 'win32' ? `${exeFile}.exe` : exeFile;
                if (fs.existsSync(exePath)) fs.unlinkSync(exePath);

                if (error.code === 'ETIMEDOUT') {
                    return res.json({ 
                        output: '', 
                        error: 'Execution timeout: Code execution took too long (>5 seconds)',
                        success: false 
                    });
                }

                const msg = (error.message || '').toLowerCase();
                const isGppNotFound = error.code === 'ENOENT' || msg.includes('not recognized') || msg.includes('not found') || msg.includes('cannot find');
                const friendlyError = isGppNotFound
                    ? 'C++ compiler (g++) is not installed or not in PATH. On Windows: install MinGW-w64 or MSYS2 and add g++ to your system PATH. See README for details.'
                    : (error.stderr || error.message || 'Execution failed');

                res.json({ 
                    output: '', 
                    error: friendlyError,
                    success: false 
                });
            }
        } catch (error) {
            res.status(500).json({ 
                error: `Server error: ${error.message}`,
                success: false 
            });
        }
    } else if (language === 'javascript') {
        try {
            // Create temporary directory for execution
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }

            const timestamp = Date.now();
            const jsFile = path.join(tempDir, `code_${timestamp}.js`);
            
            // Write code to file
            fs.writeFileSync(jsFile, code);

            try {
                // Execute JavaScript code using Node.js
                const { stdout, stderr } = await execAsync(`node "${jsFile}"`, {
                    timeout: 5000,
                    maxBuffer: 1024 * 1024
                });

                // Cleanup
                if (fs.existsSync(jsFile)) fs.unlinkSync(jsFile);

                res.json({ 
                    output: stdout || '', 
                    error: stderr || '', 
                    success: true 
                });
            } catch (error) {
                // Cleanup on error
                if (fs.existsSync(jsFile)) fs.unlinkSync(jsFile);

                if (error.code === 'ETIMEDOUT') {
                    return res.json({ 
                        output: '', 
                        error: 'Execution timeout: Code execution took too long (>5 seconds)',
                        success: false 
                    });
                }

                res.json({ 
                    output: '', 
                    error: error.stderr || error.message || 'Execution failed',
                    success: false 
                });
            }
        } catch (error) {
            res.status(500).json({ 
                error: `Server error: ${error.message}`,
                success: false 
            });
        }
    } else {
        return res.status(400).json({ error: `Unsupported language: ${language}`, success: false });
    }
    } catch (err) {
        console.error('Execute endpoint error:', err);
        return res.status(500).json({ 
            error: err.message || 'Internal server error', 
            success: false 
        });
    }
});

const userSocketMap = {};
const roomConnections = new Map(); // Track room connections

function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

function cleanupUser(socketId) {
    if (userSocketMap[socketId]) {
        const username = userSocketMap[socketId];
        console.log(`User ${username} (${socketId}) disconnected`);
        delete userSocketMap[socketId];
    }
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    // Send heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        socket.emit('ping');
    }, 30000);

    socket.on('pong', () => {
        // Client responded to heartbeat
        socket.lastPong = Date.now();
    });

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        try {
            userSocketMap[socket.id] = username;
            socket.join(roomId);
            
            // Track room connection
            if (!roomConnections.has(roomId)) {
                roomConnections.set(roomId, new Set());
            }
            roomConnections.get(roomId).add(socket.id);
            
            const clients = getAllConnectedClients(roomId);
            clients.forEach(({ socketId }) => {
                io.to(socketId).emit(ACTIONS.JOINED, {
                    clients,
                    username,
                    socketId: socket.id,
                });
            });
            
            console.log(`User ${username} joined room ${roomId}`);
        } catch (error) {
            console.error('Error in JOIN event:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        try {
            socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
        } catch (error) {
            console.error('Error in CODE_CHANGE event:', error);
        }
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        try {
            io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
        } catch (error) {
            console.error('Error in SYNC_CODE event:', error);
        }
    });

    socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
        try {
            socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
        } catch (error) {
            console.error('Error in LANGUAGE_CHANGE event:', error);
        }
    });

    socket.on(ACTIONS.SYNC_LANGUAGE, ({ socketId, language }) => {
        try {
            io.to(socketId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
        } catch (error) {
            console.error('Error in SYNC_LANGUAGE event:', error);
        }
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            if (roomId !== socket.id) { // socket.id is always in rooms
                socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                    socketId: socket.id,
                    username: userSocketMap[socket.id],
                });
                
                // Clean up room tracking
                if (roomConnections.has(roomId)) {
                    roomConnections.get(roomId).delete(socket.id);
                    if (roomConnections.get(roomId).size === 0) {
                        roomConnections.delete(roomId);
                    }
                }
            }
        });
        cleanupUser(socket.id);
        clearInterval(heartbeat);
    });

    socket.on('disconnect', (reason) => {
        console.log(`Socket ${socket.id} disconnected: ${reason}`);
        cleanupUser(socket.id);
        clearInterval(heartbeat);
    });

    socket.on('error', (error) => {
        console.error(`Socket ${socket.id} error:`, error);
    });
});

// Cleanup function to remove stale connections
setInterval(() => {
    const now = Date.now();
    io.sockets.sockets.forEach((socket) => {
        if (socket.lastPong && (now - socket.lastPong) > 90000) {
            console.log(`Force disconnecting stale socket ${socket.id}`);
            socket.disconnect(true);
        }
    });
}, 60000);

// Global error handler - ensures we never send HTML error pages
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: err.message || 'Internal server error', success: false });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
