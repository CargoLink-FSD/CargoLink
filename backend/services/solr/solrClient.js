import { SEARCH_PROVIDER, SOLR_CORE, SOLR_TIMEOUT_MS, SOLR_URL } from '../../core/index.js';

const normalizedSolrUrl = (SOLR_URL || '').replace(/\/+$/, '');
const coreBaseUrl = `${normalizedSolrUrl}/${SOLR_CORE}`;

const toSearchParams = (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (Array.isArray(value)) {
            value.forEach((entry) => {
                if (entry !== undefined && entry !== null && entry !== '') {
                    searchParams.append(key, String(entry));
                }
            });
            return;
        }
        searchParams.set(key, String(value));
    });
    return searchParams;
};

const requestSolr = async ({ path, method = 'GET', params, body, timeoutMs = SOLR_TIMEOUT_MS }) => {
    const query = toSearchParams(params).toString();
    const url = `${coreBaseUrl}${path}${query ? `?${query}` : ''}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });

        const text = await response.text();
        let payload = null;
        try {
            payload = text ? JSON.parse(text) : null;
        } catch {
            payload = { raw: text };
        }

        if (!response.ok) {
            const message = payload?.error?.msg || payload?.raw || `Solr request failed (${response.status})`;
            throw new Error(message);
        }

        return payload;
    } finally {
        clearTimeout(timer);
    }
};

export const isSolrSearchEnabled = () => String(SEARCH_PROVIDER || '').toLowerCase() === 'solr';

export const escapeSolrTerm = (value = '') => {
    const stringValue = String(value || '').trim();
    if (!stringValue) return '';
    return stringValue.replace(/([+\-!(){}\[\]^"~*?:\\/])/g, '\\$1').replace(/&&/g, '\\&&').replace(/\|\|/g, '\\||');
};

export const escapeSolrPhrase = (value = '') => {
    return String(value || '').replace(/(["\\])/g, '\\$1');
};

export const querySolr = async (params = {}) => {
    return requestSolr({
        path: '/select',
        method: 'GET',
        params: {
            wt: 'json',
            ...params,
        },
    });
};

export const updateSolrDocuments = async ({ docs, commit = false } = {}) => {
    if (!Array.isArray(docs) || docs.length === 0) return null;

    return requestSolr({
        path: '/update',
        method: 'POST',
        params: {
            commit: commit ? 'true' : 'false',
            wt: 'json',
        },
        body: docs,
    });
};

export const deleteByQuery = async ({ query, commit = false } = {}) => {
    if (!query) return null;

    return requestSolr({
        path: '/update',
        method: 'POST',
        params: {
            commit: commit ? 'true' : 'false',
            wt: 'json',
        },
        body: {
            delete: { query },
        },
    });
};

export const commitSolr = async () => {
    return requestSolr({
        path: '/update',
        method: 'POST',
        params: {
            commit: 'true',
            wt: 'json',
        },
        body: { commit: {} },
    });
};

export const pingSolr = async () => {
    try {
        await querySolr({ q: '*:*', rows: 0 });
        return true;
    } catch {
        return false;
    }
};
