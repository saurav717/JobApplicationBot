import { CheckCircle2, XCircle, Clock } from 'lucide-react';

const PLATFORM_LABELS = {
    linkedin: 'LinkedIn',
    glassdoor: 'Glassdoor',
    indeed: 'Indeed',
    jobright: 'Jobright',
    workday: 'Workday',
};

export default function ConnectionStatus({ platforms }) {
    if (!platforms || Object.keys(platforms).length === 0) {
        return (
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                No platforms connected yet
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {Object.entries(platforms).map(([platform, info]) => {
                const isWorkdayArray = Array.isArray(info);
                const label = isWorkdayArray
                    ? `Workday (${info.length})`
                    : PLATFORM_LABELS[platform] || platform;
                const connected = isWorkdayArray ? info.length > 0 : info.connected;

                return (
                    <div
                        key={platform}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border ${
                            connected
                                ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                        }`}
                    >
                        {connected
                            ? <CheckCircle2 className="w-3 h-3" />
                            : <XCircle className="w-3 h-3" />
                        }
                        {label}
                    </div>
                );
            })}
        </div>
    );
}
