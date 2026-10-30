// All text, numbers, links and tech stacks for the site live in this one file.
// Components only read from it, so editing content never means touching layout code.
//
// Sources: the README of each repo in ~/projects, ~/projects/project-notes/*/01-overview.md,
// and the resume (Burnes_Center/burnesresume.pdf). Every number below appears in one of those.
// Items marked "CONFIRM" disagree between sources or are missing; see docs/phase-0-content-notes.md.

export type Link = { label: string; href: string };

export type Experience = {
  company: string;
  role: string;
  place: string;
  dates: string;
  summary: string;
  points: string[];
  stack: string[];
};

export type FeaturedProject = {
  slug: string;
  name: string;
  oneLine: string;
  problem: string;
  built: string[];
  result: string[];
  stack: string[];
  links: Link[];
  // The project's own picture or clip, copied from its repo during the build.
  media: { src: string; alt: string; kind: "image" | "video"; poster?: string }[];
};

export type SecondaryProject = {
  slug: string;
  name: string;
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
  location: "Boston, MA",
};

export const education = [
  {
    school: "Northeastern University",
    place: "Boston, MA",
    degree: "Master of Science in Computer Science",
    gpa: "3.9",
    // CONFIRM: the brief says May 2027, the resume says Dec. 2027 (expected).
    dates: "Expected May 2027",
  },
  {
    school: "SRM Institute of Science and Technology",
    place: "Chennai, India",
    degree: "Bachelor of Technology in Computer Science and Engineering (AI and ML)",
    gpa: "3.64",
    dates: "Jan. 2025",
  },
];

export const experience: Experience[] = [
  {
    company: "JC Biotech Pvt. Ltd.",
    role: "Automation and AI Systems Intern",
    place: "Andhra Pradesh, India",
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
      {
        src: "/work/aerial-godavari-ndvi.png",
        alt: "Godavari delta from Sentinel-2: vegetation index before, after, and the flagged loss areas",
        kind: "image",
      },
    ],
  },
  {
    slug: "llm-gateway",
    name: "LLM Gateway",
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
  },
  {
    slug: "robot-arm-sim",
    name: "Robot Arm Simulation",
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
      {
        src: "/work/robot-arm-policy.mp4",
        poster: "/work/robot-arm-scene.png",
        alt: "The simulated SO-101 arm picking up a cube and placing it on a target, driven by the learned policy",
        kind: "video",
      },
    ],
  },
  {
    slug: "excel-copilot",
    name: "Excel Copilot",
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
  },
];

export const secondary: SecondaryProject[] = [
  {
    slug: "kambaz",
    name: "Kambaz LMS",
    oneLine:
      "A Canvas-style learning management system: courses, modules, enrollments and timed quizzes that grade themselves.",
    // CONFIRM: the resume says "independently", JWT auth, a 12+ workflow Selenium suite and 7+ collections.
    // The repos say team project, session cookies (express-session), Vitest and node:test. Using the repo version.
    highlight: "Team final project for CS 5610 Web Development at Northeastern, Fall 2025. Live on Vercel.",
    stack: ["Next.js 15", "React 19", "Redux Toolkit", "Express 5", "MongoDB", "Mongoose"],
    links: [
      { label: "Live site", href: "https://kambaz-next-js-eight-theta.vercel.app" },
      { label: "Frontend code", href: `${GH}/kambaz-lms-web` },
      { label: "API code", href: `${GH}/kambaz-lms-api` },
    ],
  },
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
  {
    slug: "calendar",
    name: "Calendar Management Application",
    oneLine:
      "A Java calendar with GUI, command-line and headless scripting modes driven by one shared controller.",
    highlight:
      "94% JUnit branch coverage, validated with Pitest mutation testing across recurrence, conflict detection and time zones.",
    stack: ["Java", "Swing", "JUnit", "Pitest", "Gradle"],
    // CONFIRM: no repo found in ~/projects or on GitHub. Is there a public link?
    links: [],
    note: "Course project; code not public.",
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
    name: "Bioreactor batch monitor",
    oneLine: "SPC control limits and PCA Hotelling's T² on simulated bioreactor batches, scored against injected faults.",
    stack: ["Python", "SQLite", "scikit-learn"],
    href: `${GH}/bioreactor-batch-monitor`,
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
