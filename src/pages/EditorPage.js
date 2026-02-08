import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const languageRef = useRef('javascript');
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const [language, setLanguage] = useState('javascript');
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);

    languageRef.current = language;

    const handleSocketEvents = useCallback(() => {
        if (!socketRef.current) return;

        socketRef.current.on('connect', () => {
            console.log('Socket connected:', socketRef.current.id);
            setIsConnected(true);
            setIsReconnecting(false);
            toast.success('Connected to room!');
            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });
        });

        socketRef.current.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
            if (reason === 'io server disconnect') {
                socketRef.current.connect();
            }
        });

        socketRef.current.on('reconnect', (attemptNumber) => {
            console.log('Socket reconnected after', attemptNumber, 'attempts');
            setIsConnected(true);
            setIsReconnecting(false);
            toast.success('Reconnected to room!');
        });

        socketRef.current.on('reconnect_attempt', (attemptNumber) => {
            console.log('Reconnection attempt:', attemptNumber);
            setIsReconnecting(true);
            toast.loading(`Reconnecting... (Attempt ${attemptNumber})`);
        });

        socketRef.current.on('reconnect_failed', () => {
            console.log('Reconnection failed');
            setIsReconnecting(false);
            toast.error('Failed to reconnect. Please refresh the page.');
        });

        socketRef.current.on('connect_error', (err) => {
            console.log('Socket connection error:', err);
            setIsConnected(false);
            toast.error('Connection failed. Trying to reconnect...');
        });

        socketRef.current.on('connect_failed', (err) => {
            console.log('Socket connection failed:', err);
            setIsConnected(false);
            toast.error('Connection failed. Please check your internet connection.');
        });

        socketRef.current.on('error', (err) => {
            console.error('Socket error:', err);
            toast.error(err?.message || 'Something went wrong. Please try again.');
        });

        socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
            if (username !== location.state?.username) {
                toast.success(`${username} joined the room.`);
                console.log(`${username} joined`);
            }
            setClients(clients);
            socketRef.current.emit(ACTIONS.SYNC_CODE, {
                code: codeRef.current,
                socketId,
            });
            socketRef.current.emit(ACTIONS.SYNC_LANGUAGE, {
                language: languageRef.current,
                socketId,
            });
        });

        socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language: lang }) => {
            setLanguage(lang);
        });

        socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
            toast.success(`${username} left the room.`);
            setClients((prev) => prev.filter((client) => client.socketId !== socketId));
        });

        socketRef.current.on('ping', () => {
            socketRef.current.emit('pong');
        });
    }, [roomId, location.state?.username]);

    useEffect(() => {
        const init = async () => {
            try {
                socketRef.current = await initSocket();
                handleSocketEvents();
            } catch (error) {
                console.error('Failed to initialize socket:', error);
                toast.error('Failed to connect to server. Please try again.');
                reactNavigator('/');
            }
        };

        init();

        return () => {
            if (socketRef.current) {
                socketRef.current.off('connect');
                socketRef.current.off('disconnect');
                socketRef.current.off('reconnect');
                socketRef.current.off('reconnect_attempt');
                socketRef.current.off('reconnect_failed');
                socketRef.current.off('connect_error');
                socketRef.current.off('connect_failed');
                socketRef.current.off('error');
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
                socketRef.current.disconnect();
            }
        };
    }, [handleSocketEvents, reactNavigator]);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    const handleManualReconnect = async () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        
        try {
            socketRef.current = await initSocket();
            handleSocketEvents();
            toast.success('Attempting to reconnect...');
        } catch (error) {
            console.error('Manual reconnection failed:', error);
            toast.error('Failed to reconnect. Please refresh the page.');
        }
    };

    const handleLanguageChange = (newLanguage) => {
        setLanguage(newLanguage);
        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
                roomId,
                language: newLanguage,
            });
        }
    };

    const handleRunCode = async () => {
        if (!codeRef.current) {
            toast.error('No code to run');
            return;
        }

        setIsRunning(true);
        setOutput('Running...\n');

        try {
            const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://codesync-backend-i4w6.onrender.com';
            const response = await fetch(`${backendUrl}/api/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: codeRef.current,
                    language: language,
                }),
            });

            let data;
            try {
                const text = await response.text();
                data = text ? JSON.parse(text) : {};
            } catch (parseErr) {
                setOutput(`Error: Server returned an invalid response. Is the backend running at ${backendUrl}?`);
                return;
            }
            
            if (data.success) {
                setOutput(data.output || 'Execution completed with no output.');
            } else {
                setOutput(`Error:\n${data.error || 'Unknown error occurred'}`);
            }
        } catch (error) {
            setOutput(`Error: Failed to execute code. ${error.message}`);
            console.error('Execution error:', error);
        } finally {
            setIsRunning(false);
        }
    };

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/code-sync.png"
                            alt="logo"
                        />
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                <div className="connectionStatus">
                    <div className={`statusIndicator ${isConnected ? 'connected' : 'disconnected'}`}>
                        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                    </div>
                    {isReconnecting && (
                        <div className="reconnectingIndicator">
                            🔄 Reconnecting...
                        </div>
                    )}
                    {!isConnected && !isReconnecting && (
                        <button 
                            className="btn reconnectBtn" 
                            onClick={handleManualReconnect}
                            style={{ marginTop: '10px', width: '100%' }}
                        >
                            🔄 Reconnect
                        </button>
                    )}
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                <div className="editorHeader">
                    <div className="languageSelector">
                        <label htmlFor="language-select">Language: </label>
                        <select 
                            id="language-select"
                            value={language}
                            onChange={(e) => handleLanguageChange(e.target.value)}
                            className="languageSelect"
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="cpp">C++</option>
                        </select>
                    </div>
                    <button 
                        className="btn runBtn" 
                        onClick={handleRunCode}
                        disabled={isRunning}
                    >
                        {isRunning ? 'Running...' : '▶ Run Code'}
                    </button>
                </div>
                <Editor
                    socketRef={socketRef}
                    roomId={roomId}
                    language={language}
                    onCodeChange={(code) => {
                        codeRef.current = code;
                    }}
                />
                {output && (
                    <div className="outputPanel">
                        <div className="outputHeader">Output</div>
                        <pre className="outputContent">{output}</pre>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditorPage;
