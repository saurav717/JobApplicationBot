import { useState } from 'react';
import LandingPage from './LandingPage';
import JobBrowser from './JobBrowser';

export default function App() {
    const [currentView, setCurrentView] = useState('landing');

    if (currentView === 'browser') {
        return <JobBrowser onBack={() => setCurrentView('landing')} />;
    }

    return <LandingPage onStart={() => setCurrentView('browser')} />;
}
