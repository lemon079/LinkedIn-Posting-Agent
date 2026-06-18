export const KAFKA_EXAMPLE = `Kafka consumer group rebalances will absolutely tank your system throughput if you don't watch max.poll.interval.ms.

We recently hit this in production ⚙️ when consuming batches of message data. One of our downstream database transactions slowed down ⏳, causing the poll loop to exceed the configured timeout of 300 seconds.

The coordinator marked the consumer dead, triggered a rebalance, and the rest of the consumers got stuck in a stop-the-world loop trying to re-assign partitions. 

The fix wasn't just to bump max.poll.interval.ms to some arbitrary number. We had to tune max.poll.records down to 50 so each batch could complete under the timeout, even during database lag.

Always verify your processing time under worst-case network latency. 

How do you handle consumer group timeout limits under peak load?

#kafka #distributed-systems #backend`;

export const POSTGRES_EXAMPLE = `Postgres MVCC bloat is a silent killer of index performance. ⚙️

We had a table handling millions of updates daily. Even though the row count remained constant, queries started dragging because of dead tuples. Every update in Postgres writes a new version of the row, leaving the old one behind as dead space.

Autovacuum was running, but it couldn't keep up with our aggressive update rate. The table was bloated, causing index scans to fetch pages that only contained dead rows.

We tuned autovacuum_vacuum_scale_factor down to 0.05 and autovacuum_vacuum_cost_limit up to 1000. This made vacuuming kick in much earlier and run faster, keeping dead tuple counts under control. ⏳

Never assume default autovacuum settings are safe for high-write databases.

Have you ever had to run a manual VACUUM FULL on a production table?

#postgres #database #backend`;

export const REACT_EXAMPLE = `React Suspense can inadvertently introduce nested network waterfalls if you aren't careful. ⚙️

I saw a frontend team wrap three separate data-fetching components in nested Suspense boundaries. Because each component waited to render until its own API call finished, the requests executed sequentially instead of in parallel.

The user had to wait for the header, then the sidebar, and finally the feed, doubling the perceived page load time.

Instead of nested Suspense, we initiated all fetch requests at the parent route level in parallel before rendering the children, or wrapped them in a single Suspense boundary. ⏳

Always inspect the network waterfall graph in Chrome DevTools to make sure your fetches aren't waiting on each other.

How do you coordinate API fetches across deep React component trees?

#reactjs #frontend #webdev`;
