import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ScrapeProgressBar({ status }) {
    if (!status || status.status === 'idle') return null;

    const isRunning = status.status === 'running';
    const isComplete = status.status === 'complete';
    const isError = status.status === 'error';

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all duration-300 ${
            isRunning ? 'bg-indigo-500/10 border-indigo-500/30' :
            isComplete ? 'bg-teal-500/10 border-teal-500/30' :
            'bg-red-500/10 border-red-500/30'
        }`}>
            {isRunning && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" />}
            {isComplete && <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />}
            {isError && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}

            <div className="flex-1 min-w-0">
                {isRunning && (
                    <span className="text-indigo-300">
                        Scraping {status.platforms_active.join(', ') || 'platforms'}…
                    </span>
                )}
                {isComplete && (
                    <span className="text-teal-300">
                        Scrape complete — {status.jobs_stored} new jobs added from {status.platforms_active.length} platforms
                    </span>
                )}
                {isError && (
                    <span className="text-red-300">
                        Scrape error: {status.errors?.[0] || 'Unknown error'}
                    </span>
                )}
            </div>

            {(isComplete || isRunning) && (
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-shrink-0">
                    {status.jobs_found > 0 && <span>{status.jobs_found} found</span>}
                    {status.jobs_stored > 0 && <span className="text-teal-400">{status.jobs_stored} stored</span>}
                </div>
            )}
        </div>
    );
}
