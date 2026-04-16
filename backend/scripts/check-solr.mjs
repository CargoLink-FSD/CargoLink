#!/usr/bin/env node
import { SEARCH_PROVIDER, SOLR_CORE, SOLR_URL } from '../core/index.js';
import { isSolrSearchEnabled, pingSolr } from '../services/solr/solrClient.js';

const main = async () => {
    console.log(`SEARCH_PROVIDER=${SEARCH_PROVIDER}`);
    console.log(`SOLR_URL=${SOLR_URL}`);
    console.log(`SOLR_CORE=${SOLR_CORE}`);

    if (!isSolrSearchEnabled()) {
        console.log('Search provider is not solr. Service check skipped.');
        process.exit(0);
    }

    const healthy = await pingSolr();
    if (!healthy) {
        console.error('Solr health check failed. Ensure Solr container is running.');
        process.exit(1);
    }

    console.log('Solr is reachable and responding.');
};

main().catch((error) => {
    console.error('Solr health check failed:', error.message);
    process.exit(1);
});
