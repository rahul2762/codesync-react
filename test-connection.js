const io = require('socket.io-client');

// Test socket connection stability
function testConnection() {
    console.log('Testing socket connection...');
    
    const socket = io("https://codesync-backend-i4w6.onrender.com", {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        transports: ['websocket', 'polling'],
    });

    let connectionCount = 0;
    let disconnectCount = 0;

    socket.on('connect', () => {
        connectionCount++;
        console.log(`✅ Connected (${connectionCount} times) - Socket ID: ${socket.id}`);
        
        // Join a test room
        socket.emit('join', { roomId: 'test-room', username: 'test-user' });
    });

    socket.on('disconnect', (reason) => {
        disconnectCount++;
        console.log(`❌ Disconnected (${disconnectCount} times) - Reason: ${reason}`);
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Reconnected after ${attemptNumber} attempts`);
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    socket.on('reconnect_failed', () => {
        console.log('❌ Reconnection failed');
    });

    socket.on('connect_error', (error) => {
        console.log('❌ Connection error:', error.message);
    });

    socket.on('joined', (data) => {
        console.log('👥 Joined room:', data);
    });

    // Test heartbeat
    socket.on('ping', () => {
        console.log('💓 Received ping, sending pong');
        socket.emit('pong');
    });

    // Keep the connection alive for testing
    setInterval(() => {
        if (socket.connected) {
            console.log('💚 Connection is alive');
        } else {
            console.log('💔 Connection is dead');
        }
    }, 30000);

    // Test for 5 minutes
    setTimeout(() => {
        console.log('\n📊 Connection Test Summary:');
        console.log(`Connections: ${connectionCount}`);
        console.log(`Disconnections: ${disconnectCount}`);
        console.log(`Success rate: ${((connectionCount - disconnectCount) / connectionCount * 100).toFixed(2)}%`);
        socket.disconnect();
        process.exit(0);
    }, 300000); // 5 minutes
}

testConnection(); 