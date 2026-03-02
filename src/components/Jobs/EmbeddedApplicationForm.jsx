import { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, ExternalLink, AlertTriangle, Bot, Check } from 'lucide-react';

// ATS platforms that typically allow iframe embedding
const EMBEDDABLE_PATTERNS = [
    /\.myworkdayjobs\.com/,
    /jobs\.lever\.co/,
    /boards\.greenhouse\.io/,
    /\.ashbyhq\.com/,
    /\.recruitee\.com/,
    /\.breezy\.hr/,
    /\.smartrecruiters\.com/,
];

// Platforms that block iframes via X-Frame-Options
const NON_EMBEDDABLE_PATTERNS = [
    /linkedin\.com/,
    /glassdoor\.com/,
    /indeed\.com/,
    /remoteok\.com/,
    /remotive\.com/,
    /arbeitnow\.com/,
    /jobicy\.com/,
    /himalayas\.app/,
    /findwork\.dev/,
];

export default function EmbeddedApplicationForm({
    job,
    formData,
    onAutoFillClick,
    fillingStatus,
}) {
    const iframeRef = useRef(null);
    const [loadError, setLoadError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const applicationUrl = job?.application_url || job?.apply_url || job?.source_url;

    const canEmbed = useMemo(() => {
        if (!applicationUrl) return false;
        if (NON_EMBEDDABLE_PATTERNS.some(p => p.test(applicationUrl))) return false;
        // Allow known embeddable ATS platforms, or try for unknown ones
        return EMBEDDABLE_PATTERNS.some(p => p.test(applicationUrl)) ||
            (!NON_EMBEDDABLE_PATTERNS.some(p => p.test(applicationUrl)));
    }, [applicationUrl]);

    // Reset state when job changes
    useEffect(() => {
        setLoadError(false);
        setIsLoading(true);
    }, [applicationUrl]);

    // Timeout fallback: if still loading after 10s, assume blocked
    useEffect(() => {
        if (!canEmbed || loadError) return;
        const timer = setTimeout(() => {
            if (isLoading) {
                setLoadError(true);
                setIsLoading(false);
            }
        }, 10000);
        return () => clearTimeout(timer);
    }, [canEmbed, isLoading, loadError]);

    const handleAutoFillCopy = () => {
        if (formData) {
            try {
                navigator.clipboard.writeText(JSON.stringify(formData, null, 2));
            } catch {
                // Clipboard not available, silently ignore
            }
        }
        onAutoFillClick?.();
    };

    // Fallback UI for non-embeddable or errored frames
    if (!applicationUrl || loadError || !canEmbed) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                        {!applicationUrl ? 'No Application URL' : 'Cannot Embed Application Form'}
                    </h3>
                    <p className="text-sm text-slate-400 max-w-md mb-6">
                        {!applicationUrl
                            ? 'This job posting does not have a direct application URL.'
                            : job?.source_platform === 'linkedin'
                                ? "LinkedIn doesn't allow embedding. Click below to open the application in a new tab."
                                : "This site doesn't allow embedding. Open the form in a new tab and use the auto-fill data below."}
                    </p>

                    {/* AI Auto-fill preparation */}
                    <div className="w-full max-w-md p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Bot className="w-5 h-5 text-indigo-400" />
                            <span className="text-sm font-medium text-white">AI Auto-Fill Ready</span>
                            {fillingStatus === 'complete' && <Check className="w-4 h-4 text-teal-400" />}
                        </div>
                        <p className="text-xs text-slate-400 mb-3">
                            {fillingStatus === 'complete'
                                ? "Your application data is ready. Copy it to clipboard for reference while filling the form."
                                : fillingStatus === 'filling'
                                    ? "AI is generating your application data..."
                                    : "Select a job to generate AI auto-fill data."}
                        </p>
                        <button
                            onClick={handleAutoFillCopy}
                            disabled={fillingStatus !== 'complete'}
                            className="w-full py-2 rounded-lg bg-indigo-500/20 text-indigo-300 text-sm hover:bg-indigo-500/30 disabled:opacity-50 transition-all"
                        >
                            {fillingStatus === 'filling' ? 'Preparing...' : 'Copy Auto-Fill Data to Clipboard'}
                        </button>
                    </div>

                    {applicationUrl && (
                        <a
                            href={applicationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
                        >
                            Open Application Form <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                </div>
            </div>
        );
    }

    // Embeddable application form
    return (
        <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="flex-shrink-0 px-4 py-2 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-white truncate">{job.title}</span>
                    <span className="text-xs text-slate-500 flex-shrink-0">at {job.company}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={handleAutoFillCopy}
                        disabled={fillingStatus !== 'complete'}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium flex items-center gap-1.5 hover:bg-indigo-500/30 disabled:opacity-50 transition-all"
                    >
                        <Bot className="w-3.5 h-3.5" />
                        {fillingStatus === 'complete' ? 'Copy Auto-Fill' : 'Preparing...'}
                    </button>
                    <a
                        href={applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                        title="Open in new tab"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            </div>

            {/* Embedded iframe */}
            <div className="flex-1 relative bg-white">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    src={applicationUrl}
                    className="w-full h-full border-0"
                    onLoad={() => setIsLoading(false)}
                    onError={() => { setLoadError(true); setIsLoading(false); }}
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    title={`Application for ${job.title} at ${job.company}`}
                />
            </div>
        </div>
    );
}
