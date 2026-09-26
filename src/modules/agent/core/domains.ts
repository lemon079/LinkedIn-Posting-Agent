import type { DomainConfig } from "@/types/agent";

export type { DomainConfig };


export const ENGINEERING_DOMAIN: DomainConfig = {
  id: "engineering",
  label: "Engineering & CS",
  specificityDescription:
    "A concrete technology, tool, protocol, pattern, algorithm, or CS concept (e.g. Kafka consumer groups, Postgres MVCC, React Suspense, B-trees, CAP theorem, dynamic programming, mTLS).",
  groundingDescription:
    "Search for a recent incident, RFC update, benchmark result, changelog entry, seminal paper, or research finding related to it. Anchor the post to something real: a version number, a config name, a CVE ID, a complexity class, a paper title, or a specific error message.",
  examples: [
    `We were facing 1.8s p99 latency on our core order-processing service.\n\nEvery traffic spike triggered cascading timeouts across three downstream microservices.\n\nHere is the exact architecture change that cut p99 latency by 68%:\n\n1. Decoupled write-heavy endpoints using Apache Kafka message streaming.\n2. Implemented strict consumer idempotency using Redis SETNX deduplication keys.\n3. Isolated poison messages into dedicated Dead Letter Queues (DLQ) with automated replay policies.\n\nThe result?\n- 68% decrease in p99 latency\n- Zero dropped events during our last 10x traffic spike\n- 40% reduction in database connection pool contention\n\nArchitectural lesson: Never let synchronous REST dependencies dictate your system's availability boundaries.\n\nWhat strategies has your team used to decouple high-throughput microservices?\n\n#systemdesign #backend #distributedsystems`,
    `Most engineering teams don't need microservices.\n\nThey need clean module boundaries, well-defined domain events, and faster CI pipelines.\n\nOver the last 5 years, I watched dozens of 10-person teams spend 60% of their sprint cycles managing Kubernetes manifests, distributed tracing, and gRPC versioning instead of shipping customer features.\n\nA well-architected modular monolith:\n- Runs in a single process with instant local dev setup\n- Eliminates network serialization and distributed transaction bugs\n- Allows refactoring across boundaries with simple IDE compiler checks\n\nUnless you have distinct team boundaries with independent deploy cycles and completely mismatched scaling dimensions, a modular monolith will out-ship microservices every single time.\n\nWhere do you draw the line between a modular monolith and microservices?\n\n#softwareengineering #architecture #microservices`,
    `PostgreSQL autovacuum defaults will quietly choke write-heavy tables once they pass 10M rows.\n\nBecause Postgres uses MVCC, an UPDATE writes an entirely new row version. Old versions become dead tuples that bloat both table heaps and indexes.\n\nBy default, autovacuum_vacuum_scale_factor is set to 0.2 (20%). On a 20M row table, autovacuum won't even kick in until 4 MILLION rows have been updated.\n\nBy that time, queries are scanning bloated disk pages, cache hit ratios plummet, and p99 latency spikes uncontrollably.\n\nThe fix we apply on high-write OLTP tables:\n- Drop autovacuum_vacuum_scale_factor to 0.02 or 0.05\n- Increase autovacuum_vacuum_cost_limit from 200 to 1000 or 2000\n- Allocate dedicated autovacuum_work_mem (512MB+)\n\nNever run production databases on default maintenance parameters.\n\n#postgres #database #performancetuning`,
    `The hardest distributed systems decision isn't picking tools. It's choosing your consistency boundary.\n\nWhen we redesigned our inventory reservation system, we had two paths:\n\nOption A: Strong consistency via distributed transactions (2PC/Saga with locking)\n- Guarantees zero overselling\n- Adds 150ms per checkout request and becomes a single point of failure under peak load\n\nOption B: Eventual consistency with optimistic reservation & compensating transactions\n- Sub-10ms response times\n- Requires reconciliation workflows if rare edge-case overselling occurs (<0.01%)\n\nWe picked Option B. The business impact of a 5% conversion boost from sub-second latency outweighed the cost of rare automated order cancellations by 50x.\n\nSystem design is rarely about finding the perfect solution. It is about matching technical trade-offs to business economics.\n\n#distributedsystems #systemdesign #softwarearchitecture`,
  ],
};

export const HIRING_EXEMPLARS: string[] = [
  `Our data platform is processing 40M events/day on Kafka and DuckDB, and we've reached the point where off-the-shelf queries aren't enough. We're looking for our first dedicated Infrastructure Engineer to join us.\n\nHere is what the job actually looks like on a Tuesday:\n- Profiling consumer lag and rebalance churn across distributed partitions.\n- Writing custom ingestion connectors and tuning storage compaction policies.\n- Pairing with product teams so their streaming queries don't starve critical pipelines.\n\nWhat makes this different:\nZero bureaucracy. No 8-layer approval matrices or enterprise change advisory boards. You deploy straight to staging, verify metrics with Grafana, and roll out to production. Small team of 6 engineers with high craft standards.\n\nWhat we're looking for:\n- 4+ years running distributed systems in production (Kafka, ClickHouse, or Postgres at scale).\n- Deep intuition for concurrency, memory bounds, and Linux I/O profiling.\n- Strong written communicator who values documentation as code.\n\nInterested? DM me directly or drop a note below and I'll send over the details.\n\n#hiring #softwareengineering #distributeddata #infrastructure`,
  `Most product roles at this stage ask you to manage Jira tickets. This role asks you to solve why engineers churn before their first PR. We're hiring a Technical Product Manager to lead our developer platform experience.\n\nThe day-to-day:\n- Auditing SDK ergonomics, CLI telemetry, and API latency directly with users.\n- Identifying developer drop-off points between documentation and first integration.\n- Defining the technical roadmap for our core developer toolchain alongside engineering leads.\n\nWhy you'll love it:\nYou'll work directly with builders who test your product daily. You report straight to our VP of Engineering, with total autonomy over developer onboarding experiments.\n\nRequirements:\n- Proven experience shipping developer-facing APIs, devtools, or technical SaaS.\n- Ability to read code, query Postgres directly, and debate architectural trade-offs with senior engineers.\n- High empathy for developer pain and zero patience for vanity feature creep.\n\nIf this sounds like the challenge you're looking for, link to apply is in the first comment, or send me a DM.\n\n#productmanagement #techjobs #developeradvocacy #hiring`,
  `We're opening a Senior Frontend Engineer role on our core design system team as we rebuild our workspace interface.\n\nWhat you'll own:\n- Architecting accessible, sub-100ms UI primitives using React 19, TypeScript, and Tailwind.\n- Enforcing keyboard navigation, screen-reader ergonomics, and layout stability at 60fps.\n- Collaborating with design leads to eliminate visual drift across 4 core product views.\n\nWhy this team:\nWe care obsessively about UI polish and interaction speed. No legacy jQuery wrappers or multi-megabyte bundle bloat.\n\nMust-haves:\n- Strong command of modern TypeScript, CSS layout algorithms, and browser rendering lifecycle.\n- Deep respect for accessibility (WCAG AA standards) and micro-interactions.\n- Track record of maintaining components used by dozens of engineers.\n\nIf you care deeply about interface craftsmanship, apply through the link in the first comment or message me directly.\n\n#react #frontend #webdev #hiring`,
];

export const HR_DOMAIN: DomainConfig = {
  id: "hr",
  label: "HR / People",
  specificityDescription:
    "A real hiring process, interview practice, or workplace decision, named concretely rather than described abstractly.",
  groundingDescription:
    "Search for a recent labor law/policy change or a named survey/report to ground the insight.",
  examples: [
    `We eliminated the 5-round technical interview loop last year.\n\nHere is what happened to our hiring velocity and engineering quality:\n\nBefore: 28 days average time-to-offer, a 34% candidate drop-off rate, and zero correlation between LeetCode scores and on-the-job performance.\n\nOur revised 2-stage evaluation:\n1. 45-minute practical pairing session on real repository PRs (evaluating debugging, code review empathy, and communication).\n2. 45-minute architecture discussion covering trade-offs the candidate actually made in past projects.\n\nThe results after 9 months:\n- Time-to-offer dropped from 28 days to 9 days\n- Offer acceptance rate rose to 89%\n- 90-day retention and peer reviews reached an all-time high\n\nTop engineers don't want to invert binary trees on a whiteboard. They want to work with teams that respect their craft and their time.\n\nWhat is one interview stage your team could cut without reducing hiring quality?\n\n#hiring #talentacquisition #techrecruiting`,
    `Most onboarding fails because companies treat it as documentation delivery instead of psychological momentum.\n\nWhen new hires spend their first two weeks reading 40 Notion pages and chasing Slack access permissions, their confidence drops.\n\nHere is our Day 1 to Day 30 onboarding cadence:\n- Day 1: One dedicated peer buddy assigned. Development environment configured before lunch. First trivial PR committed to production before 4 PM.\n- Week 1: Shadow 3 customer support or sales calls to build immediate empathy with the actual user experience.\n- Day 30: Complete one self-contained milestone that owns a real piece of production functionality.\n\nEarly wins build ownership faster than any employee handbook ever could.\n\n#onboarding #peopleops #management`,
    HIRING_EXEMPLARS[0],
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
    `The biggest deal of my career almost died in procurement for one simple reason:\n\nWe were single-threaded with a VP who unexpectedly left the company 3 weeks before quarter close.\n\nEvery enterprise deal that stalls in the final mile usually has the same root cause: the sales team relied on an enthusiastic champion instead of building multi-threaded consensus.\n\nSince that deal, we mandated the 'Rule of 4' on every enterprise opportunity over $50k:\n1. Economic Buyer (owns the budget and ROI sign-off)\n2. Technical Evaluator (vets security, compliance, and integration friction)\n3. End-User Champion (feels the daily pain and drives internal adoption)\n4. Procurement / Legal Gatekeeper (controls vendor onboarding and paper process)\n\nIf you don't have active communication with all four by stage 3, you don't have a forecastable deal. You have a wish.\n\n#b2bsales #enterprisesales #dealstrategy`,
    `Stop offering discounts to close end-of-quarter deals.\n\nWhen a prospect says 'we love the product, but we need a 20% discount to sign this month,' most reps immediately run to their manager for approval.\n\nHere is what you actually communicate when you cave on price:\n1. Your original pricing was arbitrary.\n2. Your product doesn't deliver the ROI you claimed in discovery.\n3. The buyer now holds all the leverage in every future renewal.\n\nInstead of cutting price, trade value: reduce contract terms, require upfront multi-year payment, or remove service tiers.\n\nPrice concessions without scope adjustments destroy gross margins and attract high-churn customers.\n\n#salesstrategy #pricing #b2b`,
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
    `The most dangerous trap for high-performing individual contributors is believing that career growth requires becoming a people manager.\n\nI have seen brilliant principal engineers, top designers, and killer salespeople become miserable managers simply because their company had no IC compensation ladder.\n\nManagement is not a promotion. It is a complete career change.\n- IC leverage: Deep problem-solving, architectural mastery, direct craftsmanship.\n- Manager leverage: Unblocking others, hiring, performance reviews, organizational psychology, and meeting coordination.\n\nIf you love building things with your own hands, stay on the Staff/Principal track. Great organizations pay world-class ICs the same as directors.\n\n#careergrowth #leadership #engineeringmanagement`,
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
    `Our marketing team generated 2,400 MQLs last quarter.\n\nAnd our sales team closed exactly 3 of them.\n\nThat brutal realization forced us to kill our MQL metric entirely.\n\nWhen marketing bonuses are tied to raw ebook downloads or webinar attendees, marketing teams optimize for curiosity clicks, not buying intent.\n\nHere is how we redesigned our pipeline alignment:\n1. Replaced MQL with Pipeline Velocity (qualified opportunities accepted by sales within 14 days).\n2. Shifted 70% of ad spend from generic lead-magnet downloads to high-intent account retargeting and customer case studies.\n3. Tied marketing incentives directly to closed-won revenue alongside the sales org.\n\nTotal lead volume dropped by 65%. But sales-accepted opportunities increased by 3.2x.\n\nVanity metrics feel good in marketing reports, but revenue is the only metric that matters.\n\n#b2bmarketing #demandgeneration #growth`,
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

  if (combined.match(/\b(?:candidate|interview|onboarding|performance review|hiring|recruiting|resume|hr)\b/i)) {
    return "hr";
  }
  if (combined.match(/\b(?:deal|pipeline|quota|objection|meddic|sales|prospect|closing)\b/i)) {
    return "sales";
  }
  if (combined.match(/\b(?:campaign|funnel|conversion|ad spend|marketing|seo|ctr)\b/i)) {
    return "marketing";
  }
  if (
    combined.match(
      /\b(?:code|api|database|server|react|postgres|kafka|algorithm|rfc|config|latency|deploy|ci\/cd|docker|kubernetes|devops|frontend|backend|data structure|complexity|theorem|big-o|recursion|dynamic programming)\b/i
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
