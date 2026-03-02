import { useState } from 'react';
import { X, Shield, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';
import { testPlatformConnection } from '../../api';

const PLATFORM_INFO = {
    linkedin: {
        name: 'LinkedIn',
        icon: '🔗',
        color: 'from-blue-600 to-blue-700',
        permissions: [
            'View your job search results',
            'Access job listings and details',
            'Apply to "Easy Apply" jobs on your behalf',
        ],
        why: 'We use your LinkedIn credentials to search for jobs that match your profile and apply to Easy Apply positions automatically.',
        security: 'Your password is encrypted with AES-256 and never stored in plain text. We only access LinkedIn\'s job search features.',
    },
    glassdoor: {
        name: 'Glassdoor',
        icon: '🏢',
        color: 'from-green-600 to-teal-600',
        permissions: [
            'View job listings',
            'Access company reviews and salary data',
            'See interview questions for better prep',
        ],
        why: 'Glassdoor provides salary estimates and company reviews that help us match you with the best opportunities.',
        security: 'Your credentials are encrypted and only used to access job listings and company data.',
    },
    indeed: {
        name: 'Indeed',
        icon: '🔍',
        color: 'from-indigo-600 to-indigo-700',
        permissions: [
            'Search job listings',
            'View job details and requirements',
            'Access salary information',
        ],
        why: 'Indeed has one of the largest job databases. Connecting gives us access to more opportunities for you.',
        security: 'Indeed credentials are optional — we can search without an account, but logging in provides more results.',
    },
    jobright: {
        name: 'Jobright.ai',
        icon: '🤖',
        color: 'from-violet-600 to-purple-700',
        permissions: [
            'Access AI-curated job matches',
            'View your job recommendations',
            'Browse curated listings',
        ],
        why: 'Jobright.ai curates high-quality job matches using AI. Connecting lets us import their recommendations for you.',
        security: 'Your credentials are encrypted and used only to fetch your personalized job feed.',
    },
    workday: {
        name: 'Workday',
        icon: '⚙️',
        color: 'from-orange-500 to-red-500',
        permissions: [
            'Access company career portals',
            'View and apply to job postings',
            'Submit applications on your behalf',
        ],
        why: 'Many top companies use Workday. Connecting lets us apply to jobs at companies like Amazon, Capital One, Microsoft, and hundreds more.',
        security: 'Each Workday account is company-specific. Your credentials are encrypted separately for each company portal.',
        isMultiple: true,
    },
};

export default function PlatformConnectModal({
    platform,
    onClose,
    onConnect,
    existingCredential = null,
}) {
    const [email, setEmail] = useState(existingCredential?.email || '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [workdayUrl, setWorkdayUrl] = useState(existingCredential?.workday_url || '');
    const [companyName, setCompanyName] = useState(existingCredential?.company_name || '');
    const [status, setStatus] = useState('idle'); // idle | testing | success | error
    const [errorMessage, setErrorMessage] = useState('');

    const info = PLATFORM_INFO[platform];
    if (!info) return null;

    const canSubmit = email && password && (platform !== 'workday' || workdayUrl);

    const handleTest = async () => {
        if (!canSubmit) return;
        setStatus('testing');
        setErrorMessage('');
        try {
            const result = await testPlatformConnection(platform, { email, password, workday_url: workdayUrl || null });
            if (result?.success) {
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMessage(result?.message || 'Connection failed. Please check your credentials.');
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage(err.message || 'Failed to test connection');
        }
    };

    const handleConnect = async () => {
        if (!canSubmit) return;
        // Auto-test first if not already tested
        if (status !== 'success') {
            await handleTest();
            // handleTest updates state asynchronously; we rely on the user seeing the
            // result and clicking "Save & Connect" again after success.
            return;
        }
        try {
            await onConnect({
                platform,
                email,
                password,
                workday_url: workdayUrl || null,
                company_name: companyName || null,
            });
            onClose();
        } catch (err) {
            setStatus('error');
            setErrorMessage(err.message || 'Failed to save credentials');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className={`p-6 bg-gradient-to-r ${info.color}`}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-all"
                    >
                        <X className="w-5 h-5 text-white/70" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl">
                            {info.icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Connect {info.name}</h2>
                            <p className="text-sm text-white/70">Grant ApplyBot access to your account</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    {/* Why we need access */}
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <h3 className="text-sm font-semibold text-white mb-2">Why connect?</h3>
                        <p className="text-sm text-slate-400">{info.why}</p>
                    </div>

                    {/* Permissions */}
                    <div>
                        <h3 className="text-sm font-semibold text-white mb-3">ApplyBot will be able to:</h3>
                        <ul className="space-y-2">
                            {info.permissions.map((perm, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                    <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                                    {perm}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Credentials form */}
                    <div className="space-y-3">
                        {platform === 'workday' && (
                            <>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1.5">Company Name</label>
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={e => setCompanyName(e.target.value)}
                                        placeholder='e.g., "Amazon", "Capital One"'
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1.5">Workday URL</label>
                                    <input
                                        type="text"
                                        value={workdayUrl}
                                        onChange={e => setWorkdayUrl(e.target.value)}
                                        placeholder="e.g., amazon.wd5.myworkdayjobs.com"
                                        className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-colors"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">{info.name} Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-slate-400 mb-1.5">{info.name} Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800/80 border border-slate-700/50 text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Security note */}
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                        <Lock className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-teal-300">{info.security}</p>
                    </div>

                    {/* Status messages */}
                    {status === 'success' && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                            <CheckCircle2 className="w-4 h-4 text-teal-400" />
                            <span className="text-sm text-teal-300">Connection successful!</span>
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-sm text-red-300">{errorMessage}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleTest}
                            disabled={!canSubmit || status === 'testing'}
                            className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm font-medium hover:bg-slate-700/50 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {status === 'testing' && <Loader2 className="w-4 h-4 animate-spin" />}
                            Test Connection
                        </button>
                        <button
                            onClick={handleConnect}
                            disabled={!canSubmit || status === 'testing'}
                            className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                                status === 'success'
                                    ? 'bg-teal-600 text-white hover:bg-teal-500'
                                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50'
                            }`}
                        >
                            {status === 'success' ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Save &amp; Connect
                                </>
                            ) : (
                                <>
                                    <Shield className="w-4 h-4" />
                                    {status === 'testing' ? 'Connecting...' : `Connect ${info.name}`}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
