import { useState, useEffect } from 'react';
import {
    ChevronDown, ChevronUp, Check, X, Sparkles,
    ArrowRight, Building2, MapPin, Clock, TrendingUp, Filter, Search,
    User, Mail, Phone, FileText, Linkedin, Github, Link2,
    Bot, CheckCircle2, AlertCircle, Loader2, Globe, Calendar, Cpu,
    SlidersHorizontal, Briefcase, RefreshCw, GraduationCap, DollarSign,
    Shield, RotateCcw
} from 'lucide-react';
import { searchJobsGrouped, generateForm, triggerResumeTargetedScrape, getScraperStatus, triggerMultiPlatformScrape, getUserScrapeStatus, getStoredToken, getStoredUser, scrapeTopCompanies } from './api';
import SourceBadge from './components/Jobs/SourceBadge';
import ScrapeProgressBar from './components/Jobs/ScrapeProgressBar';
import PlatformFilter from './components/Jobs/PlatformFilter';
import EmbeddedApplicationForm from './components/Jobs/EmbeddedApplicationForm';
import ApplyQueue from './components/Jobs/ApplyQueue';
import { continentData, timeOptions } from './data';

function FormField({ label, value, icon: Icon, filled, className = '' }) {
    return (
        <div className={className}>
            <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${filled ? 'bg-teal-500/5 border-teal-500/30' : 'bg-slate-800/30 border-slate-700/50'}`}>
                {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${filled ? 'text-teal-400' : 'text-slate-500'}`} />}
                <span className={`flex-1 text-sm ${filled ? 'text-white' : 'text-slate-600'}`}>
                    {value || '...'}
                </span>
                {filled && <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />}
            </div>
        </div>
    );
}

export default function JobBrowser({ resumeId, resumeName, onBack }) {
    // API State
    const [companies, setCompanies] = useState([]);
    const [loadingJobs, setLoadingJobs] = useState(true);
    const [error, setError] = useState('');

    // UI Selection State
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [selectedJobs, setSelectedJobs] = useState({});
    const [expandedJobs, setExpandedJobs] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnlySelected, setShowOnlySelected] = useState(false);
    const [showFilters, setShowFilters] = useState(true);

    // Filters & Config
    const [selectedContinents, setSelectedContinents] = useState(['north-america']);
    const [selectedCountries, setSelectedCountries] = useState(['usa', 'canada']);
    const [expandedContinents, setExpandedContinents] = useState({});
    const [postedWithin, setPostedWithin] = useState('30');

    // Generating Form State
    const [fillingStatus, setFillingStatus] = useState('idle'); // idle | filling | complete
    const [formData, setFormData] = useState(null);
    const [showEmbedded, setShowEmbedded] = useState(false); // Toggle between AI form preview and embedded ATS form

    // Scraper status
    const [scraperStatus, setScraperStatus] = useState(null); // { last_run, jobs_scraped }
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isScrapingTopCompanies, setIsScrapingTopCompanies] = useState(false);

    // Platform filter state
    const [selectedPlatforms, setSelectedPlatforms] = useState([]);
    const [multiScrapeStatus, setMultiScrapeStatus] = useState(null);

    // Auth (for multi-platform scrape)
    const authToken = getStoredToken();
    const authUser = getStoredUser();

    // Multi-platform refresh (uses stored credentials when available)
    const refreshJobsMultiPlatform = async () => {
        if (isRefreshing || loadingJobs || !authToken || !authUser) return;
        setIsRefreshing(true);
        setMultiScrapeStatus({ status: 'running', platforms_active: ['arbeitnow', 'remotive', 'remoteok', 'jobicy', 'himalayas', 'findwork'], jobs_found: 0, jobs_stored: 0, errors: [] });
        try {
            await triggerMultiPlatformScrape({}, authToken);
            const maxWait = 120000;
            const pollInterval = 5000;
            let elapsed = 0;
            while (elapsed < maxWait) {
                await new Promise(r => setTimeout(r, pollInterval));
                elapsed += pollInterval;
                try {
                    const s = await getUserScrapeStatus(authUser.id, authToken);
                    setMultiScrapeStatus(s);
                    if (s.status === 'complete' || s.status === 'error') break;
                } catch (_) {}
            }
        } catch (e) {
            console.warn('Multi-platform scrape failed:', e);
        }
        await loadJobs();
        setIsRefreshing(false);
    };

    // Refresh: trigger targeted scrape, poll until status updates, then reload jobs
    const refreshJobs = async () => {
        if (isRefreshing || loadingJobs) return;
        // Use multi-platform scrape if user is authenticated
        if (authToken && authUser) {
            return refreshJobsMultiPlatform();
        }
        setIsRefreshing(true);
        const prevLastRun = scraperStatus?.last_run || 'Never';
        try {
            await triggerResumeTargetedScrape(resumeId);
        } catch (e) {
            console.warn('Scrape trigger failed:', e);
        }
        // Poll scraper status every 4 seconds until last_run changes (max 90s)
        const maxWait = 90000;
        const pollInterval = 4000;
        let elapsed = 0;
        while (elapsed < maxWait) {
            await new Promise(r => setTimeout(r, pollInterval));
            elapsed += pollInterval;
            try {
                const s = await getScraperStatus();
                if (s.last_run && s.last_run !== 'Never' && s.last_run !== prevLastRun) {
                    setScraperStatus(s);
                    break;
                }
            } catch (_) {}
        }
        await loadJobs();
        setIsRefreshing(false);
    };

    // Scrape top 50+ companies via their public Workday portals
    const handleScrapeTopCompanies = async () => {
        if (isScrapingTopCompanies) return;
        setIsScrapingTopCompanies(true);
        try {
            await scrapeTopCompanies();
            // Wait for background scrape to make progress, then reload
            await new Promise(r => setTimeout(r, 5000));
            await loadJobs();
        } catch (err) {
            console.error('Failed to scrape top companies:', err);
        } finally {
            setIsScrapingTopCompanies(false);
        }
    };

    // Initial Load & Rescore
    const loadJobs = async () => {
        if (!resumeId) return;
        setLoadingJobs(true);
        setError('');
        try {
            // Note: In a real app we'd pass filters here to the API. 
            // For now, we search with/without LLM reranking based strictly on our backend schema.
            const response = await searchJobsGrouped(resumeId, {
                limit: 100,
                useLlmRerank: true // Force LLM rerank via Groq
            });
            // Map backend response { company: [...jobs] } to array format
            const compArray = Object.entries(response).map(([name, jobs], index) => {
                const totalJobs = jobs.length;
                const domainName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
                return {
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    logo: jobs[0]?.logo_url || `https://logo.clearbit.com/${domainName}.com`,
                    industry: 'Tech',
                    location: jobs[0]?.location || 'Various',
                    openRoles: totalJobs,
                    selected: index < 5,
                    jobs: [...jobs].sort((a, b) => (b.score || 0) - (a.score || 0)),
                };
            }).sort((a, b) => {
                const bestA = Math.max(...a.jobs.map(j => j.score || 0));
                const bestB = Math.max(...b.jobs.map(j => j.score || 0));
                return bestB - bestA;
            });

            setCompanies(compArray);
            if (compArray.length > 0) setSelectedCompany(compArray[0]);
        } catch (err) {
            setError(err.message || 'Failed to fetch jobs.');
        } finally {
            setLoadingJobs(false);
        }
    };

    // Load jobs and scraper status on mount
    useEffect(() => {
        loadJobs();
        getScraperStatus().then(setScraperStatus).catch(() => {});
    }, [resumeId]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.continent-dropdown')) setExpandedContinents({});
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Selection Handlers
    const toggleCompanySelection = (companyId, e) => {
        e.stopPropagation();
        setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, selected: !c.selected } : c));
    };

    // Build a stable unique key for a job combining platform + id to prevent
    // accidental cross-company/cross-platform collisions
    const jobKey = (job) => `${job.source_platform || 'unknown'}-${job.id}`;

    const toggleJobSelection = (job, e) => {
        e && e.stopPropagation();
        const key = jobKey(job);
        setSelectedJobs(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleJobClick = async (job, company) => {
        setSelectedJob({ ...job, company });
        setFillingStatus('filling');
        setFormData(null);
        setShowEmbedded(false);
        try {
            // Call actual AI generation endpoint
            const formRes = await generateForm(job.id, resumeId);
            setFormData(formRes);
            setFillingStatus('complete');
        } catch (err) {
            console.error(err);
            setFillingStatus('idle'); // revert on error
            alert('Failed to auto-fill form. Please try again.');
        }
    };

    const toggleJobExpand = (jobId, e) => {
        e.stopPropagation();
        setExpandedJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }));
    };

    const toggleContinent = (continentId) => {
        const continent = continentData.find(c => c.id === continentId);
        const countryIds = continent.countries.map(c => c.id);
        if (selectedContinents.includes(continentId)) {
            setSelectedContinents(prev => prev.filter(id => id !== continentId));
            setSelectedCountries(prev => prev.filter(id => !countryIds.includes(id)));
        } else {
            setSelectedContinents(prev => [...prev, continentId]);
            setSelectedCountries(prev => [...new Set([...prev, ...countryIds])]);
        }
    };

    const toggleCountry = (countryId, continentId) => {
        const continent = continentData.find(c => c.id === continentId);
        const countryIds = continent.countries.map(c => c.id);
        setSelectedCountries(prev => {
            const next = prev.includes(countryId) ? prev.filter(id => id !== countryId) : [...prev, countryId];
            const selectedInContinent = countryIds.filter(id => next.includes(id));
            if (selectedInContinent.length === countryIds.length) {
                if (!selectedContinents.includes(continentId)) setSelectedContinents(p => [...p, continentId]);
            } else if (selectedInContinent.length === 0) {
                setSelectedContinents(p => p.filter(id => id !== continentId));
            }
            return next;
        });
    };

    const getContinentState = (continentId) => {
        const continent = continentData.find(c => c.id === continentId);
        const countryIds = continent.countries.map(c => c.id);
        const sel = countryIds.filter(id => selectedCountries.includes(id)).length;
        if (sel === countryIds.length) return 'all';
        if (sel > 0) return 'partial';
        return 'none';
    };

    const getRelevancyClasses = (score) => {
        const r = score * 100;
        if (r >= 90) return 'from-emerald-400 to-teal-500';
        if (r >= 80) return 'from-blue-400 to-cyan-500';
        if (r >= 70) return 'from-amber-400 to-orange-500';
        return 'from-slate-400 to-gray-500';
    };

    const filteredCompanies = companies.filter(c => {
        if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (showOnlySelected && !c.selected) return false;
        if (selectedPlatforms.length > 0) {
            const hasMatchingJob = c.jobs.some(j => selectedPlatforms.includes(j.source_platform));
            if (!hasMatchingJob) return false;
        }
        return true;
    });

    const totalSelected = companies.filter(c => c.selected).length;
    const totalJobs = companies.filter(c => c.selected).reduce((a, c) => a + c.jobs.length, 0);

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
            {/* Header */}
            <header className="flex-shrink-0 sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800/50 px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="flex items-center gap-2 group">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400 bg-clip-text text-transparent">ApplyBot</span>
                        </button>
                        <span className="text-slate-600">|</span>
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <span className="text-sm text-slate-400">{resumeName || 'Resume Active'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${showFilters ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'}`}>
                            <SlidersHorizontal className="w-4 h-4" />
                            Filters
                        </button>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm">
                            <span className="text-indigo-400 font-medium">{totalSelected}</span>
                            <span className="text-slate-500">companies</span>
                            <span className="text-slate-700">|</span>
                            <span className="text-purple-400 font-medium">{totalJobs}</span>
                            <span className="text-slate-500">jobs</span>
                        </div>
                        <button disabled={Object.values(selectedJobs).filter(Boolean).length === 0} className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                            Apply to {Object.values(selectedJobs).filter(Boolean).length} Selected <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Scrape Progress Bar */}
            {multiScrapeStatus && multiScrapeStatus.status !== 'idle' && (
                <div className="flex-shrink-0 px-6 pt-3">
                    <ScrapeProgressBar status={multiScrapeStatus} />
                </div>
            )}

            {/* Filter Panel */}
            {showFilters && (
                <div className="flex-shrink-0 z-20 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl px-6 py-4">
                    <div className="flex items-start gap-6">
                        {/* AI Stack info */}
                        <div className="flex-shrink-0 w-[220px]">
                            <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2"><Cpu className="w-3.5 h-3.5" /> AI Stack</label>
                            <div className="px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-sm">
                                <span className="text-indigo-300 font-medium">Groq</span>
                                <span className="text-slate-500"> · Llama 3.3 70B</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Open-source · reranked by LLM</p>
                        </div>
                        {/* Posted Within */}
                        <div className="flex-shrink-0 w-[160px]">
                            <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2"><Calendar className="w-3.5 h-3.5" /> Posted Within</label>
                            <select value={postedWithin} onChange={e => setPostedWithin(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-sm text-white outline-none focus:border-indigo-500/50 appearance-none cursor-pointer">
                                {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        {/* Location */}
                        <div className="flex-1">
                            <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2"><Globe className="w-3.5 h-3.5" /> Location</label>
                            <div className="flex flex-wrap gap-2">
                                {continentData.map(cont => {
                                    const state = getContinentState(cont.id);
                                    return (
                                        <div key={cont.id} className="relative continent-dropdown">
                                            <div className="flex rounded-lg overflow-hidden border border-slate-700/50">
                                                <button onClick={() => toggleContinent(cont.id)} className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all duration-300 ${state === 'all' ? 'bg-indigo-500/20 text-indigo-300' : state === 'partial' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800/80 text-slate-400'}`}>
                                                    {state === 'all' && <Check className="w-3 h-3" />}
                                                    {state === 'partial' && <span className="text-xs">◐</span>}
                                                    {cont.name}
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setExpandedContinents(p => ({ ...p, [cont.id]: !p[cont.id] })); }} className={`px-1.5 border-l transition-all duration-300 ${state !== 'none' ? 'border-indigo-500/30 bg-indigo-500/10' : 'border-slate-700/50 bg-slate-800/80'}`}>
                                                    {expandedContinents[cont.id] ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                                                </button>
                                            </div>
                                            {expandedContinents[cont.id] && (
                                                <div className="absolute top-full mt-1 left-0 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px]">
                                                    {cont.countries.map(country => (
                                                        <button key={country.id} onClick={() => toggleCountry(country.id, cont.id)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-700/50 transition-all duration-300">
                                                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${selectedCountries.includes(country.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                                                                {selectedCountries.includes(country.id) && <Check className="w-2.5 h-2.5 text-white" />}
                                                            </div>
                                                            <span className={selectedCountries.includes(country.id) ? 'text-white' : 'text-slate-400'}>{country.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Platform filter */}
                        <div className="flex-shrink-0 w-[280px]">
                            <PlatformFilter
                                selectedPlatforms={selectedPlatforms}
                                onChange={setSelectedPlatforms}
                                availablePlatforms={[...new Set(companies.flatMap(c => c.jobs.map(j => j.source_platform)).filter(Boolean))]}
                            />
                        </div>
                        {/* Refresh jobs */}
                        <div className="flex-shrink-0 pt-5 space-y-1">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={refreshJobs}
                                    disabled={isRefreshing || loadingJobs}
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 disabled:opacity-50"
                                >
                                    {isRefreshing
                                        ? <><RotateCcw className="w-4 h-4 animate-spin" /> Fetching…</>
                                        : <><RefreshCw className="w-4 h-4" /> Refresh Jobs</>
                                    }
                                </button>
                                <button
                                    onClick={handleScrapeTopCompanies}
                                    disabled={isScrapingTopCompanies || isRefreshing}
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300 disabled:opacity-50"
                                >
                                    {isScrapingTopCompanies
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Scraping 50+ Companies…</>
                                        : <><Building2 className="w-4 h-4" /> Scrape Top Companies</>
                                    }
                                </button>
                            </div>
                            {scraperStatus?.last_run && scraperStatus.last_run !== 'Never' && (
                                <p className="text-xs text-slate-500">
                                    Updated {new Date(scraperStatus.last_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">

                {/* Companies Panel */}
                <div className={`flex flex-col overflow-hidden border-r border-slate-800/50 transition-all duration-300 ${selectedJob ? 'w-[280px]' : 'w-[360px]'}`} style={{ flexShrink: 0 }}>
                    <div className="flex-shrink-0 p-4 border-b border-slate-800/50 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
                                <Search className="w-4 h-4 text-slate-500" />
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search companies..." className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-slate-600" />
                            </div>
                            <button onClick={() => setShowOnlySelected(!showOnlySelected)} className={`p-2 rounded-lg transition-all duration-300 ${showOnlySelected ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800/50 text-slate-500 border border-slate-700/50'}`}>
                                <Filter className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">{filteredCompanies.length} companies</p>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 relative">
                        {loadingJobs && (
                            <div className="absolute inset-0 z-10 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            </div>
                        )}
                        {error && (
                            <div className="p-4 text-center text-red-400 text-sm">{error}</div>
                        )}
                        {!loadingJobs && filteredCompanies.length === 0 && !error && (
                            <div className="p-4 text-center text-slate-500 text-sm">No companies found. (Maybe scraping is still running?)</div>
                        )}

                        {filteredCompanies.map(company => {
                            const sourcePlatforms = [...new Set(
                                company.jobs.map(j => j.source_platform).filter(Boolean)
                            )];
                            return (
                                <button key={company.id} onClick={() => setSelectedCompany(company)} className={`w-full text-left p-3 rounded-xl transition-all duration-300 border ${selectedCompany?.id === company.id ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/30' : 'bg-slate-900/30 border-slate-800/50 hover:bg-slate-800/30'}`}>
                                    <div className="flex items-start gap-3">
                                        <img src={company.logo} alt={company.name} className="w-10 h-10 rounded-xl bg-slate-800 object-contain" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-semibold text-sm text-white truncate">{company.name}</h3>
                                                <button onClick={(e) => toggleCompanySelection(company.id, e)} className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all duration-300 ${company.selected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 hover:border-slate-500'}`}>
                                                    {company.selected && <Check className="w-3 h-3 text-white" />}
                                                </button>
                                            </div>
                                            {sourcePlatforms.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {sourcePlatforms.slice(0, 3).map(platform => (
                                                        <SourceBadge key={platform} platform={platform} />
                                                    ))}
                                                    {sourcePlatforms.length > 3 && (
                                                        <span className="px-1.5 py-0.5 rounded-md text-xs bg-slate-700/50 text-slate-400">
                                                            +{sourcePlatforms.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-xs text-slate-400">{company.openRoles} roles</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Jobs Panel */}
                {selectedCompany ? (
                    <div className={`flex flex-col overflow-hidden border-r border-slate-800/50 transition-all duration-300 ${selectedJob ? 'w-[320px]' : 'w-[400px]'}`} style={{ flexShrink: 0 }}>
                        <div className="flex-shrink-0 p-4 border-b border-slate-800/50">
                            <div className="flex items-center gap-3 mb-1">
                                <img src={selectedCompany.logo} alt="" className="w-6 h-6 rounded-lg" />
                                <h2 className="font-semibold text-sm">{selectedCompany.name}</h2>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-slate-500">{selectedCompany.jobs.length} open roles</p>
                                <span className="flex items-center gap-1 text-xs text-slate-500"><TrendingUp className="w-3 h-3" /> Sorted by relevancy</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                            {/* The jobs are naturally sorted by score from the backend, but we'll sort explicitly just in case */}
                            {[...selectedCompany.jobs].sort((a, b) => (b.score || 0) - (a.score || 0)).map(job => (
                                <div key={jobKey(job)} className={`rounded-xl border transition-all duration-300 cursor-pointer ${selectedJob?.id === job.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900/30 border-slate-800/50 hover:bg-slate-800/30'}`}>
                                    <div className="p-3" onClick={() => handleJobClick(job, selectedCompany)}>
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className="font-semibold text-sm text-white leading-tight">{job.title}</h3>
                                            <span className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-xs font-bold bg-gradient-to-r ${getRelevancyClasses(job.score)} text-white`}>{(job.score * 100).toFixed(0)}%</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {job.source_platform && <SourceBadge platform={job.source_platform} />}
                                            {job.easy_apply && <span className="px-1.5 py-0.5 rounded-md text-xs bg-teal-500/10 text-teal-400 border border-teal-500/20">Easy Apply</span>}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                            <MapPin className="w-3 h-3" /> {job.location || 'Remote'}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500">{job.type || 'Full-time'}</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={(e) => toggleJobExpand(job.id, e)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                                    {expandedJobs[job.id] ? <>Collapse <ChevronUp className="w-3 h-3" /></> : <>Expand JD <ChevronDown className="w-3 h-3" /></>}
                                                </button>
                                                <button onClick={(e) => toggleJobSelection(job, e)} className={`ml-1 p-1 rounded-md transition-all duration-300 ${selectedJobs[jobKey(job)] ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800/50 text-slate-500'}`}>
                                                    {selectedJobs[jobKey(job)] ? <Check className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {expandedJobs[job.id] && (
                                        <div className="px-3 pb-3 border-t border-slate-800/50 pt-2 space-y-2">
                                            {/* Posted date */}
                                            {job.posted && (
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(job.posted).toLocaleDateString()}
                                                </div>
                                            )}
                                            {/* Match reasons from LLM reranker */}
                                            {job.match_reasons?.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-slate-500 mb-1">Why it matches:</p>
                                                    <ul className="space-y-0.5">
                                                        {job.match_reasons.map((r, i) => (
                                                            <li key={i} className="flex items-start gap-1.5 text-xs text-teal-400">
                                                                <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />{r}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {/* Skill matches */}
                                            {job.skill_matches?.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {job.skill_matches.map((s, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 rounded-md text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{s}</span>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Missing skills */}
                                            {job.missing_skills?.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    <span className="text-xs text-slate-500 mr-1">Gaps:</span>
                                                    {job.missing_skills.map((s, i) => (
                                                        <span key={i} className="px-1.5 py-0.5 rounded-md text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">{s}</span>
                                                    ))}
                                                </div>
                                            )}
                                            {/* Description */}
                                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar text-xs text-slate-400 whitespace-pre-line bg-slate-800/30 p-3 rounded-lg">
                                                {job.description}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleJobClick(job, selectedCompany)} className="flex-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 text-xs font-medium hover:bg-indigo-500/20 transition-all duration-300">View Application Form</button>
                                                <button onClick={(e) => toggleJobSelection(job, e)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${selectedJobs[jobKey(job)] ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'}`}>{selectedJobs[jobKey(job)] ? '✓ Selected' : 'Select'}</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
                            <Building2 className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-400 mb-2">Select a Company</h3>
                        <p className="text-sm text-slate-600">Choose a company from the left panel to browse their open positions.</p>
                    </div>
                )}

                {/* Application Form Panel */}
                {selectedCompany && (selectedJob ? (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        {/* Form Header */}
                        <div className="flex-shrink-0 p-6 border-b border-slate-800/50">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <img src={selectedJob.company.logo} alt="" className="w-8 h-8 rounded-xl bg-slate-800" />
                                        <span className="font-medium text-sm">{selectedJob.company.name}</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">{selectedJob.title}</h2>
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedJob.location || 'Remote'}</span>
                                        <span>{selectedJob.type}</span>
                                        <span className="text-emerald-400">{selectedJob.salary || ''}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Toggle between AI preview and embedded form */}
                                    <div className="flex rounded-lg overflow-hidden border border-slate-700/50 text-xs">
                                        <button
                                            onClick={() => setShowEmbedded(false)}
                                            className={`px-3 py-1.5 transition-all ${!showEmbedded ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'}`}
                                        >
                                            AI Form
                                        </button>
                                        <button
                                            onClick={() => setShowEmbedded(true)}
                                            className={`px-3 py-1.5 transition-all ${showEmbedded ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'}`}
                                        >
                                            Apply Form
                                        </button>
                                    </div>
                                    <button onClick={() => { setSelectedJob(null); setFillingStatus('idle'); setShowEmbedded(false); }} className="p-2 rounded-lg hover:bg-slate-800 transition-all duration-300">
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Embedded Application Form (when toggled) */}
                        {showEmbedded ? (
                            <EmbeddedApplicationForm
                                job={selectedJob}
                                formData={formData}
                                fillingStatus={fillingStatus}
                                onAutoFillClick={() => {}}
                            />
                        ) : (
                        <>

                        {/* AI Status */}
                        <div className={`flex-shrink-0 mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${fillingStatus === 'idle' ? 'bg-slate-800/50 border border-slate-700/50' : fillingStatus === 'filling' ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-teal-500/10 border border-teal-500/30'}`}>
                            {fillingStatus === 'idle' && <><Bot className="w-5 h-5 text-slate-400" /><span className="text-sm text-slate-400">Ready to auto-fill application</span></>}
                            {fillingStatus === 'filling' && <><Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /><span className="text-sm text-indigo-300">AI is filling your application with Groq LLM...</span></>}
                            {fillingStatus === 'complete' && <><CheckCircle2 className="w-5 h-5 text-teal-400" /><span className="text-sm text-teal-300">Application auto-filled successfully based on your resume</span></>}
                        </div>

                        {/* Form Body - All sections returned from Groq LLM */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-5">

                            {/* 1. Personal Info */}
                            <FormSection title="Personal Information" icon={User} color="text-indigo-400" filled={fillingStatus === 'complete'}>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="First Name" value={formData?.personal_info?.first_name} icon={User} filled={fillingStatus === 'complete'} />
                                    <FormField label="Last Name" value={formData?.personal_info?.last_name} icon={User} filled={fillingStatus === 'complete'} />
                                    <FormField label="Email" value={formData?.personal_info?.email} icon={Mail} filled={fillingStatus === 'complete'} />
                                    <FormField label="Phone" value={formData?.personal_info?.phone} icon={Phone} filled={fillingStatus === 'complete'} />
                                    <FormField label="Location" value={formData?.personal_info?.location} icon={MapPin} filled={fillingStatus === 'complete'} />
                                    <FormField label="LinkedIn" value={formData?.personal_info?.linkedin} icon={Linkedin} filled={fillingStatus === 'complete'} />
                                </div>
                            </FormSection>

                            {/* 2. Professional Links */}
                            <FormSection title="Professional Links" icon={Link2} color="text-cyan-400" filled={fillingStatus === 'complete'}>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="GitHub" value={formData?.professional_links?.github} icon={Github} filled={fillingStatus === 'complete'} />
                                    <FormField label="Portfolio" value={formData?.professional_links?.portfolio} icon={Globe} filled={fillingStatus === 'complete'} />
                                </div>
                            </FormSection>

                            {/* 3. Experience */}
                            <FormSection title="Professional Experience" icon={Briefcase} color="text-purple-400" filled={fillingStatus === 'complete'}>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Current / Last Title" value={formData?.experience?.current_title} icon={Briefcase} filled={fillingStatus === 'complete'} />
                                    <FormField label="Current / Last Company" value={formData?.experience?.current_company} icon={Building2} filled={fillingStatus === 'complete'} />
                                    <FormField label="Years of Experience" value={formData?.experience?.years_experience} icon={Clock} filled={fillingStatus === 'complete'} />
                                    <FormField label="Salary Expectation" value={formData?.experience?.salary_expectation} icon={DollarSign} filled={fillingStatus === 'complete'} />
                                </div>
                            </FormSection>

                            {/* 4. Education */}
                            <FormSection title="Education" icon={GraduationCap} color="text-amber-400" filled={fillingStatus === 'complete'}>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Degree" value={formData?.education?.degree} icon={GraduationCap} filled={fillingStatus === 'complete'} className="col-span-2" />
                                    <FormField label="University" value={formData?.education?.university} icon={Building2} filled={fillingStatus === 'complete'} />
                                    <FormField label="Graduation Year" value={formData?.education?.graduation_year} icon={Calendar} filled={fillingStatus === 'complete'} />
                                </div>
                            </FormSection>

                            {/* 5. Work Auth & Relocation */}
                            <FormSection title="Work Authorization" icon={Shield} color="text-emerald-400" filled={fillingStatus === 'complete'}>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Work Authorization" value={formData?.work_auth} icon={Shield} filled={fillingStatus === 'complete'} />
                                    <FormField
                                        label="Willing to Relocate"
                                        value={formData?.willing_to_relocate === true ? 'Yes' : formData?.willing_to_relocate === false ? 'No' : undefined}
                                        icon={MapPin}
                                        filled={fillingStatus === 'complete'}
                                    />
                                </div>
                            </FormSection>

                            {/* 6. Professional Summary */}
                            <FormSection title="Professional Summary" icon={FileText} color="text-teal-400" filled={fillingStatus === 'complete'}>
                                <div className={`p-4 rounded-xl border transition-all duration-300 min-h-[80px] text-sm whitespace-pre-wrap ${fillingStatus === 'complete' ? 'bg-teal-500/5 border-teal-500/30 text-slate-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-600'}`}>
                                    {formData?.summary || '...'}
                                </div>
                            </FormSection>

                            {/* 7. AI Cover Letter */}
                            <FormSection title="AI Cover Letter" icon={Bot} color="text-indigo-400" filled={fillingStatus === 'complete'}>
                                {fillingStatus === 'complete' && (
                                    <span className="inline-block text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 mb-2">Generated by Groq · Llama 3 8B</span>
                                )}
                                <div className={`p-4 rounded-xl border transition-all duration-300 min-h-[120px] text-sm whitespace-pre-wrap ${fillingStatus === 'complete' ? 'bg-teal-500/5 border-teal-500/30 text-slate-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-600'}`}>
                                    {formData?.cover_letter || '...'}
                                </div>
                            </FormSection>

                        </div>

                        {/* Submit */}
                        <div className="flex-shrink-0 p-6 border-t border-slate-800/50 flex items-center gap-4">
                            <button disabled={fillingStatus !== 'complete'} onClick={(e) => toggleJobSelection(selectedJob, e)} className={`flex-1 py-3 rounded-xl font-medium transition-all duration-300 ${selectedJobs[jobKey(selectedJob)] ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed'}`}>
                                {selectedJobs[jobKey(selectedJob)] ? '✓ Added to Queue' : 'Add to Apply Queue'}
                            </button>
                            <a href={selectedJob.apply_url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 font-medium hover:bg-slate-700/50 transition-all duration-300 flex items-center gap-2">
                                Apply Direct <Globe className="w-4 h-4" />
                            </a>
                        </div>

                        </>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
                            <Briefcase className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-400 mb-2">Select a Role</h3>
                        <p className="text-sm text-slate-600">Click on a job listing to preview the AI-filled application form.</p>
                    </div>
                ))}
            </div>

            <ApplyQueue
                selectedJobs={selectedJobs}
                companies={companies}
                onRemoveJob={(job) => {
                    const key = jobKey(job);
                    setSelectedJobs(prev => ({ ...prev, [key]: false }));
                }}
                onClearQueue={() => setSelectedJobs({})}
                jobKeyFn={jobKey}
            />
        </div>
    );
}

function FormSection({ title, icon: Icon, color, filled, children }) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${color}`} />
                <h3 className="text-sm font-semibold text-white">{title}</h3>
                {filled && <CheckCircle2 className="w-4 h-4 text-teal-400 ml-auto" />}
            </div>
            {children}
        </div>
    );
}
