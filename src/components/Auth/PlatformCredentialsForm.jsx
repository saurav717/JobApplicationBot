import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Loader2, Plus, Trash2, HelpCircle } from 'lucide-react';
import { storePlatformCredential, testPlatformConnection } from '../../api';

const PLATFORMS = [
    {
        id: 'linkedin',
        label: 'LinkedIn',
        icon: '🔗',
        note: "We'll use this to scrape jobs and auto-apply to Easy Apply positions.",
        color: 'from-blue-600 to-blue-700',
    },
    {
        id: 'glassdoor',
        label: 'Glassdoor',
        icon: '🏢',
        note: 'Used for accessing job listings and company salary/review data.',
        color: 'from-green-600 to-teal-600',
    },
    {
        id: 'indeed',
        label: 'Indeed',
        icon: '🔍',
        note: 'Access to wider job listings and salary estimates.',
        color: 'from-indigo-600 to-indigo-700',
    },
    {
        id: 'jobright',
        label: 'Jobright.ai',
        icon: '🤖',
        note: 'AI-curated job matches from multiple sources.',
        color: 'from-purple-600 to-violet-600',
    },
];

function PlatformAccordion({ platform, token, connectedPlatforms, onConnect }) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [error, setError] = useState('');

    const isConnected = !!connectedPlatforms[platform.id];

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        setError('');
        try {
            const result = await testPlatformConnection(platform.id, email, password, null, token);
            setTestResult(result);
        } catch (err) {
            setError(err.message || 'Test failed');
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setError('');
        try {
            await storePlatformCredential(platform.id, email, password, null, null, token);
            onConnect(platform.id);
            setOpen(false);
        } catch (err) {
            setError(err.message || 'Failed to save credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-xl border border-slate-700/50 overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/50 hover:bg-slate-800/80 transition-all duration-300 text-left"
            >
                <span className="text-lg">{platform.icon}</span>
                <span className="font-medium text-sm text-white flex-1">{platform.label}</span>
                {isConnected && (
                    <span className="flex items-center gap-1 text-xs text-teal-400 mr-2">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                    </span>
                )}
                {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {open && (
                <div className="px-4 pb-4 pt-3 bg-slate-900/50 space-y-3">
                    <p className="text-xs text-slate-500 flex items-start gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-indigo-400" />
                        {platform.note}
                    </p>
                    <p className="text-xs text-slate-500 flex items-start gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                        Credentials are encrypted at rest and only used for job scraping.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-sm text-white outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-sm text-white outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    {testResult && (
                        <p className={`text-xs ${testResult.success ? 'text-teal-400' : 'text-amber-400'}`}>
                            {testResult.success ? '✓' : '⚠'} {testResult.message}
                        </p>
                    )}
                    {error && <p className="text-xs text-red-400">{error}</p>}

                    <div className="flex gap-2">
                        <button
                            onClick={handleTest}
                            disabled={testing || !email || !password}
                            className="px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-xs text-slate-300 hover:bg-slate-700 transition-all duration-300 disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Test Connection
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || !email || !password}
                            className="flex-1 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-xs text-white font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Save Credentials
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function WorkdayEntry({ entry, index, onChange, onRemove }) {
    return (
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Workday Instance #{index + 1}</span>
                <button onClick={() => onRemove(index)} className="p-1 rounded-md hover:bg-slate-700/50 text-slate-500 hover:text-red-400 transition-all duration-300">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input
                    type="text"
                    placeholder='Company (e.g. "Amazon")'
                    value={entry.company_name}
                    onChange={e => onChange(index, 'company_name', e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 text-xs text-white outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
                />
                <input
                    type="text"
                    placeholder="amazon.wd5.myworkdayjobs.com"
                    value={entry.workday_url}
                    onChange={e => onChange(index, 'workday_url', e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 text-xs text-white outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={entry.email}
                    onChange={e => onChange(index, 'email', e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 text-xs text-white outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={entry.password}
                    onChange={e => onChange(index, 'password', e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700/50 text-xs text-white outline-none focus:border-indigo-500/50 placeholder:text-slate-600"
                />
            </div>
        </div>
    );
}

export default function PlatformCredentialsForm({ token, connectedPlatforms, onConnect }) {
    const [workdayEntries, setWorkdayEntries] = useState([]);
    const [savingWorkday, setSavingWorkday] = useState(false);
    const [workdayError, setWorkdayError] = useState('');

    const addWorkday = () => setWorkdayEntries(prev => [
        ...prev,
        { company_name: '', workday_url: '', email: '', password: '' },
    ]);

    const updateWorkday = (index, field, value) => {
        setWorkdayEntries(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
    };

    const removeWorkday = (index) => {
        setWorkdayEntries(prev => prev.filter((_, i) => i !== index));
    };

    const saveWorkday = async () => {
        setSavingWorkday(true);
        setWorkdayError('');
        try {
            for (const entry of workdayEntries) {
                if (entry.email && entry.password && entry.workday_url) {
                    await storePlatformCredential(
                        'workday',
                        entry.email,
                        entry.password,
                        entry.workday_url,
                        entry.company_name,
                        token,
                    );
                }
            }
            onConnect('workday');
        } catch (err) {
            setWorkdayError(err.message || 'Failed to save Workday credentials');
        } finally {
            setSavingWorkday(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold text-white">Platform Credentials</h3>
                <span className="text-xs text-slate-500">— optional, enables broader scraping</span>
            </div>

            {PLATFORMS.map(platform => (
                <PlatformAccordion
                    key={platform.id}
                    platform={platform}
                    token={token}
                    connectedPlatforms={connectedPlatforms}
                    onConnect={onConnect}
                />
            ))}

            {/* Workday section */}
            <div className="rounded-xl border border-slate-700/50 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50">
                    <span className="text-lg">⚙️</span>
                    <span className="font-medium text-sm text-white flex-1">Workday (Multiple Companies)</span>
                    {connectedPlatforms['workday'] && (
                        <span className="flex items-center gap-1 text-xs text-teal-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                        </span>
                    )}
                </div>
                <div className="px-4 pb-4 pt-3 bg-slate-900/50 space-y-3">
                    <p className="text-xs text-slate-500">
                        Add credentials for specific companies that use Workday ATS (e.g. Amazon, Capital One, Microsoft).
                    </p>
                    {workdayEntries.map((entry, i) => (
                        <WorkdayEntry key={i} entry={entry} index={i} onChange={updateWorkday} onRemove={removeWorkday} />
                    ))}
                    <button
                        onClick={addWorkday}
                        className="w-full py-2 rounded-lg border border-dashed border-slate-700/50 text-xs text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all duration-300 flex items-center justify-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Workday Instance
                    </button>
                    {workdayEntries.length > 0 && (
                        <>
                            {workdayError && <p className="text-xs text-red-400">{workdayError}</p>}
                            <button
                                onClick={saveWorkday}
                                disabled={savingWorkday}
                                className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-xs text-white font-medium hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {savingWorkday ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Save Workday Credentials
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
