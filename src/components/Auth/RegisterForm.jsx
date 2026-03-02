import { useState } from 'react';
import { Mail, Lock, User, Loader2, Bot } from 'lucide-react';
import { registerUser } from '../../api';

export default function RegisterForm({ onSuccess, onSwitchToLogin }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await registerUser(name, email, password);
            onSuccess(data);
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-6 justify-center">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Create your account</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Full Name</label>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 focus-within:border-indigo-500/50">
                        <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Jane Smith"
                            required
                            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-600"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Email</label>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 focus-within:border-indigo-500/50">
                        <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-600"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Password</label>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 focus-within:border-indigo-500/50">
                        <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={8}
                            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-600"
                        />
                    </div>
                </div>

                {error && (
                    <p className="text-sm text-red-400 text-center">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 disabled:opacity-50"
                >
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Account'}
                </button>

                <p className="text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <button type="button" onClick={onSwitchToLogin} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                        Sign in
                    </button>
                </p>
            </form>
        </div>
    );
}
