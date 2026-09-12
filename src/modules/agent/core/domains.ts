export interface DomainConfig {
  id: string;
  label: string;
  specificityDescription: string;
  groundingDescription: string;
  examples: string[];
}

export const ENGINEERING_DOMAIN: DomainConfig = {
  id: "engineering",
  label: "Engineering & CS",
  specificityDescription:
    "A concrete technology, tool, protocol, pattern, algorithm, or CS concept (e.g. Kafka consumer groups, Postgres MVCC, React Suspense, B-trees, CAP theorem, dynamic programming, mTLS).",
  groundingDescription:
    "Search for a recent incident, RFC update, benchmark result, changelog entry, seminal paper, or research finding related to it. Anchor the post to something real: a version number, a config name, a CVE ID, a complexity class, a paper title, or a specific error message.",
  examples: [
    `Kafka consumer group rebalances will tank system throughput if max.poll.interval.ms is left unmonitored. ⚙️\n\nA common issue occurs when consuming batches of message data alongside database writes. When a downstream transaction slows down, consumer poll loops easily exceed the default 300-second threshold.\n\nOnce marked dead by the group coordinator, a rebalance triggers, causing cascading stop-the-world partition reassignments across all remaining consumers.\n\nThe standard fix is tuning max.poll.records down to a deterministic batch size (e.g. 50) so processing reliably completes within the poll budget, even during peak latency spikes. ⏳\n\nAlways calibrate poll interval timeouts against worst-case database latency.\n\nHow do you prevent consumer group rebalance storms in high-throughput clusters?\n\n#kafka #distributedsystems #backend`,
    `Postgres MVCC bloat is a silent killer of index performance on high-write workloads. ⚙️\n\nOn tables processing millions of updates daily, dead tuples accumulate rapidly. Because PostgreSQL writes a new version of the row for every UPDATE, old row versions remain on disk until vacuumed.\n\nWhen autovacuum runs too conservatively, bloated index scans are forced to read disk pages containing mostly dead rows, degrading query latency.\n\nTuning autovacuum_vacuum_scale_factor down (e.g. to 0.05) and autovacuum_vacuum_cost_limit up (e.g. to 1000) forces vacuuming to initiate earlier and run faster, stabilizing page density. ⏳\n\nDefault autovacuum configurations are rarely adequate for write-heavy OLTP databases.\n\nWhat autovacuum tuning strategies have delivered the highest latency reduction in your database clusters?\n\n#postgres #database #systemdesign`,
    `React Suspense can inadvertently introduce nested network waterfalls if data boundaries are isolated improperly. ⚙️\n\nWhen multiple sibling components each wrap their own independent data fetches inside nested Suspense boundaries, requests execute sequentially rather than concurrently.\n\nThis serial execution doubles or triples perceived page load times as users wait for headers, sidebars, and feeds in separate phases.\n\nThe recommended architecture is initiating data fetches in parallel at the parent route level or consolidating related components under a shared boundary. ⏳\n\nInspecting the DevTools network waterfall graph quickly surfaces unintended request chaining.\n\nHow does your frontend architecture coordinate concurrent data dependencies across deep component trees?\n\n#reactjs #frontend #webperf`,
    `Most developers use hash maps daily without considering what happens when the load factor crosses 0.75. 🧠\n\nHere is the underlying mechanic inside a standard Java HashMap when that threshold is reached:\n\n1. The internal array doubles in size (e.g. from 16 to 32 buckets).\n2. Every existing entry is rehashed against the new array length.\n3. In modern JVMs, bucket linked lists convert to balanced red-black trees once bucket collisions exceed 8 nodes.\n\nThis rehash is an O(n) operation executed synchronously on the allocating thread, which can trigger unexpected latency spikes in tight, high-volume processing loops. ⏳\n\nThe architectural fix is explicit pre-sizing: new HashMap<>(expectedSize / 0.75 + 1).\n\nUnderstanding low-level data structure mechanics prevents unexpected performance degradation at scale.\n\nWhat foundational data structure detail has surprised you most in production systems?\n\n#computerscience #datastructures #performance`,
    `The CAP theorem is frequently misunderstood in distributed systems design. 🧠\n\nBrewer's conjecture and Gilbert & Lynch's formal proof state that a distributed system can provide at most two of three guarantees: Consistency, Availability, and Partition tolerance.\n\nHowever, partition tolerance is not optional on physical networks. Partitions will occur. The genuine architectural decision is always between Consistency (C) and Availability (A) during network splits.\n\nSystems choosing CP (like MongoDB primary elections) reject writes on isolated partitions to ensure linearizability.\nSystems choosing AP (like Cassandra) accept writes everywhere and resolve conflicts asynchronously.\n\nThe question is whether a business domain tolerates stale reads or write rejections.\n\nHow do you articulate CAP tradeoffs when designing distributed storage architectures?\n\n#distributedsystems #systemdesign #softwarearchitecture`,
  ],
};

export const HR_DOMAIN: DomainConfig = {
  id: "hr",
  label: "HR / People",
  specificityDescription:
    "A real hiring process, interview practice, or workplace decision, named concretely rather than described abstractly.",
  groundingDescription:
    "Search for a recent labor law/policy change or a named survey/report to ground the insight.",
  examples: [
    `A common blind spot in hiring rubrics is evaluating formal authority rather than measurable organizational impact. 📉\n\nCandidates frequently drive significant cross-functional initiatives — such as rebuilding team onboarding systems, reducing ramp times by 40%, and mentoring junior engineers — without holding explicit management titles.\n\nWhen assessment frameworks rely strictly on title hierarchy, high-impact contributors are easily filtered out prematurely.\n\nCalibrating rubrics around concrete outcomes and team velocity improvements ensures high-signal evaluation across all candidate tiers. 💡\n\nWhat high-signal interview criteria does your hiring team prioritize over traditional pedigree?\n\n#hiring #humanresources #talentacquisition`,
    `Unstructured onboarding processes dramatically extend employee ramp time across technical organizations. ⚙️\n\nResearch consistently shows that early productivity hinges on clear 30-60-90 milestone definitions and structured domain shadowing, rather than passive documentation dumps.\n\nOrganizations that establish dedicated peer onboarding mentors reduce time-to-first-commit by upwards of 35%.\n\nSystematizing the initial 90 days transforms ramp speed into a predictable, repeatable process. 💡\n\nHow does your organization measure and optimize new hire ramp velocity?\n\n#onboarding #peopleops #management`,
  ],
};

export const SALES_DOMAIN: DomainConfig = {
  id: "sales",
  label: "Sales",
  specificityDescription:
    "A real objection pattern, deal scenario, or named framework (e.g. MEDDIC, Challenger).",
  groundingDescription:
    "Search for a named framework or benchmark stat related to sales performance or closing rates.",
  examples: [
    `A frequent failure mode in enterprise sales cycles is over-answering straightforward prospect questions. 📉\n\nWhen prospects inquire about specific implementation timelines or technical constraints, nervous reps often pivot into lengthy product comparisons or unprompted feature pitches.\n\nThis introduces unvetted friction points into the evaluation process and diverts attention away from core business justification.\n\nThe most disciplined closers answer the literal question concisely in one sentence, and allow the buyer to guide the next requirement. 🛑\n\nIn high-stakes enterprise sales, concise clarity always outperforms conversational over-explaining.\n\nWhat objection-handling technique has most effectively improved your team's win rates?\n\n#sales #enterprise #meddic`,
    `Single-threaded enterprise deals present severe closing risks when unexpected leadership changes occur. ⚙️\n\nAccording to enterprise sales benchmarks, deals involving four or more engaged stakeholders close at twice the rate of single-contact opportunities.\n\nApplying structured MEDDIC qualification to identify both the Economic Buyer and Technical Champion early prevents late-stage pipeline stalls.\n\nBuilding multi-threaded consensus across finance, security, and operations is the foundation of predictable enterprise revenue. 💡\n\nHow early in your sales cycle do you mandate multi-threading across prospect accounts?\n\n#b2bsales #dealstrategy #salestips`,
  ],
};

export const GENERAL_DOMAIN: DomainConfig = {
  id: "general",
  label: "General / Career",
  specificityDescription:
    "A concrete career concept, operational principle, or industry observation.",
  groundingDescription:
    "Ground the post in clear, practical principles and industry observations rather than personal anecdotes.",
  examples: [
    `Career progression in technical leadership is rarely a straight vertical climb. 🧠\n\nSenior practitioners often face pressure to transition into people management roles, even when their primary leverage lies in deep technical architecture and system design.\n\nOrganizations with mature dual-track engineering ladders (Principal/Staff IC tracks alongside Director/VP management tracks) retain top technical talent far more effectively.\n\nTrue organizational leverage comes from aligning contributor strengths with domain scope, rather than forcing management transitions. 💡\n\nHow does your organization structure parallel career growth for individual contributors versus managers?\n\n#leadership #engineeringmanagement #careergrowth`,
  ],
};

export const MARKETING_DOMAIN: DomainConfig = {
  id: "marketing",
  label: "Marketing",
  specificityDescription:
    "A specific campaign structure, conversion funnel, or ad strategy detail.",
  groundingDescription:
    "Search for a named benchmark stat, recent platform algorithm update, or industry conversion metric.",
  examples: [
    `A common inefficiency in B2B demand generation is over-allocating budget to top-of-funnel volume rather than high-intent pipeline velocity. 📉\n\nHigh MQL counts often mask poor down-funnel conversion rates when lead qualification criteria fail to filter for true buying intent.\n\nShifting attribution models toward account-based engagement and product-qualified signals typically produces a 25-30% increase in sales acceptance rates.\n\nRevenue efficiency improves when marketing metrics align directly with qualified pipeline creation rather than raw top-of-funnel clicks. 💡\n\nWhat attribution model has provided the clearest insight into your down-funnel marketing ROI?\n\n#marketingstrategy #b2bmarketing #demandgen`,
  ],
};

export const DOMAINS: Record<string, DomainConfig> = {
  engineering: ENGINEERING_DOMAIN,
  hr: HR_DOMAIN,
  sales: SALES_DOMAIN,
  marketing: MARKETING_DOMAIN,
  general: GENERAL_DOMAIN,
};

export const inferDomain = (topic: string, context: string): string => {
  const combined = (topic + " " + context).toLowerCase();

  if (combined.match(/candidate|interview|onboarding|performance review|hiring|recruiting|resume|hr/i)) {
    return "hr";
  }
  if (combined.match(/deal|pipeline|quota|objection|meddic|sales|prospect|closing/i)) {
    return "sales";
  }
  if (combined.match(/campaign|funnel|conversion|ad spend|marketing|seo|ctr/i)) {
    return "marketing";
  }
  if (
    combined.match(
      /code|api|database|server|react|postgres|kafka|algorithm|rfc|config|latency|deploy|ci\/cd|docker|kubernetes|devops|frontend|backend|data structure|complexity|theorem|big-o|recursion|dynamic programming/i
    )
  ) {
    return "engineering";
  }

  return "general";
};

export const inferAngle = (topic: string, context: string, domain: string): string => {
  const combined = (topic + " " + context).toLowerCase();
  const cleanTopic = topic.trim() || "modern systems";

  if (domain === "engineering") {
    if (combined.match(/dead letter queue|dlq|queue|kafka|rabbitmq|sqs|event|pubsub/i)) {
      return `Production triage: preventing poison-pill messages and cascading retry storms with ${cleanTopic}`;
    }
    if (combined.match(/postgres|mysql|database|sql|mvcc|index|vacuum|query/i)) {
      return `Under the hood: latency bottlenecks, locking tradeoffs, and tuning ${cleanTopic} for high throughput`;
    }
    if (combined.match(/microservices|distributed|consensus|cap|partition|network/i)) {
      return `Distributed systems reality check: failure domain isolation and reliability tradeoffs in ${cleanTopic}`;
    }
    if (combined.match(/cache|redis|memcached|invalidation/i)) {
      return `Cache coherence and stampede mitigation strategies when operating ${cleanTopic} at scale`;
    }
    return `Architectural tradeoffs, failure modes, and concrete production lessons with ${cleanTopic}`;
  }

  if (domain === "hr") {
    if (combined.match(/hiring|interview|rubric|candidate/i)) {
      return `High-signal evaluation: replacing pedigree bias with outcome-based rubrics in ${cleanTopic}`;
    }
    return `Operational frameworks and retention levers for scaling ${cleanTopic}`;
  }

  if (domain === "sales") {
    if (combined.match(/objection|closing|negotiation|pricing/i)) {
      return `Overcoming buyer friction: disciplined qualification and conciseness in ${cleanTopic}`;
    }
    return `Predictable enterprise pipeline: multi-threading and technical alignment in ${cleanTopic}`;
  }

  if (domain === "marketing") {
    return `Shifting from vanity metrics to high-intent pipeline velocity in ${cleanTopic}`;
  }

  return `Actionable takeaways and counterintuitive principles for navigating ${cleanTopic}`;
};
