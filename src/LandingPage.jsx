import { useState, useRef } from 'react';
import { Sparkles, Zap, Shield, ArrowRight, Bot, ChevronRight, Upload, FileText, CheckCircle2, Loader2, X, User, ChevronDown, ChevronUp } from 'lucide-react';
import { uploadResume, getStoredToken, getStoredUser, clearStoredToken } from './api';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import PlatformCredentialsForm from './components/Auth/PlatformCredentialsForm';
import ConnectionStatus from './components/common/ConnectionStatus';

export default function LandingPage({ onStart }) {
    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [resumeData, setResumeData] = useState(null);
    const [selectedLLM] = useState('llama-3.3-70b');
    const fileInputRef = useRef(null);

    // Auth state
    const [authToken, setAuthToken] = useState(() => getStoredToken());
    const [authUser, setAuthUser] = useState(() => getStoredUser());
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'

    // Platform credentials state
    const [showCredentials, setShowCredentials] = useState(false);
    const [connectedPlatforms, setConnectedPlatforms] = useState({});

    const handleAuthSuccess = (data) => {
        setAuthToken(data.access_token);
        setAuthUser(data.user);
        setShowAuthModal(false);
    };

    const handleSignOut = () => {
        clearStoredToken();
        setAuthToken(null);
        setAuthUser(null);
        setConnectedPlatforms({});
    };

    const handlePlatformConnect = (platformId) => {
        setConnectedPlatforms(prev => ({ ...prev, [platformId]: true }));
    };

    const companyLogos = ['stripe.com', 'coinbase.com', 'palantir.com', 'plaid.com', 'datadoghq.com'];

    const features = [
        { icon: Sparkles, title: 'AI-Powered Matching', description: 'Our AI analyzes your resume and matches you with the most relevant positions, scoring each opportunity based on your unique skills and experience.', gradient: 'from-indigo-500 to-purple-500' },
        { icon: Zap, title: 'One-Click Apply', description: 'Auto-fill application forms with your information, tailored cover letters, and optimized responses. Apply to dozens of jobs in minutes.', gradient: 'from-purple-500 to-pink-500' },
        { icon: Shield, title: 'Smart Scheduling', description: 'Queue applications and let the agent submit them at optimal times. Track every application status in one unified dashboard.', gradient: 'from-teal-500 to-emerald-500' },
    ];

    const steps = [
        { num: '01', title: 'Upload Resume', description: 'Drop your resume and let AI extract your skills, experience, and preferences automatically.', icon: '📄' },
        { num: '02', title: 'Browse & Match', description: 'Explore companies and roles with AI-calculated relevancy scores tailored to your profile.', icon: '🔍' },
        { num: '03', title: 'Review Forms', description: 'Preview auto-filled applications with AI-generated cover letters before submitting.', icon: '✍️' },
        { num: '04', title: 'Auto Apply', description: 'Queue your selected jobs and let the agent handle submissions while you sleep.', icon: '🚀' },
    ];

    const handleFile = async (selectedFile) => {
        if (!selectedFile) return;
        if (!selectedFile.name.endsWith('.pdf')) {
            setUploadError('Please upload a PDF file.');
            return;
        }
        setFile(selectedFile);
        setUploadError('');
        setUploading(true);
        setResumeData(null);
        try {
            const data = await uploadResume(selectedFile);
            setResumeData(data);
        } catch (err) {
            setUploadError(err.message || 'Upload failed. Please try again.');
            setFile(null);
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) handleFile(dropped);
    };

    const handleStart = () => {
        if (!resumeData) return;
        onStart({ resumeId: resumeData.id, resumeName: resumeData.name, llm: selectedLLM });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
                <div className="absolute top-20 right-20 w-3 h-3 bg-indigo-400/30 rounded-full animate-float" />
                <div className="absolute top-40 left-32 w-2 h-2 bg-purple-400/30 rounded-full animate-float" style={{ animationDelay: '2s' }} />
                <div className="absolute bottom-32 right-40 w-2 h-2 bg-teal-400/20 rounded-full animate-float" style={{ animationDelay: '4s' }} />
                <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(148,163,184,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            </div>

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <Bot className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">ApplyBot</span>
                </div>
                <div className="flex items-center gap-8">
                    <a href="#features" className="text-white/50 hover:text-white transition-all duration-300 text-sm">Features</a>
                    <a href="#how-it-works" className="text-white/50 hover:text-white transition-all duration-300 text-sm">How it Works</a>
                    {authUser ? (
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-2 text-sm text-slate-300">
                                <User className="w-4 h-4 text-indigo-400" />
                                {authUser.name || authUser.email}
                            </span>
                            <button onClick={handleSignOut} className="px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-300">
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                            className="px-5 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white/80 hover:bg-slate-700/50 hover:text-white transition-all duration-300 backdrop-blur-xl"
                        >
                            Sign In
                        </button>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-12 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 mb-8">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm text-indigo-300">Autonomous Job Applications</span>
                </div>
                <h1 className="text-6xl md:text-7xl font-bold leading-tight mb-6">
                    Your AI Agent<br />
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">Applies While You Sleep</span>
                </h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
                    Upload your resume once. Our AI agent browses thousands of jobs, matches your skills, auto-fills applications, and submits them — all while you focus on what matters.
                </p>

                {/* ── Resume Upload Card ── */}
                <div className="max-w-2xl mx-auto mb-8">
                    <div className="p-[1px] rounded-3xl bg-gradient-to-r from-indigo-600/50 via-purple-600/50 to-teal-600/50">
                        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-8">
                            {/* Upload zone */}
                            {!resumeData ? (
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-300 ${dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-700/60 hover:border-indigo-500/50 hover:bg-slate-800/30'}`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={(e) => handleFile(e.target.files[0])}
                                    />
                                    {uploading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                                            <p className="text-sm text-slate-400">Parsing your resume with AI...</p>
                                            <p className="text-xs text-slate-600">{file?.name}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center">
                                                <Upload className="w-7 h-7 text-indigo-400" />
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold mb-1">Drop your resume here</p>
                                                <p className="text-sm text-slate-400">or <span className="text-indigo-400">click to browse</span> · PDF only</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Success state */
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30">
                                    <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-6 h-6 text-teal-400" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-semibold text-white">{resumeData.name || file?.name || 'Resume uploaded'}</p>
                                        <p className="text-sm text-teal-400">
                                            <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                                            Parsed · {resumeData.skills?.length || 0} skills detected
                                            {resumeData.email && ` · ${resumeData.email}`}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setResumeData(null); setFile(null); }}
                                        className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-all duration-300"
                                    >
                                        <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            )}

                            {uploadError && (
                                <p className="mt-3 text-sm text-red-400 text-center">{uploadError}</p>
                            )}

                            {/* Powered-by badge */}
                            <div className="mt-5 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                <span className="text-xs text-slate-400">Powered by</span>
                                <span className="text-xs font-semibold text-indigo-300">Groq</span>
                                <span className="text-slate-600">·</span>
                                <span className="text-xs text-slate-400">Llama 3.3 70B</span>
                                <span className="text-slate-600">·</span>
                                <span className="text-xs text-slate-400">BAAI/bge embeddings</span>
                                <span className="ml-auto text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Open Source</span>
                            </div>

                            {/* CTA Button */}
                            <button
                                onClick={handleStart}
                                disabled={!resumeData || uploading}
                                className={`mt-5 w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all duration-300
                                    ${resumeData
                                        ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-indigo-500/30 cursor-pointer'
                                        : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                                    }`}
                            >
                                {uploading ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Scanning resume...</>
                                ) : resumeData ? (
                                    <>Find My Jobs <ArrowRight className="w-5 h-5" /></>
                                ) : (
                                    <>Upload Resume to Get Started <ArrowRight className="w-5 h-5" /></>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Platform Credentials Section */}
                    {authToken && (
                        <div className="mt-4 p-[1px] rounded-2xl bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-teal-600/30">
                            <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-5">
                                <button
                                    onClick={() => setShowCredentials(!showCredentials)}
                                    className="w-full flex items-center justify-between text-left"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-white">Platform Credentials</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Connect job platforms for broader scraping</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <ConnectionStatus platforms={connectedPlatforms} />
                                        {showCredentials
                                            ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                            : <ChevronDown className="w-4 h-4 text-slate-400" />
                                        }
                                    </div>
                                </button>
                                {showCredentials && (
                                    <div className="mt-4">
                                        <PlatformCredentialsForm
                                            token={authToken}
                                            connectedPlatforms={connectedPlatforms}
                                            onConnect={handlePlatformConnect}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!authToken && (
                        <div className="mt-4 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 text-center">
                            <p className="text-xs text-slate-500">
                                <button
                                    onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    Create an account
                                </button>
                                {' '}or{' '}
                                <button
                                    onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    sign in
                                </button>
                                {' '}to connect LinkedIn, Glassdoor & more
                            </p>
                        </div>
                    )}

                    {/* Company logos */}
                    <div className="flex items-center justify-center gap-6 mt-6">
                        <span className="text-sm text-slate-500">Works with:</span>
                        <div className="flex items-center gap-4">
                            {companyLogos.map(domain => (
                                <img key={domain} src={`https://logo.clearbit.com/${domain}`} alt="" className="w-8 h-8 rounded-lg grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
                            ))}
                        </div>
                        <span className="text-sm text-slate-500">+2000 more</span>
                    </div>
                </div>
            </section>

            {/* Auth Modal */}
            {showAuthModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAuthModal(false)} />
                    <div className="relative z-10 w-full max-w-md p-[1px] rounded-3xl bg-gradient-to-r from-indigo-600/50 via-purple-600/50 to-teal-600/50">
                        <div className="bg-slate-900 rounded-3xl p-8">
                            <button
                                onClick={() => setShowAuthModal(false)}
                                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-slate-800 transition-all duration-300"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                            {authMode === 'login' ? (
                                <LoginForm
                                    onSuccess={handleAuthSuccess}
                                    onSwitchToRegister={() => setAuthMode('register')}
                                />
                            ) : (
                                <RegisterForm
                                    onSuccess={handleAuthSuccess}
                                    onSwitchToLogin={() => setAuthMode('login')}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Features Grid */}
            <section id="features" className="relative z-10 max-w-7xl mx-auto px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {features.map((f, i) => (
                        <div key={i} className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all duration-300 group">
                            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${f.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                <f.icon className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                            <p className="text-slate-400 leading-relaxed">{f.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-8 py-16">
                <h2 className="text-3xl font-bold text-center mb-16">
                    How It <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Works</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {steps.map((s, i) => (
                        <div key={i} className="relative p-6 rounded-2xl bg-slate-900/30 border border-slate-800/50 text-center group hover:bg-slate-900/50 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4 text-xl">{s.icon}</div>
                            <div className="text-4xl font-bold text-slate-800 mb-2">{s.num}</div>
                            <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                            <p className="text-sm text-slate-400">{s.description}</p>
                            {i < 3 && <ChevronRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-700 z-10" />}
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative z-10 max-w-4xl mx-auto px-8 py-16">
                <div className="p-[2px] rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600">
                    <div className="bg-slate-950 rounded-3xl p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-6">
                            <Bot className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">Ready to Automate Your Job Search?</h2>
                        <p className="text-slate-400 max-w-lg mx-auto mb-8">
                            Join thousands of professionals who let AI handle their job applications. More applications, better matches, less effort.
                        </p>
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-semibold text-lg hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 flex items-center gap-2 mx-auto"
                        >
                            Get Started Free <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
