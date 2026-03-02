import { Check } from 'lucide-react';

const PLATFORMS = ['linkedin', 'glassdoor', 'indeed', 'jobright', 'workday', 'lever', 'greenhouse', 'arbeitnow', 'remotive'];

const PLATFORM_LABELS = {
    linkedin: 'LinkedIn',
    glassdoor: 'Glassdoor',
    indeed: 'Indeed',
    jobright: 'Jobright',
    workday: 'Workday',
    lever: 'Lever',
    greenhouse: 'Greenhouse',
    arbeitnow: 'Arbeitnow',
    remotive: 'Remotive',
};

export default function PlatformFilter({ selectedPlatforms, onChange, availablePlatforms }) {
    const platforms = availablePlatforms?.length ? availablePlatforms : PLATFORMS;

    const toggle = (platform) => {
        if (selectedPlatforms.includes(platform)) {
            onChange(selectedPlatforms.filter(p => p !== platform));
        } else {
            onChange([...selectedPlatforms, platform]);
        }
    };

    const allSelected = platforms.every(p => selectedPlatforms.includes(p));

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">Source Platform</label>
                <button
                    onClick={() => onChange(allSelected ? [] : platforms)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                    {allSelected ? 'Deselect all' : 'Select all'}
                </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {platforms.map(platform => {
                    const selected = selectedPlatforms.includes(platform);
                    return (
                        <button
                            key={platform}
                            onClick={() => toggle(platform)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-300 ${
                                selected
                                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                                    : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                            }`}
                        >
                            {selected && <Check className="w-3 h-3" />}
                            {PLATFORM_LABELS[platform] || platform}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
