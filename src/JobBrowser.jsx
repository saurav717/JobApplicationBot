import { useState, useEffect } from 'react';
import {
    ChevronRight, ChevronDown, ChevronUp, Check, X, Upload, Sparkles,
    ArrowRight, Building2, MapPin, Clock, TrendingUp, Filter, Search,
    User, Mail, Phone, FileText, GraduationCap, Link2, Linkedin, Github,
    Bot, CheckCircle2, AlertCircle, Loader2, Globe, Calendar, Cpu,
    SlidersHorizontal, Briefcase
} from 'lucide-react';
import { mockCompanies as initialCompanies, userProfile, llmOptions, continentData, timeOptions } from './data';

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

export default function JobBrowser({ onBack }) {
    const [companies, setCompanies] = useState(initialCompanies);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [selectedJobs, setSelectedJobs] = useState({});
    const [expandedJobs, setExpandedJobs] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [showOnlySelected, setShowOnlySelected] = useState(false);
    const [showFilters, setShowFilters] = useState(true);
    const [selectedLLM, setSelectedLLM] = useState('claude-sonnet');
    const [selectedContinents, setSelectedContinents] = useState(['north-america']);
    const [selectedCountries, setSelectedCountries] = useState(['usa', 'canada']);
    const [expandedContinents, setExpandedContinents] = useState({});
    const [postedWithin, setPostedWithin] = useState('30');
    const [fillingStatus, setFillingStatus] = useState('idle');
    const [showJD, setShowJD] = useState(false);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.continent-dropdown')) {
                setExpandedContinents({});
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const toggleCompanySelection = (companyId, e) => {
        e.stopPropagation();
        setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, selected: !c.selected } : c));
    };

    const toggleJobSelection = (jobId, e) => {
        e && e.stopPropagation();
        setSelectedJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }));
    };

    const handleJobClick = (job, company) => {
        setSelectedJob({ ...job, company });
        setFillingStatus('filling');
        setTimeout(() => setFillingStatus('complete'), 2000);
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

    const getRelevancyClasses = (r) => {
        if (r >= 90) return 'from-emerald-400 to-teal-500';
        if (r >= 80) return 'from-blue-400 to-cyan-500';
        if (r >= 70) return 'from-amber-400 to-orange-500';
        return 'from-slate-400 to-gray-500';
    };

    const filteredCompanies = companies.filter(c => {
        if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (showOnlySelected && !c.selected) return false;
        return true;
    });

    const totalSelected = companies.filter(c => c.selected).length;
    const totalJobs = companies.filter(c => c.selected).reduce((a, c) => a + c.jobs.length, 0);
    const currentLLM = llmOptions.find(l => l.id === selectedLLM);

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
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
                        <span className="text-sm text-slate-400">Job Browser</span>
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
                        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 flex items-center gap-2">
                            Apply to Selected <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Filter Panel */}
            {showFilters && (
                <div className="flex-shrink-0 z-20 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-xl px-6 py-4">
                    <div className="flex items-start gap-6">
                        {/* LLM Selection */}
                        <div className="flex-shrink-0 w-[220px]">
                            <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-2"><Cpu className="w-3.5 h-3.5" /> LLM Model</label>
                            <select value={selectedLLM} onChange={e => setSelectedLLM(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700/50 text-sm text-white outline-none focus:border-indigo-500/50 appearance-none cursor-pointer">
                                {llmOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">{currentLLM?.description}</p>
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
                        {/* Rescore */}
                        <div className="flex-shrink-0 pt-5">
                            <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-sm font-medium flex items-center gap-2 hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300">
                                <Sparkles className="w-4 h-4" /> Rescore
                            </button>
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
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                        {filteredCompanies.map(company => (
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
                                        <p className="text-xs text-slate-500">{company.industry}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-slate-400">{company.openRoles} roles</span>
                                            {company.accountRequired && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">LOGIN</span>}
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
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
                            {[...selectedCompany.jobs].sort((a, b) => b.relevancy - a.relevancy).map(job => (
                                <div key={job.id} className={`rounded-xl border transition-all duration-300 cursor-pointer ${selectedJob?.id === job.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900/30 border-slate-800/50 hover:bg-slate-800/30'}`}>
                                    <div className="p-3" onClick={() => handleJobClick(job, selectedCompany)}>
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className="font-semibold text-sm text-white leading-tight">{job.title}</h3>
                                            <span className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-xs font-bold bg-gradient-to-r ${getRelevancyClasses(job.relevancy)} text-white`}>{job.relevancy}%</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
                                            <MapPin className="w-3 h-3" /> {job.location}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-500">{job.salary}</span>
                                            <div className="flex items-center gap-1">
                                                <button onClick={(e) => toggleJobExpand(job.id, e)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                                    {expandedJobs[job.id] ? <>Collapse <ChevronUp className="w-3 h-3" /></> : <>Expand JD <ChevronDown className="w-3 h-3" /></>}
                                                </button>
                                                <button onClick={(e) => toggleJobSelection(job.id, e)} className={`ml-1 p-1 rounded-md transition-all duration-300 ${selectedJobs[job.id] ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800/50 text-slate-500'}`}>
                                                    {selectedJobs[job.id] ? <Check className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {expandedJobs[job.id] && (
                                        <div className="px-3 pb-3 border-t border-slate-800/50 pt-2">
                                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {job.posted}</span>
                                                <span>• {job.type}</span>
                                                <span>• {job.department}</span>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar text-xs text-slate-400 whitespace-pre-line bg-slate-800/30 p-3 rounded-lg">{job.description}</div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <button onClick={() => handleJobClick(job, selectedCompany)} className="flex-1 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 text-xs font-medium hover:bg-indigo-500/20 transition-all duration-300">View Application Form</button>
                                                <button onClick={(e) => toggleJobSelection(job.id, e)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${selectedJobs[job.id] ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'}`}>{selectedJobs[job.id] ? '✓ Selected' : 'Select'}</button>
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
                                        <img src={selectedJob.company.logo} alt="" className="w-8 h-8 rounded-xl" />
                                        <span className="font-medium text-sm">{selectedJob.company.name}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300">{selectedJob.department}</span>
                                    </div>
                                    <h2 className="text-2xl font-bold text-white mb-2">{selectedJob.title}</h2>
                                    <div className="flex items-center gap-4 text-sm text-slate-400">
                                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selectedJob.location}</span>
                                        <span>{selectedJob.type}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedJob.posted}</span>
                                        <span className="text-emerald-400">{selectedJob.salary}</span>
                                    </div>
                                </div>
                                <button onClick={() => { setSelectedJob(null); setFillingStatus('idle'); }} className="p-2 rounded-lg hover:bg-slate-800 transition-all duration-300">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* AI Status */}
                        <div className={`flex-shrink-0 mx-6 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${fillingStatus === 'idle' ? 'bg-slate-800/50 border border-slate-700/50' : fillingStatus === 'filling' ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-teal-500/10 border border-teal-500/30'}`}>
                            {fillingStatus === 'idle' && <><Bot className="w-5 h-5 text-slate-400" /><span className="text-sm text-slate-400">Ready to auto-fill application</span></>}
                            {fillingStatus === 'filling' && <><Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /><span className="text-sm text-indigo-300">AI is filling your application...</span></>}
                            {fillingStatus === 'complete' && <><CheckCircle2 className="w-5 h-5 text-teal-400" /><span className="text-sm text-teal-300">Application auto-filled successfully</span></>}
                        </div>

                        {/* JD Toggle */}
                        <div className="flex-shrink-0 mx-6 mt-3">
                            <button onClick={() => setShowJD(!showJD)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-all duration-300">
                                <FileText className="w-4 h-4" /> {showJD ? 'Hide' : 'Show'} full JD {showJD ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {showJD && (
                                <div className="mt-2 max-h-[200px] overflow-y-auto custom-scrollbar text-xs text-slate-400 whitespace-pre-line bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">{selectedJob.description}</div>
                            )}
                        </div>

                        {/* Form */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-6">
                            {/* Personal Information */}
                            <FormSection title="Personal Information" icon={User} color="text-indigo-400" filled={fillingStatus === 'complete'}>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="First Name" value={fillingStatus === 'complete' ? userProfile.firstName : ''} icon={User} filled={fillingStatus === 'complete'} />
                                    <FormField label="Last Name" value={fillingStatus === 'complete' ? userProfile.lastName : ''} icon={User} filled={fillingStatus === 'complete'} />
                                    <FormField label="Email" value={fillingStatus === 'complete' ? userProfile.email : ''} icon={Mail} filled={fillingStatus === 'complete'} />
                                    <FormField label="Phone" value={fillingStatus === 'complete' ? userProfile.phone : ''} icon={Phone} filled={fillingStatus === 'complete'} />
                                    <FormField label="Location" value={fillingStatus === 'complete' ? userProfile.location : ''} icon={MapPin} filled={fillingStatus === 'complete'} />
                                    <FormField label="LinkedIn" value={fillingStatus === 'complete' ? userProfile.linkedin : ''} icon={Linkedin} filled={fillingStatus === 'complete'} />
                                </div>
                            </FormSection>

                            {/* Professional Links */}
                            <FormSection title="Professional Links" icon={Link2} color="text-purple-400" filled={fillingStatus === 'complete'}>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="GitHub" value={fillingStatus === 'complete' ? userProfile.github : ''} icon={Github} filled={fillingStatus === 'complete'} />
                                    <FormField label="Portfolio" value={fillingStatus === 'complete' ? userProfile.portfolio : ''} icon={Globe} filled={fillingStatus === 'complete'} />
                                </div>
                            </FormSection>

                            {/* Experience */}
                            <FormSection title="Experience" icon={Briefcase} color="text-amber-400" filled={fillingStatus === 'complete'}>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField label="Current Title" value={fillingStatus === 'complete' ? userProfile.currentTitle : ''} filled={fillingStatus === 'complete'} />
                                    <FormField label="Company" value={fillingStatus === 'complete' ? userProfile.currentCompany : ''} icon={Building2} filled={fillingStatus === 'complete'} />
                                    <FormField label="Years of Experience" value={fillingStatus === 'complete' ? userProfile.yearsExperience : ''} filled={fillingStatus === 'complete'} />
                                    <FormField label="Salary Expectation" value={fillingStatus === 'complete' ? userProfile.salaryExpectation : ''} filled={fillingStatus === 'complete'} />
                                </div>
                            </FormSection>

                            {/* Education */}
                            <FormSection title="Education" icon={GraduationCap} color="text-teal-400" filled={fillingStatus === 'complete'}>
                                <div className="space-y-3">
                                    <FormField label="Degree" value={fillingStatus === 'complete' ? userProfile.education.degree : ''} icon={GraduationCap} filled={fillingStatus === 'complete'} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormField label="University" value={fillingStatus === 'complete' ? userProfile.education.school : ''} filled={fillingStatus === 'complete'} />
                                        <FormField label="Graduation Year" value={fillingStatus === 'complete' ? userProfile.education.year : ''} filled={fillingStatus === 'complete'} />
                                    </div>
                                </div>
                            </FormSection>

                            {/* Documents */}
                            <FormSection title="Documents" icon={FileText} color="text-rose-400" filled={fillingStatus === 'complete'}>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-xl border-2 border-dashed border-slate-700/50 text-center">
                                        <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                                        <p className="text-xs text-slate-400">Resume</p>
                                        {fillingStatus === 'complete' && <p className="text-xs text-teal-400 mt-1">✓ resume_john_doe.pdf</p>}
                                    </div>
                                    <div className={`p-4 rounded-xl border transition-all duration-300 ${fillingStatus === 'complete' ? 'border-teal-500/30 bg-teal-500/5' : 'border-dashed border-slate-700/50'} text-center`}>
                                        <Bot className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                                        <p className="text-xs text-slate-400">Cover Letter</p>
                                        {fillingStatus === 'complete' && <p className="text-xs text-teal-400 mt-1">✓ AI-Generated</p>}
                                    </div>
                                </div>
                            </FormSection>

                            {/* Professional Summary */}
                            <FormSection title="Professional Summary" icon={Bot} color="text-indigo-400" filled={fillingStatus === 'complete'}>
                                <div>
                                    {fillingStatus === 'complete' && <span className="inline-block text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 mb-2">AI-Tailored</span>}
                                    <div className={`p-4 rounded-xl border transition-all duration-300 min-h-[80px] text-sm ${fillingStatus === 'complete' ? 'bg-teal-500/5 border-teal-500/30 text-slate-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-600'}`}>
                                        {fillingStatus === 'complete' ? userProfile.summary : '...'}
                                    </div>
                                </div>
                            </FormSection>

                            {/* Additional Questions */}
                            <FormSection title="Additional Questions" icon={AlertCircle} color="text-amber-400" filled={fillingStatus === 'complete'}>
                                <div className="space-y-3">
                                    <FormField label="Work Authorization" value={fillingStatus === 'complete' ? userProfile.workAuth : ''} filled={fillingStatus === 'complete'} />
                                    <FormField label="Willing to Relocate" value={fillingStatus === 'complete' ? (userProfile.willingToRelocate ? 'Yes' : 'No') : ''} filled={fillingStatus === 'complete'} />
                                    <FormField label="Preferred Locations" value={fillingStatus === 'complete' ? userProfile.preferredLocations.join(', ') : ''} icon={MapPin} filled={fillingStatus === 'complete'} />
                                </div>
                            </FormSection>
                        </div>

                        {/* Submit */}
                        <div className="flex-shrink-0 p-6 border-t border-slate-800/50 flex items-center gap-4">
                            <button onClick={(e) => toggleJobSelection(selectedJob.id, e)} className={`flex-1 py-3 rounded-xl font-medium transition-all duration-300 ${selectedJobs[selectedJob.id] ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/20'}`}>
                                {selectedJobs[selectedJob.id] ? '✓ Added to Queue' : 'Add to Apply Queue'}
                            </button>
                            <button className="px-6 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-slate-400 font-medium hover:bg-slate-700/50 transition-all duration-300">
                                Edit Fields
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center flex-1 text-center px-8">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
                            <Briefcase className="w-8 h-8 text-slate-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-400 mb-2">Select a Role</h3>
                        <p className="text-sm text-slate-600">Click on a job listing to preview the auto-filled application form.</p>
                    </div>
                ))}
            </div>
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
