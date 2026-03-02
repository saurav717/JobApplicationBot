const PLATFORM_CONFIG = {
    linkedin: { label: 'LinkedIn', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    glassdoor: { label: 'Glassdoor', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
    indeed: { label: 'Indeed', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    jobright: { label: 'Jobright', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    workday: { label: 'Workday', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
    lever: { label: 'Lever', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
    greenhouse: { label: 'Greenhouse', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    arbeitnow: { label: 'Arbeitnow', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    remotive: { label: 'Remotive', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
};

export default function SourceBadge({ platform }) {
    if (!platform) return null;
    const cfg = PLATFORM_CONFIG[platform] || { label: platform, color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    return (
        <span className={`px-1.5 py-0.5 rounded-md text-xs border font-medium ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}
