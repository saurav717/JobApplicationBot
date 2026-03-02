import { Sparkles, Zap, Shield, ArrowRight, Bot, ChevronRight } from 'lucide-react';

export default function LandingPage({ onStart }) {
    const companyLogos = [
        'stripe.com', 'coinbase.com', 'palantir.com', 'plaid.com', 'datadoghq.com'
    ];

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
                    <button className="px-5 py-2 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white/80 hover:bg-slate-700/50 hover:text-white transition-all duration-300 backdrop-blur-xl">
                        Sign In
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-24 text-center">
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
                <div className="flex items-center justify-center gap-4 mb-16">
                    <button
                        onClick={onStart}
                        className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-semibold text-lg hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 flex items-center gap-2"
                    >
                        Start Applying <ArrowRight className="w-5 h-5" />
                    </button>
                    <button className="px-8 py-4 rounded-xl border border-slate-700/50 text-white/80 font-semibold text-lg hover:bg-slate-800/50 transition-all duration-300">
                        Watch Demo
                    </button>
                </div>
                <div className="flex items-center justify-center gap-6">
                    <span className="text-sm text-slate-500">Works with:</span>
                    <div className="flex items-center gap-4">
                        {companyLogos.map(domain => (
                            <img key={domain} src={`https://logo.clearbit.com/${domain}`} alt="" className="w-8 h-8 rounded-lg grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300" />
                        ))}
                    </div>
                    <span className="text-sm text-slate-500">+2000 more</span>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="relative z-10 max-w-7xl mx-auto px-8 py-20">
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
            <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-8 py-20">
                <h2 className="text-3xl font-bold text-center mb-16">
                    How It <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Works</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {steps.map((s, i) => (
                        <div key={i} className="relative p-6 rounded-2xl bg-slate-900/30 border border-slate-800/50 text-center group hover:bg-slate-900/50 transition-all duration-300">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4 text-xl">
                                {s.icon}
                            </div>
                            <div className="text-4xl font-bold text-slate-800 mb-2">{s.num}</div>
                            <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                            <p className="text-sm text-slate-400">{s.description}</p>
                            {i < 3 && (
                                <ChevronRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-700 z-10" />
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative z-10 max-w-4xl mx-auto px-8 py-20">
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
                            onClick={onStart}
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
