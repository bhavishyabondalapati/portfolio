// All text, numbers, links and tech stacks for the site live in this one file.
// Components only read from it, so editing content never means touching layout code.
//
// Sources: the README of each repo in ~/projects, ~/projects/project-notes/*/01-overview.md,
// and the resume. Every number below appears in one of those.
// Items marked "CONFIRM" disagree between sources or are missing; see docs/phase-0-content-notes.md.

export type Link = { label: string; href: string };

/** A point on the map, in decimal degrees (WGS 84). West and south are negative. */
export type Coords = { lat: number; lon: number };

export type Experience = {
  company: string;
  role: string;
  place: string;
  coords: Coords;
  dates: string;
  summary: string;
  points: string[];
  stack: string[];
};

/** A small figure drawn in code from a project's own numbers, for plates without a picture. */
export type PlateChart =
  | { kind: "bars"; unit: string; caption: string; rows: { label: string; value: number }[]; /** printed after each value */ suffix?: string }
  | { kind: "steps"; caption: string; steps: string[] };

export type FeaturedProject = {
  slug: string;
  name: string;
  /** Short field label printed at the top of the plate. */
  field: string;
  /** The key result, printed first and large. */
  figure: { value: string; label: string };
  oneLine: string;
  problem: string;
  built: string[];
  result: string[];
  stack: string[];
  links: Link[];
  // The project's own pictures, copied from its repo. Several images show as a strip of tiles.
  media: { src: string; alt: string; caption?: string }[];
  chart?: PlateChart;
};

export type SecondaryProject = {
  slug: string;
  name: string;
  /** The course it was built for, when it was coursework. */
  course?: string;
  oneLine: string;
  highlight: string;
  stack: string[];
  links: Link[];
  note?: string;
};

export type ListedProject = {
  name: string;
  oneLine: string;
  stack: string[];
  href: string;
};

const GH = "https://github.com/bhavishyabondalapati";

export const person = {
  name: "Bhavishya Bondalapati",
  shortName: "bhavishya",
  role: "ML systems and backend engineer",
  // Shown under the name on the first screen.
  intro:
    "MS Computer Science student at Northeastern. I build machine learning systems that check their own work, and the backends that serve them.",
  lookingFor: "Looking for ML systems, backend and full-stack roles.",
  // The line under the role on the first screen; the legend beside it carries the facts.
  tagline: "I build machine learning systems that check their own work, and the backends that serve them.",
  contactLine: "Email is the fastest way to reach me.",
  location: "Boston, MA",
  // Northeastern's Boston campus: the "station" printed on the first screen.
  station: { lat: 42.3398, lon: -71.0892 } satisfies Coords,
  // The one sentence under the name on the first screen.
  heroLine: "MS\u00a0Computer Science at Northeastern, GPA\u00a03.9, graduating May\u00a02027. Open to ML systems, backend and full-stack roles.",
  heroAction: { label: "See the work", href: "#projects" },
};

export const education = [
  {
    school: "Northeastern University",
    place: "Boston, MA",
    coords: { lat: 42.3398, lon: -71.0892 },
    degree: "Master of Science in Computer Science",
    gpa: "3.9",
    dates: "Fall 2025 to May 2027 (expected)",
  },
  {
    school: "SRM Institute of Science and Technology",
    place: "Chennai, India",
    campus: "Kattankulathur campus",
    coords: { lat: 12.8231, lon: 80.0442 },
    degree: "Bachelor of Technology in Computer Science and Engineering (AI and ML)",
    gpa: "3.64",
    dates: "2021 to Jan. 2025",
  },
];

export const experience: Experience[] = [
  {
    company: "JC Biotech Pvt. Ltd.",
    role: "Automation and AI Systems Intern",
    place: "Ongole, Andhra Pradesh, India",
    coords: { lat: 15.5057, lon: 80.0499 },
    dates: "Nov. 2024 to Jun. 2025",
    summary:
      "Agentic aerial impact intelligence: raw aerial imagery in, audit-ready field reports out.",
    points: [
      "Delivered an end-to-end agentic AI product (LangGraph-style routing and AWS Step Functions) coordinating 6 AI agents that turn raw aerial imagery into audit-ready reports for agricultural field triage.",
      "Trained U-Net and Siamese network models to detect crop stress, facility damage and field-trial anomalies from before and after imagery, producing pixel-level masks with confidence scores.",
      "Designed a validation loop that checks LLM-written narratives against the computer vision and geo metrics, cutting manual inspection by 70% and stakeholder response time by 60%.",
      "Integrated LLM and RAG (LangChain) summaries grounded in historical SOPs, run on AWS Lambda, Step Functions and SQS for event-driven processing.",
      "Built a Geo-AI analytics layer (PostGIS, GeoPandas, Rasterio) for impacted acreage, hotspot clusters and severity-by-plot rollups.",
    ],
    stack: ["PyTorch", "U-Net", "Siamese networks", "LangGraph", "LangChain", "AWS Step Functions", "Lambda", "SQS", "PostGIS", "GeoPandas", "Rasterio"],
  },
  {
    company: "Mouri Tech",
    role: "Data Analyst Intern",
    place: "Hyderabad, India",
    coords: { lat: 17.385, lon: 78.4867 },
    dates: "Sept. 2024 to Oct. 2024",
    summary: "A GenAI document platform for healthcare paperwork.",
    points: [
      "Built a GenAI document processing platform with FastAPI, LangChain, Pinecone and Amazon Bedrock to automate healthcare document parsing, reducing manual review by 40% and improving retrieval accuracy by 30%.",
      "Fine-tuned open-source LLMs with LoRA, QLoRA and PEFT on Amazon SageMaker, a 15% improvement in domain-specific extraction accuracy over the base models.",
      "Implemented LangGraph agent workflows for retrieval, validation and summarization, so QA and compliance teams could trace every AI output.",
      "Developed Python microservices for ingestion, chunking, embedding and RAG inference, giving semantic search in under 3 seconds across 100K+ document embeddings.",
    ],
    stack: ["FastAPI", "LangChain", "LangGraph", "Pinecone", "Amazon Bedrock", "SageMaker", "LoRA", "QLoRA", "PEFT"],
  },
];

export const featured: FeaturedProject[] = [
  {
    slug: "aerial-change-intelligence",
    name: "Aerial Change Intelligence",
    field: "Computer vision · GIS",
    figure: { value: "F1 0.898", label: "change-detection accuracy on 128 unseen test pairs (IoU 0.815, calibration error 0.007)" },
    oneLine:
      "Before and after imagery in; changed areas, their size in hectares and a fact-checked report out.",
    problem:
      "People who manage land want to know what changed, how big it is and whether to worry. Doing that by eye over thousands of hectares is slow, and an LLM summary of the result cannot be trusted on its own.",
    built: [
      "A Siamese U-Net with a shared ResNet18 encoder, trained on LEVIR-CD on the Mac GPU (MPS), giving a calibrated change probability for every pixel.",
      "A Sentinel-2 vegetation track for the Godavari delta that removes ESA's +1000 reflectance offset, buffers clouds by 50 m and compares 2025 with each pixel's own 2021 to 2024 normal.",
      "Masks turned into polygons and measured in hectares with GeoPandas in a metric projection.",
      "A Gemini report grounded in agriculture guides, then a validator that checks every number and date in it against the data.",
    ],
    result: [
      "F1 0.898 and IoU 0.815 on 128 unseen LEVIR-CD test pairs, with calibration error (ECE) of 0.007.",
      "3,005 ha flagged by the seasonal check, 14.6% of the 22,459 ha of normally green land it could judge.",
      "In the sample report, 40 numbers and dates verified against the facts and 0 mismatched.",
    ],
    stack: ["PyTorch (MPS)", "torchvision", "GeoPandas", "rasterio", "Shapely", "pystac-client", "Gemini", "NumPy", "pytest"],
    links: [{ label: "Code on GitHub", href: `${GH}/aerial-change-intelligence` }],
    media: [
      { src: "/work/aerial-before.webp", alt: "Godavari delta vegetation index, 2021 to 2024 normal: mostly green fields with redder patches", caption: "Vegetation, normal" },
      { src: "/work/aerial-after.webp", alt: "The same area in 2025: greener fields with scattered red patches", caption: "Vegetation, 2025" },
      { src: "/work/aerial-flagged.webp", alt: "The same area with flagged vegetation loss shown in orange over a grey base", caption: "Flagged loss" },
    ],
  },
  {
    slug: "llm-gateway",
    name: "LLM Gateway",
    field: "Backend · LLM infrastructure",
    figure: { value: "3,085 req/s", label: "through the gateway with features off, at 19.8 ms median latency (p50)" },
    oneLine:
      "An OpenAI-compatible gateway that hides personal data from LLM providers and puts it back in the answer.",
    problem:
      "When every team calls LLM providers directly, customer names and emails leave the network, one team can burn the budget, nobody knows cost or latency, and one provider outage breaks every app.",
    built: [
      "A FastAPI server that speaks the OpenAI API, so existing clients switch by changing base_url.",
      "Reversible PII redaction with Presidio and spaCy (John Smith becomes <PERSON_1> and back), including across streamed chunks.",
      "Per-team hashed API keys, token-bucket rate limits and monthly token budgets.",
      "An exact and semantic cache keyed on redacted text, retries with backoff and provider fallback, and OpenTelemetry traces with a cost and latency dashboard.",
    ],
    result: [
      "3,085 requests per second through the gateway with features off, at 19.8 ms p50.",
      "Cache hits about 250 times faster than misses (1.6 ms against 394 ms p50 under load).",
      "100% success with 30% of upstream calls failing, thanks to retries and fallback.",
      "Load testing found 4 real bugs that the 53 unit tests missed.",
    ],
    stack: ["Python", "FastAPI", "httpx", "Presidio", "spaCy", "OpenTelemetry", "SQLite", "Docker Compose", "Jaeger", "pytest"],
    links: [{ label: "Code on GitHub", href: `${GH}/llm-gateway` }],
    media: [],
    chart: {
      kind: "bars",
      unit: "ms, p50 under load",
      suffix: "ms",
      caption: "Cache hit against cache miss",
      rows: [
        { label: "Cache hit", value: 1.6 },
        { label: "Cache miss", value: 394 },
      ],
    },
  },
  {
    slug: "lexintake",
    name: "LexIntake",
    field: "LLM extraction · backend",
    figure: { value: "1,768 / 1,782", label: "fields extracted exactly right on 248 held-out synthetic documents, with every cited quote verified in the text" },
    oneLine:
      "Intake and triage for the legal documents a private equity firm receives: parse, classify, extract key terms with verified citations, check NDAs against the playbook, and send anything doubtful to a person.",
    problem:
      "A mid-market private equity legal team receives thousands of documents a year, and today someone reads every one, decides what it is, checks it against the firm's standards and files it by hand, although most are routine.",
    built: [
      "Docling parsing with an OCR fallback, keeping each text block's page and bounding box.",
      "Classification with Haiku and NDA field extraction with Sonnet, where every value must come with a quote that is found in the parsed text, or the document goes to review.",
      "An NDA playbook in YAML that each document is checked against (pass, deviation or unknown, with evidence), and a Next.js review page that highlights the cited quote.",
      "FastAPI, Celery and Redis background jobs, Postgres with an audit log and cost tracking, Docker Compose, and GitHub Actions with a full stack smoke test.",
    ],
    result: [
      "1,768 of 1,782 fields exactly right (99%) on the 248-document test half of a synthetic set, and all 1,495 cited quotes found in the parsed text; confidence thresholds were set on a separate calibration half.",
      "On 66 real NDAs from ContractNLI it failed safe: none was auto-approved, and the run exposed a schema flaw the synthetic data could not show (no clause versus a clause with no deadline).",
      "The review queue caught 94 of the 96 documents that needed a person; 94 of the 111 it flagged had a real problem.",
      "$0.0043 per document on average through the Anthropic Batch API ($2.04 for all 495 documents).",
      "Scanned pages are harder: 279 of 292 fields right (96%), with the 13 misses traced to damaged OCR text or empty answers.",
    ],
    stack: ["Python", "FastAPI", "Celery", "Redis", "Postgres", "Docling", "Anthropic API", "Next.js", "Docker Compose"],
    links: [
      { label: "Code on GitHub", href: `${GH}/lexintake` },
      { label: "AWS version", href: `${GH}/lexintake-aws` },
    ],
    media: [
      {
        src: "/work/lexintake-review.webp",
        alt: "LexIntake's review page for a synthetic NDA: the document on the left with the term clause highlighted, and on the right the playbook checks (one deviation, five passes) and the extracted fields with the cited quote",
        caption: "Review page, synthetic NDA",
      },
    ],
  },
  {
    slug: "reporag",
    name: "RepoRAG",
    field: "Retrieval-augmented generation",
    figure: { value: "0.96", label: "Recall@5 on itsdangerous; 0.722 on a held-out set written before tuning" },
    oneLine: "Ask questions about any public GitHub repo and get answers that cite the exact files and lines.",
    problem:
      "An answer about a codebase is only useful if you can check it, and a RAG system is only trustworthy if its retrieval is measured rather than assumed.",
    built: [
      "Code-aware chunking with tree-sitter at function and class boundaries, so every chunk keeps its file path, symbol and line range.",
      "Two retrievers in parallel: BM25 for exact identifiers (with camelCase and snake_case splitting) and bge-small embeddings in FAISS for meaning, merged with Reciprocal Rank Fusion, then a cross-encoder reranker.",
      "Grounded answers from Gemini that must cite numbered excerpts, with three guards that answer \"not enough information in this repo\" instead of guessing.",
      "An eval harness with 32 hand-labelled development questions and a separate 20-question held-out set over two pinned repos, plus a FastAPI backend, a Next.js UI and Docker Compose.",
    ],
    result: [
      "Recall@5 of 0.96 on itsdangerous with hybrid search (0.82 with keyword search alone), and 0.722 on a held-out set written before any tuning.",
      "An off-the-shelf reranker made code search worse: MRR@10 fell from 0.446 to 0.385, a domain mismatch the evals caught.",
      "On the harder ky repo every mode stays between 0.21 and 0.36 Recall@5 (development set): its long test files crowd out the short source functions that answer the question.",
      "73 offline tests run in about a second, with CI on every push. Answer faithfulness and abstention are not measured yet.",
    ],
    stack: ["Python", "FastAPI", "tree-sitter", "FAISS", "sentence-transformers", "Gemini", "Next.js", "Docker", "pytest"],
    links: [{ label: "Code on GitHub", href: `${GH}/RepoRAG` }],
    media: [],
    chart: {
      kind: "bars",
      unit: "Recall@5, hybrid search, development set",
      caption: "itsdangerous against ky",
      rows: [
        { label: "itsdangerous", value: 0.964 },
        { label: "ky", value: 0.214 },
      ],
    },
  },
  {
    slug: "robot-arm-sim",
    name: "Robot Arm Simulation",
    field: "Robotics · imitation learning",
    figure: { value: "46 / 50", label: "unseen pick-and-place episodes, from cameras and joint angles only" },
    oneLine:
      "An SO-101 arm in MuJoCo that learns pick-and-place from camera images by copying a scripted expert.",
    problem:
      "Teaching a robot arm a task from pixels needs good demonstrations and an honest way to measure whether the learned policy really works.",
    built: [
      "A damped-least-squares inverse kinematics solver written from scratch on MuJoCo's Jacobian, with joint limits and random restarts.",
      "A scripted expert that turns eight Cartesian waypoints into smooth minimum-jerk joint motions, recording 200 demonstrations with injected noise.",
      "A behavior-cloning CNN with spatial softmax that predicts 10-step action chunks from two cameras and joint angles, trained on Apple Silicon.",
      "An evaluation on 50 unseen cube positions with 95% confidence intervals, failure analysis and rendered videos.",
    ],
    result: [
      "The learned policy succeeded on 46 of 50 unseen episodes (92%) using only cameras and joint angles.",
      "The scripted expert, which sees the true cube pose, succeeded on 50 of 50.",
      "Training took 30 minutes on an M4 Pro.",
    ],
    stack: ["MuJoCo 3", "PyTorch (MPS)", "NumPy", "imageio", "matplotlib", "pytest"],
    links: [{ label: "Code on GitHub", href: `${GH}/robot-arm-sim` }],
    media: [
      { src: "/work/robot-arm-scene.webp", alt: "The simulated SO-101 arm above a red cube on a checkered floor" },
    ],
  },
  {
    slug: "excel-copilot",
    name: "Excel Copilot",
    field: "TypeScript · LLM tools",
    figure: { value: "120 tests", label: "across 11 files; nothing is written without validation and a confirmed preview" },
    oneLine:
      "An Excel add-in that turns plain-English requests into edits you can preview, apply and undo.",
    problem:
      "Letting an LLM write into a spreadsheet is risky: it can invent cell ranges, break formulas, or overwrite work with no way back.",
    built: [
      "A Zod schema of structured actions that also generates the JSON Schema sent to Claude or Gemini.",
      "Two-layer validation (shape, then meaning: ranges exist, array sizes match, no WEBSERVICE or external links) with one bounded repair retry.",
      "A cell-level before and after diff, applied only on confirmation, with undo that refuses stale previews and warns about later edits.",
      "Pure TypeScript core behind a WorkbookGateway interface, so the same logic runs in Excel and in a browser demo.",
    ],
    result: [
      "120 tests across 11 files, including a test that fails if the core imports Excel, React or the DOM.",
      "Nothing is written unless validation passes and the user confirms the preview.",
    ],
    stack: ["TypeScript", "React 19", "Office.js", "Zod", "Claude API", "Gemini API", "Vite", "Vitest"],
    links: [{ label: "Code on GitHub", href: `${GH}/excel-copilot` }],
    media: [],
    chart: {
      kind: "steps",
      caption: "What happens between a request and a changed cell",
      steps: ["Plain-English request", "Check the shape", "Check the meaning", "Preview the cell diff", "You confirm", "Apply, with undo"],
    },
  },
];

export const coursework: SecondaryProject[] = [
  {
    slug: "kambaz",
    name: "Kambaz LMS",
    course: "CS 5610 Web Development",
    oneLine:
      "A Canvas-style learning management system: courses, modules, assignments and enrollments, with editing tools for faculty.",
    // My individual CS 5610 build (kambaz-next-js + kambaz-node-server-app), not the team fork.
    highlight:
      "Next.js and Redux frontend talking to my own Express and MongoDB API with cookie sessions. Northeastern, Fall 2025.",
    stack: ["Next.js 15", "React 19", "TypeScript", "Redux Toolkit", "Express 5", "MongoDB", "Mongoose"],
    links: [
      { label: "Live site", href: "https://kambaz-next-js-navy-sigma.vercel.app" },
      { label: "Frontend code", href: `${GH}/kambaz-next-js` },
      { label: "API code", href: `${GH}/kambaz-node-server-app` },
      { label: "Team final: frontend", href: `${GH}/kambaz-lms-web` },
      { label: "Team final: API", href: `${GH}/kambaz-lms-api` },
    ],
  },
  {
    slug: "calendar",
    name: "Calendar Management Application",
    // Course number not found in the repos or resume, so only the name is shown.
    course: "Programming Design Paradigms",
    oneLine:
      "A Java calendar with GUI, command-line and headless scripting modes driven by one shared controller.",
    highlight:
      "94% JUnit branch coverage, validated with Pitest mutation testing across recurrence, conflict detection and time zones.",
    stack: ["Java", "Swing", "JUnit", "Pitest", "Gradle"],
    links: [],
    note: "Team project. Code available on request.",
  },
];

// Earlier work: the SRM project goes first once its details arrive. Leave it null until then;
// the page shows nothing for an empty slot.
export const srmProject: SecondaryProject | null = null;

/** Projects with a measured result, shown as small plates before the gazetteer list. */
export const earlierWork: SecondaryProject[] = [
  {
    slug: "doc-intelligence-chatbot",
    name: "Document Intelligence Chatbot",
    oneLine:
      "A local RAG chatbot for PDFs that cites file, page and position, and says so when it does not know.",
    highlight:
      "Hybrid BM25 and bge-small retrieval raised MRR@10 from 0.57 to 0.80 and Hit@1 from 0.42 to 0.71 on 60 hand-labelled questions over FDA drug labels.",
    stack: ["PyMuPDF", "Tesseract OCR", "sentence-transformers", "BM25", "FAISS", "Gemini", "pytest"],
    links: [{ label: "Code on GitHub", href: `${GH}/doc-intelligence-chatbot` }],
  },
];

/** Unfinished projects: one line each, no plate until they have measured results. */
export const inProgress: { name: string; oneLine: string; href: string }[] = [
  {
    name: "ImpactLens",
    oneLine: "Flood and crop impact from before and after Sentinel-2 imagery, rebuilding my aerial internship work on public data.",
    href: `${GH}/impactlens`,
  },
];

export const otherWork: ListedProject[] = [
  {
    name: "Facial expression recognition",
    oneLine: "Soft labels from 10 annotators matched hard-label accuracy (82.5 to 82.9%) and cut KL divergence to human votes by 59 to 78%.",
    stack: ["PyTorch", "ResNet18", "OpenCV"],
    href: `${GH}/facial-expression-recognition`,
  },
  {
    name: "LexIntake on AWS",
    oneLine: "LexIntake rebuilt event-driven on AWS (S3, EventBridge, Step Functions, Lambda, all Terraform), pausing for a person when needed; a clean NDA auto-approves in about 21 seconds.",
    stack: ["Step Functions", "Lambda", "Terraform"],
    href: `${GH}/lexintake-aws`,
  },
  {
    name: "Bioreactor batch monitor",
    oneLine: "SPC limits and PCA Hotelling's T² on simulated bioreactor batches: 3 of 3 injected faults caught, with 95.8% of alarms real.",
    stack: ["Python", "SQLite", "scikit-learn"],
    href: `${GH}/bioreactor-batch-monitor`,
  },
  {
    name: "Racket IMU motion inference",
    oneLine: "Stroke type from one racket sensor at 0.798 macro-F1 on unseen players; the models read racket angle, not the swing.",
    stack: ["scikit-learn", "PyTorch", "pandas"],
    href: `${GH}/racket-imu-motion-inference`,
  },
  {
    name: "Robot navigation lab",
    oneLine: "A* and RRT planning with a 400-particle filter and simulated lidar, live in the browser.",
    stack: ["FastAPI", "NumPy", "React"],
    href: `${GH}/robot-navigation-lab`,
  },
  {
    name: "Pet insurance forecaster",
    oneLine: "Credibility-weighted loss-ratio projections on synthetic data; back-test WAPE 21.4% against 26.6% for the benchmark.",
    stack: ["pandas", "pandera", "FastAPI", "React", "Prefect"],
    href: `${GH}/pet-insurance-forecaster`,
  },
  {
    name: "Adaptive nutrition coach",
    oneLine: "A PWA that re-estimates energy expenditure weekly from logged food and the weight trend, with LLM food logging.",
    stack: ["FastAPI", "React", "SQLite", "Gemini"],
    href: `${GH}/adaptive-nutrition-coach`,
  },
  {
    name: "MBTA MCP server",
    oneLine: "Live Boston transit departures and alerts for Claude through the Model Context Protocol.",
    stack: ["Python", "MCP", "httpx"],
    href: `${GH}/mbta-mcp-server`,
  },
  {
    name: "Desktop kitten",
    oneLine: "Pixel-art kittens that walk on top of macOS windows, controlled by offline voice commands.",
    stack: ["Python", "Qt", "Vosk"],
    href: `${GH}/desktop-kitten`,
  },
  {
    name: "Event timeline assistant",
    oneLine: "A REST API over simulated equipment events with a Gemini summary whose cited event IDs are checked in code.",
    stack: ["TypeScript", "Express", "SQLite"],
    href: `${GH}/event-timeline-assistant`,
  },
  {
    name: "Portfolio analyzer",
    oneLine: "A Streamlit dashboard for annualized return, volatility, Sharpe ratio and correlations.",
    stack: ["Python", "Streamlit", "yfinance"],
    href: `${GH}/portfolio-analyzer`,
  },
  {
    name: "MLOps labs",
    oneLine: "Lab work for Machine Learning Operations at Northeastern: testing and CI with GitHub Actions.",
    stack: ["Python", "GitHub Actions"],
    href: `${GH}/mlops`,
  },
];

export const skills = [
  { group: "Generative AI and LLMs", items: ["RAG pipelines", "LoRA, QLoRA, PEFT", "LangChain", "LangGraph", "Agentic workflows", "Prompt engineering"] },
  { group: "Machine learning and data", items: ["PyTorch", "TensorFlow", "scikit-learn", "Hugging Face Transformers", "FAISS", "Pinecone", "OpenCV", "pandas"] },
  { group: "Backend and full stack", items: ["Python", "Java", "C", "C++", "SQL", "FastAPI", "Flask", "Node.js", "Express", "React", "MongoDB"] },
  { group: "Cloud", items: ["AWS Bedrock", "SageMaker", "Textract", "Lambda", "S3", "SQS", "Step Functions", "Docker"] },
];

export const certifications = ["AWS Cloud Foundations", "AWS Machine Learning Foundations", "Cisco Networking Essentials"];

export const contact = {
  email: "bondalapati.b@northeastern.edu",
  links: [
    { label: "LinkedIn", href: "https://linkedin.com/in/bhavishya-bondalapati" },
    { label: "GitHub", href: GH },
  ] satisfies Link[],
  // Phone number is deliberately not included.
};

// Words for the survey framing and the optional 3D flyover.
export const survey = {
  invite: {
    button: "Fly the survey",
    tag: "3D",
    title: "Want to see this as a map?",
    text: "Fly the route from Chennai to Boston over 3D terrain, with each stop opening its section. Interactive 3D, about a minute; best on a recent laptop or desktop.",
  },
  backLabel: "Back to the plain site",
  // Words inside the 3D flyover.
  flight: {
    title: "The survey, flown",
    subtitle: "A drone flies from Chennai to Boston in the order it happened, and its scan reveals the land",
    hint: "Scroll to fly; the down arrow jumps to the next stop",
    next: "Next stop",
    previous: "Back to the start",
    loading: "Loading terrain",
    preparing: "Preparing the scene",
    locked: "Landmark locked",
    inset: "India leg",
    insetWorld: "To Boston",
    exaggeration: "Vertical exaggeration ×12",
    credit: "Terrain: NOAA NCEI, ETOPO 2022 15 Arc-Second Global Relief Model, doi:10.25921/fd45-gt74",
    imageryCredit: "Imagery: NASA Blue Marble Next Generation (NASA Earth Observatory), via NASA GIBS",
    failed: "The 3D view could not start on this device.",
  },
  // The map legend on the first screen.
  legend: [
    { key: "Station", value: "Boston, MA" },
    { key: "Degree", value: "MS Computer Science, Northeastern" },
    { key: "GPA", value: "3.9" },
    { key: "Complete", value: "May 2027" },
    { key: "Seeking", value: "ML systems · Backend · Full\u2011stack" },
    { key: "Status", value: "Open to roles" },
  ],
  revised: "Oct 2026",
};

/**
 * The flyover route, in the order it happened. Fun mode flies these in sequence;
 * the plain site lists sections by importance instead.
 */
export const route = [
  { id: "chennai", place: "Chennai", region: "Tamil Nadu", country: "India", what: "SRM Institute of Science and Technology", when: "B.Tech, 2021 to Jan. 2025", coords: { lat: 12.8231, lon: 80.0442 } },
  { id: "hyderabad", place: "Hyderabad", region: "Telangana", country: "India", what: "Mouri Tech", when: "Sept. to Oct. 2024", coords: { lat: 17.385, lon: 78.4867 } },
  { id: "ongole", place: "Ongole", region: "Andhra Pradesh", country: "India", what: "JC Biotech", when: "Nov. 2024 to Jun. 2025", coords: { lat: 15.5057, lon: 80.0499 } },
  { id: "boston", place: "Boston", region: "Massachusetts", country: "USA", what: "Northeastern University", when: "MS, Fall 2025 to May 2027", coords: { lat: 42.3398, lon: -71.0892 } },
] satisfies { id: string; place: string; region: string; country: string; what: string; when: string; coords: Coords }[];
