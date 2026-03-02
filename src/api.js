const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Auth token helpers ─────────────────────────────────────────────────────

export function getStoredToken() {
    return localStorage.getItem('applybot_token');
}

export function setStoredToken(token) {
    localStorage.setItem('applybot_token', token);
}

export function clearStoredToken() {
    localStorage.removeItem('applybot_token');
    localStorage.removeItem('applybot_user');
}

export function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('applybot_user') || 'null');
    } catch {
        return null;
    }
}

function _authHeaders(token) {
    const t = token || getStoredToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── User Auth ──────────────────────────────────────────────────────────────

/**
 * Register a new user. Returns { access_token, user }
 */
export async function registerUser(name, email, password) {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Registration failed: ${res.status}`);
    }
    const data = await res.json();
    setStoredToken(data.access_token);
    localStorage.setItem('applybot_user', JSON.stringify(data.user));
    return data;
}

/**
 * Login an existing user. Returns { access_token, user }
 */
export async function loginUser(email, password) {
    const form = new URLSearchParams({ username: email, password });
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form.toString(),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Login failed: ${res.status}`);
    }
    const data = await res.json();
    setStoredToken(data.access_token);
    localStorage.setItem('applybot_user', JSON.stringify(data.user));
    return data;
}

/**
 * Store encrypted credentials for a job platform.
 */
export async function storePlatformCredential(platform, email, password, workdayUrl, companyName, token) {
    const res = await fetch(`${BASE_URL}/api/auth/credentials/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ..._authHeaders(token) },
        body: JSON.stringify({
            platform,
            email,
            password,
            workday_url: workdayUrl || null,
            company_name: companyName || null,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Credential store failed: ${res.status}`);
    }
}

/**
 * Test connectivity for a platform credential.
 */
export async function testPlatformConnection(platform, email, password, workdayUrl, token) {
    const res = await fetch(`${BASE_URL}/api/auth/credentials/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ..._authHeaders(token) },
        body: JSON.stringify({
            platform,
            email,
            password,
            workday_url: workdayUrl || null,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Connection test failed: ${res.status}`);
    }
    return res.json();
}

/**
 * Get credential status (which platforms are connected).
 */
export async function getCredentialStatus(token) {
    const res = await fetch(`${BASE_URL}/api/auth/credentials/status`, {
        headers: _authHeaders(token),
    });
    if (!res.ok) throw new Error(`Credential status failed: ${res.status}`);
    return res.json();
}

/**
 * Delete stored credentials for a platform.
 */
export async function deletePlatformCredential(platform, workdayUrl, token) {
    const url = new URL(`${BASE_URL}/api/auth/credentials/${platform}`);
    if (workdayUrl) url.searchParams.set('workday_url', workdayUrl);
    const res = await fetch(url.toString(), {
        method: 'DELETE',
        headers: _authHeaders(token),
    });
    if (!res.ok) throw new Error(`Delete credential failed: ${res.status}`);
}

// ── Resume ─────────────────────────────────────────────────────────────────

/**
 * Upload a PDF resume. Returns { id, name, email, skills, ... }
 */
export async function uploadResume(file) {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE_URL}/api/resumes/upload`, {
        method: 'POST',
        body: form,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed: ${res.status}`);
    }
    return res.json();
}

// ── Jobs ───────────────────────────────────────────────────────────────────

/**
 * Search jobs for a resume. Returns SearchResponse { jobs: JobWithScore[], total, resume_id }
 */
export async function searchJobs(resumeId, { limit = 50, useLlmRerank = false, filters = null } = {}) {
    const body = { resume_id: resumeId, limit, use_llm_rerank: useLlmRerank };
    if (filters) body.filters = filters;
    const res = await fetch(`${BASE_URL}/api/jobs/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Search failed: ${res.status}`);
    return res.json();
}

/**
 * Search jobs grouped by company.
 */
export async function searchJobsGrouped(resumeId, { limit = 100, useLlmRerank = false } = {}) {
    const body = { resume_id: resumeId, limit, use_llm_rerank: useLlmRerank };
    const res = await fetch(`${BASE_URL}/api/jobs/search/grouped`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Grouped search failed: ${res.status}`);
    return res.json();
}

/**
 * Generate a filled application form.
 */
export async function generateForm(jobId, resumeId, customInstructions = null) {
    const res = await fetch(`${BASE_URL}/api/applications/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            job_id: jobId,
            resume_id: resumeId,
            custom_instructions: customInstructions,
        }),
    });
    if (!res.ok) throw new Error(`Form generation failed: ${res.status}`);
    return res.json();
}

// ── Scraper ────────────────────────────────────────────────────────────────

/**
 * Manually trigger a generic job scrape.
 */
export async function triggerScrape() {
    const res = await fetch(`${BASE_URL}/api/scraper/run`, { method: 'POST' });
    if (!res.ok) throw new Error(`Scrape trigger failed: ${res.status}`);
    return res.json();
}

/**
 * Trigger a resume-targeted job scrape using the candidate's search profile.
 */
export async function triggerResumeTargetedScrape(resumeId) {
    const res = await fetch(`${BASE_URL}/api/scraper/run-for-resume/${resumeId}`, { method: 'POST' });
    if (!res.ok) throw new Error(`Targeted scrape failed: ${res.status}`);
    return res.json();
}

/**
 * Trigger a multi-platform scrape (requires auth token).
 */
export async function triggerMultiPlatformScrape(options, token) {
    const res = await fetch(`${BASE_URL}/api/scraper/run/multi-platform`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ..._authHeaders(token) },
        body: JSON.stringify(options || {}),
    });
    if (!res.ok) throw new Error(`Multi-platform scrape failed: ${res.status}`);
    return res.json();
}

/**
 * Get scraper status (legacy — no auth required).
 */
export async function getScraperStatus() {
    const res = await fetch(`${BASE_URL}/api/scraper/status`);
    if (!res.ok) throw new Error(`Status failed: ${res.status}`);
    return res.json();
}

/**
 * Get per-user multi-platform scrape status (requires auth).
 */
export async function getUserScrapeStatus(userId, token) {
    const res = await fetch(`${BASE_URL}/api/scraper/status/${userId}`, {
        headers: _authHeaders(token),
    });
    if (!res.ok) throw new Error(`User scrape status failed: ${res.status}`);
    return res.json();
}

/**
 * Get connected platforms for the current user.
 */
export async function getPlatformStatus(token) {
    const res = await fetch(`${BASE_URL}/api/scraper/platforms`, {
        headers: _authHeaders(token),
    });
    if (!res.ok) throw new Error(`Platform status failed: ${res.status}`);
    return res.json();
}

/**
 * List all known top tech companies available for public Workday scraping.
 */
export async function getTopCompanies() {
    const res = await fetch(`${BASE_URL}/api/scraper/top-companies`);
    if (!res.ok) throw new Error('Failed to fetch companies');
    return res.json();
}

/**
 * Trigger a background scrape of 50+ top tech companies via their public Workday portals.
 */
export async function scrapeTopCompanies(keywords = [], companies = null, limitPerCompany = 10) {
    const res = await fetch(`${BASE_URL}/api/scraper/scrape-top-companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            keywords: keywords.length > 0 ? keywords : ['software engineer', 'data scientist'],
            limit_per_company: limitPerCompany,
            companies,
        }),
    });
    if (!res.ok) throw new Error('Failed to trigger top-companies scrape');
    return res.json();
}
