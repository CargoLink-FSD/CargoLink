import { logger, parsePaginationParams } from '../../utils/misc.js';
import { escapeSolrPhrase, escapeSolrTerm, isSolrSearchEnabled, querySolr } from './solrClient.js';

const normalizeDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
};

const resolveSort = (sortBy, mapping, fallback = 'createdAt_dt desc') => {
    if (!sortBy) return fallback;
    return mapping[sortBy] || fallback;
};

const toPaginationPayload = ({ page, limit, total }) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
});

export const searchAdminOrderIdsViaSolr = async ({
    search,
    status,
    fromDate,
    toDate,
    sort,
    page,
    limit,
} = {}) => {
    const term = String(search || '').trim();
    if (!term || !isSolrSearchEnabled()) return null;

    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 20, maxLimit: 100 }) || {
        page: 1,
        limit: 20,
        skip: 0,
    };

    const escapedStatus = escapeSolrPhrase(status);
    const from = normalizeDate(fromDate);
    const to = normalizeDate(toDate);

    const filters = ['doc_type_s:order'];
    if (status) filters.push(`status_s:"${escapedStatus}"`);
    if (from || to) filters.push(`createdAt_dt:[${from || '*'} TO ${to || '*'}]`);

    try {
        const result = await querySolr({
            defType: 'edismax',
            q: escapeSolrTerm(term),
            qf: 'search_text_t order_id_text_t pickup_city_t pickup_state_t delivery_city_t delivery_state_t customer_name_t customer_email_t transporter_name_t transporter_email_t',
            fq: filters,
            fl: 'order_id_s',
            sort: resolveSort(sort, {
                date: 'createdAt_dt desc',
                status: 'status_s asc,createdAt_dt desc',
                customer: 'customer_name_sort_s asc,createdAt_dt desc',
            }),
            start: pagination.skip,
            rows: pagination.limit,
        });

        const docs = result?.response?.docs || [];
        const ids = docs.map((doc) => doc.order_id_s).filter(Boolean);
        const total = Number(result?.response?.numFound || 0);

        return {
            ids,
            pagination: toPaginationPayload({
                page: pagination.page,
                limit: pagination.limit,
                total,
            }),
        };
    } catch (error) {
        logger.warn('Solr order search failed. Falling back to Mongo search.', { error: error.message });
        return null;
    }
};

export const searchAdminUserIdsViaSolr = async ({ role, search, sort, page, limit } = {}) => {
    const normalizedRole = String(role || '').toLowerCase();
    const term = String(search || '').trim();
    if (!term || !isSolrSearchEnabled()) return null;
    if (!['customer', 'transporter'].includes(normalizedRole)) return null;

    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 20, maxLimit: 100 }) || {
        page: 1,
        limit: 20,
        skip: 0,
    };

    const roleFilter = `user_role_s:"${escapeSolrPhrase(normalizedRole)}"`;
    const qf = normalizedRole === 'customer'
        ? 'search_text_t first_name_t last_name_t full_name_t email_t user_id_s'
        : 'search_text_t name_t full_name_t email_t user_id_s';

    try {
        const result = await querySolr({
            defType: 'edismax',
            q: escapeSolrTerm(term),
            qf,
            fq: ['doc_type_s:user', roleFilter],
            fl: 'user_id_s',
            sort: resolveSort(sort, {
                date: 'createdAt_dt desc',
                name: 'full_name_sort_s asc,createdAt_dt desc',
                id: 'user_id_s asc',
            }),
            start: pagination.skip,
            rows: pagination.limit,
        });

        const docs = result?.response?.docs || [];
        const ids = docs.map((doc) => doc.user_id_s).filter(Boolean);
        const total = Number(result?.response?.numFound || 0);

        return {
            ids,
            pagination: toPaginationPayload({
                page: pagination.page,
                limit: pagination.limit,
                total,
            }),
        };
    } catch (error) {
        logger.warn('Solr user search failed. Falling back to Mongo search.', { error: error.message });
        return null;
    }
};
