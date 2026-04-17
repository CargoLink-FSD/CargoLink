#!/usr/bin/env node
import mongoose from 'mongoose';
import { connectDB } from '../core/db.js';
import { MONGO_URI } from '../core/index.js';
import Customer from '../models/customer.js';
import Order from '../models/order.js';
import Ticket from '../models/ticket.js';
import Transporter from '../models/transporter.js';
import { commitSolr, deleteByQuery, isSolrSearchEnabled, pingSolr, updateSolrDocuments } from '../services/solr/solrClient.js';

const BATCH_SIZE = 500;

const toIso = (value) => {
    const parsed = value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
};

const lower = (value) => String(value || '').toLowerCase();

const chunk = (items, size) => {
    const result = [];
    for (let i = 0; i < items.length; i += size) {
        result.push(items.slice(i, i + size));
    }
    return result;
};

const buildUserDocs = ({ customers, transporters }) => {
    const customerDocs = customers.map((item) => {
        const fullName = `${item.firstName || ''} ${item.lastName || ''}`.trim();
        const city = item.addresses?.[0]?.city || '';
        const state = item.addresses?.[0]?.state || '';

        return {
            id: `user_customer_${item._id}`,
            doc_type_s: 'user',
            user_role_s: 'customer',
            user_id_s: String(item._id),
            first_name_t: item.firstName || '',
            last_name_t: item.lastName || '',
            full_name_t: fullName,
            full_name_sort_s: lower(fullName),
            email_t: item.email || '',
            phone_t: item.phone || '',
            city_t: city,
            state_t: state,
            createdAt_dt: toIso(item.createdAt),
            search_text_t: [fullName, item.email, item.phone, city, state].filter(Boolean).join(' '),
        };
    });

    const transporterDocs = transporters.map((item) => {
        const fullName = item.name || '';

        return {
            id: `user_transporter_${item._id}`,
            doc_type_s: 'user',
            user_role_s: 'transporter',
            user_id_s: String(item._id),
            name_t: item.name || '',
            full_name_t: fullName,
            full_name_sort_s: lower(fullName),
            email_t: item.email || '',
            phone_t: item.primary_contact || '',
            city_t: item.city || '',
            state_t: item.state || '',
            createdAt_dt: toIso(item.createdAt),
            search_text_t: [item.name, item.email, item.primary_contact, item.city, item.state].filter(Boolean).join(' '),
        };
    });

    return [...customerDocs, ...transporterDocs];
};

const buildOrderDocs = (orders) => {
    return orders.map((item) => {
        const customerName = item.customer_id
            ? `${item.customer_id.firstName || ''} ${item.customer_id.lastName || ''}`.trim()
            : '';

        return {
            id: `order_${item._id}`,
            doc_type_s: 'order',
            order_id_s: String(item._id),
            order_id_text_t: String(item._id),
            status_s: item.status || '',
            createdAt_dt: toIso(item.createdAt),
            pickup_city_t: item.pickup?.city || '',
            pickup_state_t: item.pickup?.state || '',
            delivery_city_t: item.delivery?.city || '',
            delivery_state_t: item.delivery?.state || '',
            customer_id_s: item.customer_id?._id ? String(item.customer_id._id) : '',
            customer_name_t: customerName,
            customer_name_sort_s: lower(customerName),
            customer_email_t: item.customer_id?.email || '',
            transporter_id_s: item.assigned_transporter_id?._id ? String(item.assigned_transporter_id._id) : '',
            transporter_name_t: item.assigned_transporter_id?.name || '',
            transporter_email_t: item.assigned_transporter_id?.email || '',
            search_text_t: [
                item._id,
                item.pickup?.city,
                item.pickup?.state,
                item.delivery?.city,
                item.delivery?.state,
                customerName,
                item.customer_id?.email,
                item.assigned_transporter_id?.name,
                item.assigned_transporter_id?.email,
            ].filter(Boolean).join(' '),
        };
    });
};

const buildTicketDocs = (tickets) => {
    return tickets.map((item) => {
        const messagesText = Array.isArray(item.messages)
            ? item.messages.map((message) => message?.text).filter(Boolean).join(' ')
            : '';

        return {
            id: `ticket_${item._id}`,
            doc_type_s: 'ticket',
            ticket_id_s: String(item._id),
            ticket_id_text_t: String(item._id),
            ticket_number_t: item.ticketId || '',
            status_s: item.status || '',
            priority_s: item.priority || '',
            category_s: item.category || '',
            category_t: item.category || '',
            user_role_s: item.userRole || '',
            user_name_t: item.userName || '',
            user_email_t: item.userEmail || '',
            subject_t: item.subject || '',
            createdAt_dt: toIso(item.createdAt),
            search_text_t: [
                item._id,
                item.ticketId,
                item.subject,
                item.category,
                item.userName,
                item.userEmail,
                item.userRole,
                messagesText,
            ].filter(Boolean).join(' '),
        };
    });
};

const uploadBatches = async (docs, label) => {
    const groups = chunk(docs, BATCH_SIZE);
    for (let index = 0; index < groups.length; index += 1) {
        const batch = groups[index];
        await updateSolrDocuments({ docs: batch, commit: false });
        console.log(`${label}: indexed batch ${index + 1}/${groups.length} (${batch.length} docs)`);
    }
};

const main = async () => {
    if (!isSolrSearchEnabled()) {
        console.log('SEARCH_PROVIDER is not solr. Skipping reindex.');
        process.exit(0);
    }

    const healthy = await pingSolr();
    if (!healthy) {
        throw new Error('Cannot reach Solr. Start Solr and try again.');
    }

    await connectDB(MONGO_URI);

    try {
        console.log('Loading data from MongoDB...');
        const [customers, transporters, orders, tickets] = await Promise.all([
            Customer.find({}).select('firstName lastName email phone addresses createdAt').lean(),
            Transporter.find({}).select('name email primary_contact city state createdAt').lean(),
            Order.find({})
                .select('pickup delivery status createdAt customer_id assigned_transporter_id')
                .populate('customer_id', 'firstName lastName email')
                .populate('assigned_transporter_id', 'name email')
                .lean(),
            Ticket.find({})
                .select('ticketId status priority category userRole userName userEmail subject messages createdAt')
                .lean(),
        ]);

        console.log(`Loaded ${customers.length} customers, ${transporters.length} transporters, ${orders.length} orders, ${tickets.length} tickets.`);

        await deleteByQuery({ query: 'doc_type_s:user OR doc_type_s:order OR doc_type_s:ticket', commit: false });

        const userDocs = buildUserDocs({ customers, transporters });
        const orderDocs = buildOrderDocs(orders);
        const ticketDocs = buildTicketDocs(tickets);

        await uploadBatches(userDocs, 'Users');
        await uploadBatches(orderDocs, 'Orders');
        await uploadBatches(ticketDocs, 'Tickets');

        await commitSolr();

        console.log('Solr reindex completed successfully.');
    } finally {
        await mongoose.disconnect();
    }
};

main().catch((error) => {
    console.error('Solr reindex failed:', error.message);
    process.exit(1);
});
