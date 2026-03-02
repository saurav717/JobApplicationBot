const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

/**
 * Manually trigger a job scrape.
 */
export async function triggerScrape() {
    const res = await fetch(`${BASE_URL}/api/scraper/run`, { method: 'POST' });
    if (!res.ok) throw new Error(`Scrape trigger failed: ${res.status}`);
    return res.json();
}

/**
 * Get scraper status.
 */
export async function getScraperStatus() {
    const res = await fetch(`${BASE_URL}/api/scraper/status`);
    if (!res.ok) throw new Error(`Status failed: ${res.status}`);
    return res.json();
}
