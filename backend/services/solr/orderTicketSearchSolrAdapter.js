import { logger, parsePaginationParams } from '../../utils/misc.js';
import { escapeSolrPhrase, escapeSolrTerm, isSolrSearchEnabled, querySolr } from './solrClient.js';

const ORDER_STATUS_MAP = {
    placed: 'Placed',
    assigned: 'Assigned',
    scheduled: 'Scheduled',
    started: 'Started',
    in_transit: 'In Transit',
    'in transit': 'In Transit',
    intransit: 'In Transit',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

const normalizeOrderStatus = (status) => {
    const raw = String(status || '').trim();
    if (!raw || raw.toLowerCase() === 'all') return '';
    const normalizedKey = raw.toLowerCase().replace(/\s+/g, ' ');
    return ORDER_STATUS_MAP[normalizedKey] || raw;
};

const toPaginationPayload = ({ page, limit, total }) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
});

const fetchAllIds = async ({ q, qf, fq, fl, sort, key }) => {
    const rows = 500;
    let start = 0;
    let total = null;
    const ids = [];

    while (total === null || start < total) {
        const result = await querySolr({
            defType: 'edismax',
            q,
            qf,
            fq,
            fl,
            sort,
            start,
            rows,
        });

        const docs = result?.response?.docs || [];
        const pageIds = docs.map((doc) => doc[key]).filter(Boolean);
        ids.push(...pageIds);

        if (total === null) {
            total = Number(result?.response?.numFound || 0);
        }

        if (docs.length === 0) break;
        start += rows;
    }

    return ids;
};

const searchOrderIdsForRole = async ({
    ownerField,
    ownerId,
    search,
    status,
    page,
    limit,
    qf,
} = {}) => {
    const term = String(search || '').trim();
    if (!term || !isSolrSearchEnabled() || !ownerId) return null;

    const normalizedStatus = normalizeOrderStatus(status);
    const filters = [
        'doc_type_s:order',
        `${ownerField}:"${escapeSolrPhrase(ownerId)}"`,
    ];
    if (normalizedStatus) {
        filters.push(`status_s:"${escapeSolrPhrase(normalizedStatus)}"`);
    }

    const escapedTerm = escapeSolrTerm(term);
    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 20, maxLimit: 100 });

    try {
        if (pagination) {
            const result = await querySolr({
                defType: 'edismax',
                q: escapedTerm,
                qf,
                fq: filters,
                fl: 'order_id_s',
                sort: 'createdAt_dt desc',
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
        }

        const ids = await fetchAllIds({
            q: escapedTerm,
            qf,
            fq: filters,
            fl: 'order_id_s',
            sort: 'createdAt_dt desc',
            key: 'order_id_s',
        });

        return { ids, pagination: null };
    } catch (error) {
        logger.warn('Solr role order search failed. Falling back to Mongo search.', { error: error.message });
        return null;
    }
};

export const searchCustomerOrderIdsViaSolr = async ({ customerId, search, status, page, limit } = {}) => {
    return searchOrderIdsForRole({
        ownerField: 'customer_id_s',
        ownerId: String(customerId || ''),
        search,
        status,
        page,
        limit,
        qf: 'search_text_t order_id_text_t pickup_city_t pickup_state_t delivery_city_t delivery_state_t transporter_name_t transporter_email_t',
    });
};

export const searchTransporterOrderIdsViaSolr = async ({ transporterId, search, status, page, limit } = {}) => {
    return searchOrderIdsForRole({
        ownerField: 'transporter_id_s',
        ownerId: String(transporterId || ''),
        search,
        status,
        page,
        limit,
        qf: 'search_text_t order_id_text_t pickup_city_t pickup_state_t delivery_city_t delivery_state_t customer_name_t customer_email_t',
    });
};

export const searchAdminTicketIdsViaSolr = async ({
    search,
    status,
    priority,
    category,
    userRole,
    page,
    limit,
} = {}) => {
    const term = String(search || '').trim();
    if (!term || !isSolrSearchEnabled()) return null;

    const filters = ['doc_type_s:ticket'];
    if (status) filters.push(`status_s:"${escapeSolrPhrase(status)}"`);
    if (priority) filters.push(`priority_s:"${escapeSolrPhrase(priority)}"`);
    if (category) filters.push(`category_s:"${escapeSolrPhrase(category)}"`);
    if (userRole) filters.push(`user_role_s:"${escapeSolrPhrase(userRole)}"`);

    const escapedTerm = escapeSolrTerm(term);
    const pagination = parsePaginationParams({ page, limit }, { defaultLimit: 20, maxLimit: 100 });

    try {
        if (pagination) {
            const result = await querySolr({
                defType: 'edismax',
                q: escapedTerm,
                qf: 'search_text_t ticket_id_text_t ticket_number_t subject_t user_name_t user_email_t category_t',
                fq: filters,
                fl: 'ticket_id_s',
                sort: 'createdAt_dt desc',
                start: pagination.skip,
                rows: pagination.limit,
            });

            const docs = result?.response?.docs || [];
            const ids = docs.map((doc) => doc.ticket_id_s).filter(Boolean);
            const total = Number(result?.response?.numFound || 0);

            return {
                ids,
                pagination: toPaginationPayload({
                    page: pagination.page,
                    limit: pagination.limit,
                    total,
                }),
            };
        }

        const ids = await fetchAllIds({
            q: escapedTerm,
            qf: 'search_text_t ticket_id_text_t ticket_number_t subject_t user_name_t user_email_t category_t',
            fq: filters,
            fl: 'ticket_id_s',
            sort: 'createdAt_dt desc',
            key: 'ticket_id_s',
        });

        return { ids, pagination: null };
    } catch (error) {
        logger.warn('Solr ticket search failed. Falling back to Mongo search.', { error: error.message });
        return null;
    }
};
