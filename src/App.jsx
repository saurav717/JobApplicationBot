import { useState } from 'react';
import LandingPage from './LandingPage';
import JobBrowser from './JobBrowser';

export default function App() {
    const [currentView, setCurrentView] = useState('landing');
    // resumeContext: { resumeId, resumeName, llmProvider }
    const [resumeContext, setResumeContext] = useState(null);

    if (currentView === 'browser' && resumeContext) {
        return (
            <JobBrowser
                resumeId={resumeContext.resumeId}
                resumeName={resumeContext.resumeName}
                llmProvider={resumeContext.llmProvider || 'groq'}
                onBack={() => { setCurrentView('landing'); setResumeContext(null); }}
            />
        );
    }

    return (
        <LandingPage
            onStart={(ctx) => {
                setResumeContext(ctx);
                setCurrentView('browser');
            }}
        />
    );
}
