import { useState } from 'react';
import { Briefcase, Play, X, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';

export default function ApplyQueue({
    selectedJobs,
    companies,
    onRemoveJob,
    onClearQueue,
    jobKeyFn,
}) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Collect all selected jobs with their company details
    const queuedJobs = [];
    for (const company of companies) {
        for (const job of company.jobs) {
            const key = jobKeyFn(job);
            if (selectedJobs[key]) {
                queuedJobs.push({ ...job, companyName: company.name, companyLogo: company.logo });
            }
        }
    }

    if (queuedJobs.length === 0) return null;

    const handleStartApplying = () => {
        if (queuedJobs.length > 0) {
            window.open(queuedJobs[0].apply_url, '_blank');
        }
    };

    return (
        <div className="fixed bottom-6 right-6 w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-40">
            {/* Header */}
            <div
                className="p-4 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-all"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Apply Queue</h3>
                        <p className="text-xs text-slate-400">{queuedJobs.length} jobs ready to apply</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onClearQueue(); }}
                        className="text-xs text-slate-500 hover:text-slate-300"
                    >
                        Clear all
                    </button>
                    {isExpanded
                        ? <ChevronDown className="w-5 h-5 text-slate-400" />
                        : <ChevronUp className="w-5 h-5 text-slate-400" />
                    }
                </div>
            </div>

            {/* Job List */}
            {isExpanded && (
                <>
                    <div className="max-h-60 overflow-y-auto p-3 space-y-2">
                        {queuedJobs.map((job, i) => (
                            <div
                                key={i}
                                className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-3"
                            >
                                <img
                                    src={job.companyLogo}
                                    alt=""
                                    className="w-8 h-8 rounded-lg bg-slate-700 object-contain"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{job.title}</p>
                                    <p className="text-xs text-slate-400">{job.companyName}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <a
                                        href={job.apply_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                    <button
                                        onClick={() => onRemoveJob(job)}
                                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Apply Button */}
                    <div className="p-4 border-t border-slate-800">
                        <button
                            onClick={handleStartApplying}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-teal-500/20 transition-all"
                        >
                            <Play className="w-5 h-5" />
                            Start Applying
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
