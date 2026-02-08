import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import EditorPage from './pages/EditorPage';
import { useEffect } from 'react';

function App() {
    useEffect(() => {
        const pingBackend = async () => {
            try {
                const res = await fetch('https://codesync-backend-i4w6.onrender.com/health');
                const data = await res.json();
                console.log('Backend wakeup ping:', data);
            } catch (err) {
                console.error('Failed to ping backend:', err.message);
            }
        };
    
        pingBackend();
    }, []);
    
    return (
        <>
            <div>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        success: {
                            theme: {
                                primary: '#4aed88',
                            },
                        },
                    }}
                ></Toaster>
            </div>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Home />}></Route>
                    <Route
                        path="/editor/:roomId"
                        element={<EditorPage />}
                    ></Route>
                </Routes>
            </BrowserRouter>
        </>
    );
}

export default App;
