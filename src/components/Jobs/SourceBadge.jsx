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
    remoteok: { label: 'RemoteOK', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
    jobicy: { label: 'Jobicy', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
    himalayas: { label: 'Himalayas', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    findwork: { label: 'Findwork', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
    the_muse: { label: 'The Muse', color: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' },
    twitter: { label: 'Twitter/X', color: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
    company_site: { label: 'Company', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    direct: { label: 'Direct', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

export default function SourceBadge({ platform }) {
    if (!platform) return null;
    const key = platform.toLowerCase().replace(/[\s.-]/g, '_');
    const cfg = PLATFORM_CONFIG[key] || {
        label: platform.charAt(0).toUpperCase() + platform.slice(1),
        color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
    return (
        <span className={`px-1.5 py-0.5 rounded-md text-xs border font-medium ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}
