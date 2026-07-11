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
  specificityDescription: "A concrete technology, tool, protocol, pattern, algorithm, or CS concept (e.g. Kafka consumer groups, Postgres MVCC, React Suspense, B-trees, CAP theorem, dynamic programming, mTLS).",
  groundingDescription: "Search for a recent incident, RFC update, benchmark result, changelog entry, seminal paper, or research finding related to it. Anchor the post to something real: a version number, a config name, a CVE ID, a complexity class, a paper title, or a specific error message.",
  examples: [
    `Kafka consumer group rebalances will absolutely tank your system throughput if you don't watch max.poll.interval.ms.\n\nWe recently hit this in production ⚙️ when consuming batches of message data. One of our downstream database transactions slowed down ⏳, causing the poll loop to exceed the configured timeout of 300 seconds.\n\nThe coordinator marked the consumer dead, triggered a rebalance, and the rest of the consumers got stuck in a stop-the-world loop trying to re-assign partitions.\n\nThe fix wasn't just to bump max.poll.interval.ms to some arbitrary number. We had to tune max.poll.records down to 50 so each batch could complete under the timeout, even during database lag.\n\nAlways verify your processing time under worst-case network latency.\n\nHow do you handle consumer group timeout limits under peak load?\n\n#kafka #distributed-systems #backend`,
    `Postgres MVCC bloat is a silent killer of index performance. ⚙️\n\nWe had a table handling millions of updates daily. Even though the row count remained constant, queries started dragging because of dead tuples. Every update in Postgres writes a new version of the row, leaving the old one behind as dead space.\n\nAutovacuum was running, but it couldn't keep up with our aggressive update rate. The table was bloated, causing index scans to fetch pages that only contained dead rows.\n\nWe tuned autovacuum_vacuum_scale_factor down to 0.05 and autovacuum_vacuum_cost_limit up to 1000. This made vacuuming kick in much earlier and run faster, keeping dead tuple counts under control. ⏳\n\nNever assume default autovacuum settings are safe for high-write databases.\n\nHave you ever had to run a manual VACUUM FULL on a production table?\n\n#postgres #database #backend`,
    `React Suspense can inadvertently introduce nested network waterfalls if you aren't careful. ⚙️\n\nI saw a frontend team wrap three separate data-fetching components in nested Suspense boundaries. Because each component waited to render until its own API call finished, the requests executed sequentially instead of in parallel.\n\nThe user had to wait for the header, then the sidebar, and finally the feed, doubling the perceived page load time.\n\nInstead of nested Suspense, we initiated all fetch requests at the parent route level in parallel before rendering the children, or wrapped them in a single Suspense boundary. ⏳\n\nAlways inspect the network waterfall graph in Chrome DevTools to make sure your fetches aren't waiting on each other.\n\nHow do you coordinate API fetches across deep React component trees?\n\n#reactjs #frontend #webdev`,
    `Most developers use hash maps daily without thinking about what happens when the load factor crosses 0.75. 🧠\n\nHere's what actually happens inside a Java HashMap when that threshold is hit:\n\n1. The internal array doubles in size (say from 16 to 32 buckets).\n2. Every single existing entry is rehashed — its position is recalculated against the new array length.\n3. If two keys land in the same bucket, Java 8+ converts the linked list into a balanced red-black tree once the chain exceeds 8 nodes.\n\nThat rehash is O(n) and it happens on the thread that triggered the insert. In a hot loop processing 10M records, this can cause visible latency spikes. ⏳\n\nThe fix? Pre-size your map: new HashMap<>(expectedSize / 0.75 + 1).\n\nUnderstanding the data structure under the abstraction saves you from surprises in production.\n\nWhat's a data structure implementation detail that bit you unexpectedly?\n\n#computerscience #datastructures #algorithms`,
    `The CAP theorem doesn't say what most people think it says. 🧠\n\nBrewer's original conjecture (2000) and Gilbert & Lynch's formal proof (2002) state that a distributed system can provide at most two of three guarantees: Consistency, Availability, and Partition tolerance.\n\nBut here's the nuance people miss: partition tolerance isn't optional. Networks will partition. So the real choice is always between C and A during a partition event.\n\nMongoDB chose CP — during a network split, it elects a new primary and rejects writes on the minority side.\nCassandra chose AP — it accepts writes on both sides and reconciles later using last-write-wins or vector clocks.\n\nNeither is "wrong." The question is: does your business tolerate stale reads, or does it tolerate write rejections?\n\nKnowing the theory behind your infrastructure choices turns architecture decisions from gut feelings into engineering tradeoffs.\n\nHow do you explain CAP tradeoffs to non-technical stakeholders?\n\n#computerscience #distributedsystems #systemdesign`
  ]
};

export const HR_DOMAIN: DomainConfig = {
  id: "hr",
  label: "HR / People",
  specificityDescription: "A real hiring process, interview practice, or workplace decision, named concretely rather than described abstractly.",
  groundingDescription: "Search for a recent labor law/policy change or a named survey/report to ground the insight.",
  examples: [
    `We rejected a candidate for "lack of leadership experience."\n\nSix months later I found her old performance review. She'd rebuilt her team's onboarding process from scratch, cut ramp time by 40%, and trained three people who got promoted after she left.\n\nNobody had called it "leadership" because she didn't have the title for it. 📉\n\nWe almost missed a great hire because our rubric only recognized authority, not impact. 💡\n\nNow when I screen resumes, I ask what this person changed, not what they managed.\n\nWhat's a hiring signal you ignore now that you used to weight heavily?\n\n#hiring #humanresources #leadership`
  ]
};

export const SALES_DOMAIN: DomainConfig = {
  id: "sales",
  label: "Sales",
  specificityDescription: "A real objection pattern, deal scenario, or named framework (e.g. MEDDIC, Challenger).",
  groundingDescription: "Search for a named framework or benchmark stat related to sales performance or closing rates.",
  examples: [
    `Lost a $120K deal last quarter because I answered a question the prospect didn't ask.\n\nThey asked about implementation timeline. I gave them a feature comparison. 📉\n\nClassic move when you're nervous about the close — you retreat to what you're prepared to say, not what they actually need to hear.\n\nReplaying the call, the fix was obvious: answer the literal question in one sentence, then stop talking. 🛑\n\nThe reps who win aren't the ones with the best pitch. They're the ones who can sit in silence right after answering.\n\nWhat's a question you used to over-answer before you caught yourself doing it?\n\n#sales #closing #meddic`
  ]
};

export const GENERAL_DOMAIN: DomainConfig = {
  id: "general",
  label: "General / Personal",
  specificityDescription: "A real, concrete moment, number, or named detail from someone's actual experience.",
  groundingDescription: "Do not search for stats or fabricate anchors. Ground the post entirely in the specific details and context provided by the user.",
  examples: [
    `I turned down a promotion last year.\n\nMore money, a bigger title, and the same team I'd have had to manage out of a role I actually enjoyed. 📉\n\nEveryone told me I was crazy. My manager asked twice if I was sure.\n\nA year later, the person who took the role burned out in eight months and moved teams. I'm still doing the work I was doing, just better at it now. 💡\n\nTurns out "next step" isn't always up. Sometimes it's just further in.\n\nAnyone else turned down something "better" and not regretted it?\n\n#career #growth #decisions`
  ]
};

export const MARKETING_DOMAIN: DomainConfig = {
  id: "marketing",
  label: "Marketing",
  specificityDescription: "A specific campaign structure, conversion funnel, or ad strategy detail.",
  groundingDescription: "Search for a named benchmark stat, recent platform algorithm update, or industry conversion metric.",
  examples: [...GENERAL_DOMAIN.examples]
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
  if (combined.match(/code|api|database|server|react|postgres|kafka|algorithm|rfc|config|latency|deploy|ci\/cd|docker|kubernetes|devops|frontend|backend|data structure|complexity|theorem|big-o|recursion|dynamic programming/i)) {
    return "engineering";
  }
  
  return "general";
};

