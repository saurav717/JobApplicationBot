export const mockCompanies = [
    {
        id: 1,
        name: 'Stripe',
        logo: 'https://logo.clearbit.com/stripe.com',
        industry: 'Fintech',
        location: 'San Francisco, CA',
        openRoles: 12,
        selected: true,
        accountRequired: true,
        color: '#635BFF',
        jobs: [
            {
                id: 101,
                title: 'Senior Machine Learning Engineer',
                location: 'San Francisco, CA',
                type: 'Full-time',
                posted: '2 days ago',
                relevancy: 96,
                salary: '$180k - $250k',
                department: 'Engineering',
                description: `About the Role\nWe're looking for a Senior Machine Learning Engineer to join our Risk & Identity team at Stripe. You'll build ML systems that protect millions of businesses from fraud while enabling legitimate transactions.\n\nWhat You'll Do\n• Design, develop, and deploy machine learning models for real-time fraud detection\n• Build real-time ML inference systems processing millions of transactions per second\n• Collaborate with product and engineering teams to define ML-powered features\n• Develop monitoring and alerting systems for model performance\n• Mentor junior engineers and contribute to technical strategy\n\nRequirements\n• 5+ years of experience in machine learning or related field\n• Strong programming skills in Python, with experience in TensorFlow or PyTorch\n• Experience building and deploying ML models in production environments\n• Strong understanding of statistical modeling and machine learning algorithms\n• MS or PhD in Computer Science, Machine Learning, or related field\n\nNice to Have\n• Experience with real-time streaming systems (Kafka, Flink)\n• Knowledge of financial systems and payment processing\n• Experience with large-scale distributed systems\n• Publications in top ML conferences`
            },
            {
                id: 102,
                title: 'Data Scientist - Revenue Optimization',
                location: 'Remote (US)',
                type: 'Full-time',
                posted: '5 days ago',
                relevancy: 88,
                salary: '$160k - $220k',
                department: 'Data Science',
                description: `About the Role\nJoin Stripe's Revenue Optimization team to build data-driven solutions that help businesses maximize their revenue through intelligent payment routing and retry strategies.\n\nWhat You'll Do\n• Develop statistical models for payment optimization and revenue recovery\n• Analyze large-scale transaction data to identify patterns and opportunities\n• Build A/B testing frameworks for payment experiments\n• Create dashboards and reports for business stakeholders\n\nRequirements\n• 3+ years of experience in data science or analytics\n• Strong SQL skills and experience with big data tools\n• Proficiency in Python and statistical analysis libraries\n• Experience with causal inference and experimentation\n\nNice to Have\n• Experience in payments or fintech industry\n• Knowledge of Bayesian methods\n• Experience with dbt or similar data transformation tools`
            },
            {
                id: 103,
                title: 'ML Platform Engineer',
                location: 'Seattle, WA',
                type: 'Full-time',
                posted: '1 week ago',
                relevancy: 82,
                salary: '$170k - $240k',
                department: 'Platform',
                description: `About the Role\nBuild the foundational ML infrastructure that powers Stripe's machine learning capabilities.\n\nWhat You'll Do\n• Design and build ML training and serving infrastructure\n• Develop feature stores and model registries\n• Optimize model serving latency and throughput\n• Build tools for ML experiment tracking and reproducibility\n\nRequirements\n• 4+ years of software engineering experience\n• Experience with ML infrastructure (Kubeflow, MLflow, SageMaker)\n• Strong systems programming skills\n• Experience with Kubernetes and cloud platforms\n\nNice to Have\n• Experience with GPU computing and optimization\n• Contributions to open-source ML projects`
            }
        ]
    },
    {
        id: 2,
        name: 'Coinbase',
        logo: 'https://logo.clearbit.com/coinbase.com',
        industry: 'Crypto / Fintech',
        location: 'Remote-first',
        openRoles: 8,
        selected: true,
        accountRequired: true,
        color: '#0052FF',
        jobs: [
            {
                id: 201,
                title: 'Machine Learning Engineer - Fraud Detection',
                location: 'Remote (US)',
                type: 'Full-time',
                posted: '3 days ago',
                relevancy: 94,
                salary: '$175k - $245k',
                department: 'Security Engineering',
                description: `About the Role\nCoinbase is looking for a Machine Learning Engineer to build advanced fraud detection systems for cryptocurrency transactions.\n\nWhat You'll Do\n• Build ML models for detecting fraudulent cryptocurrency transactions\n• Develop real-time scoring systems for transaction risk assessment\n• Design graph-based anomaly detection algorithms\n• Collaborate with compliance and security teams\n\nRequirements\n• 4+ years in machine learning engineering\n• Experience with fraud detection or anomaly detection systems\n• Strong Python skills with deep learning frameworks\n• Experience with graph neural networks is a plus\n\nNice to Have\n• Understanding of blockchain technology and crypto markets\n• Experience with real-time data processing systems\n• Knowledge of regulatory compliance in financial services`
            },
            {
                id: 202,
                title: 'Senior Data Scientist - Trading Analytics',
                location: 'New York, NY',
                type: 'Full-time',
                posted: '1 week ago',
                relevancy: 85,
                salary: '$165k - $230k',
                department: 'Analytics',
                description: `About the Role\nDrive data-driven decision making for Coinbase's trading platform.\n\nWhat You'll Do\n• Analyze trading patterns and market microstructure data\n• Build predictive models for liquidity and price impact\n• Design and analyze A/B tests for trading features\n• Create executive dashboards and automated reports\n\nRequirements\n• 3+ years in data science or quantitative analysis\n• Strong statistics and probability background\n• Experience with Python, SQL, and data visualization tools\n• Understanding of financial markets\n\nNice to Have\n• Experience with cryptocurrency or digital asset markets\n• Knowledge of market making and order book dynamics`
            }
        ]
    },
    {
        id: 3,
        name: 'Palantir',
        logo: 'https://logo.clearbit.com/palantir.com',
        industry: 'Data Analytics',
        location: 'Denver, CO',
        openRoles: 15,
        selected: false,
        accountRequired: true,
        color: '#101113',
        jobs: [
            {
                id: 301,
                title: 'Forward Deployed ML Engineer',
                location: 'Denver, CO',
                type: 'Full-time',
                posted: '4 days ago',
                relevancy: 91,
                salary: '$170k - $240k',
                department: 'Forward Deployed Engineering',
                description: `About the Role\nAs a Forward Deployed ML Engineer, you will work directly with Palantir's most strategic customers to solve their hardest data problems using machine learning.\n\nWhat You'll Do\n• Deploy ML solutions in production environments for government and enterprise clients\n• Build custom NLP and computer vision pipelines\n• Integrate ML models with Palantir Foundry platform\n• Present technical solutions to senior stakeholders\n\nRequirements\n• 3+ years in ML or data science\n• Full-stack development experience\n• Strong communication and client-facing skills\n• US citizenship required for security clearance\n\nNice to Have\n• Experience with geospatial data analysis\n• Knowledge of defense or intelligence domains\n• Experience with large language models`
            },
            {
                id: 302,
                title: 'Research Scientist - NLP',
                location: 'Palo Alto, CA',
                type: 'Full-time',
                posted: '6 days ago',
                relevancy: 78,
                salary: '$190k - $280k',
                department: 'Research',
                description: `About the Role\nPush the boundaries of NLP research and apply cutting-edge techniques to real-world problems.\n\nWhat You'll Do\n• Conduct research in natural language processing and understanding\n• Develop novel architectures for document understanding\n• Publish research findings in top venues\n• Transfer research innovations into production systems\n\nRequirements\n• PhD in NLP, ML, or related field\n• Strong publication record in top conferences (ACL, EMNLP, NeurIPS)\n• Expert-level Python and deep learning skills\n• Experience with transformer architectures\n\nNice to Have\n• Experience with retrieval-augmented generation\n• Knowledge of information extraction systems`
            },
            {
                id: 303,
                title: 'Data Reliability Engineer',
                location: 'New York, NY',
                type: 'Full-time',
                posted: '2 weeks ago',
                relevancy: 65,
                salary: '$150k - $210k',
                department: 'Infrastructure',
                description: `About the Role\nEnsure the reliability and quality of data pipelines that power Palantir's analytics platform.\n\nWhat You'll Do\n• Build monitoring and alerting for data pipelines\n• Develop data quality frameworks and validation tools\n• Optimize pipeline performance and reduce data latency\n• Respond to data incidents and perform root cause analysis\n\nRequirements\n• 3+ years in data engineering or SRE\n• Strong SQL and Python skills\n• Experience with data orchestration tools (Airflow, Dagster)\n• Knowledge of data warehouse architectures\n\nNice to Have\n• Experience with Spark and distributed computing\n• Knowledge of data governance and compliance frameworks`
            }
        ]
    },
    {
        id: 4,
        name: 'Plaid',
        logo: 'https://logo.clearbit.com/plaid.com',
        industry: 'Fintech',
        location: 'San Francisco, CA',
        openRoles: 6,
        selected: false,
        accountRequired: false,
        color: '#00DC6F',
        jobs: [
            {
                id: 401,
                title: 'ML Engineer - Identity Verification',
                location: 'San Francisco, CA',
                type: 'Full-time',
                posted: '1 day ago',
                relevancy: 93,
                salary: '$170k - $235k',
                department: 'Identity',
                description: `About the Role\nBuild ML systems that power Plaid's identity verification products, connecting millions of users to financial services.\n\nWhat You'll Do\n• Develop document verification and facial recognition models\n• Build anti-spoofing and liveness detection systems\n• Optimize models for mobile and edge deployment\n• Ensure fairness and bias mitigation in identity systems\n\nRequirements\n• 4+ years in ML engineering with computer vision focus\n• Experience with document processing and OCR\n• Strong Python and deep learning skills\n• Understanding of identity verification regulations\n\nNice to Have\n• Experience with mobile ML deployment (CoreML, TFLite)\n• Knowledge of privacy-preserving ML techniques`
            },
            {
                id: 402,
                title: 'Senior Data Analyst',
                location: 'Remote (US)',
                type: 'Full-time',
                posted: '3 days ago',
                relevancy: 72,
                salary: '$130k - $175k',
                department: 'Business Intelligence',
                description: `About the Role\nDrive insights and data-driven decisions across Plaid's product and business teams.\n\nWhat You'll Do\n• Build self-service analytics tools and dashboards\n• Conduct deep-dive analyses of product metrics\n• Partner with product managers to define KPIs and success metrics\n• Develop forecasting models for business planning\n\nRequirements\n• 3+ years in data analytics\n• Expert SQL and data visualization skills\n• Experience with Python or R for statistical analysis\n• Strong communication and storytelling abilities\n\nNice to Have\n• Experience in fintech or financial services\n• Knowledge of product analytics and growth frameworks`
            }
        ]
    },
    {
        id: 5,
        name: 'Datadog',
        logo: 'https://logo.clearbit.com/datadoghq.com',
        industry: 'Observability',
        location: 'New York, NY',
        openRoles: 10,
        selected: false,
        accountRequired: true,
        color: '#632CA6',
        jobs: [
            {
                id: 501,
                title: 'ML Engineer - Anomaly Detection',
                location: 'New York, NY',
                type: 'Full-time',
                posted: '2 days ago',
                relevancy: 92,
                salary: '$175k - $250k',
                department: 'Machine Learning',
                description: `About the Role\nBuild intelligent anomaly detection systems that automatically identify issues in customers' infrastructure and applications.\n\nWhat You'll Do\n• Design and implement anomaly detection algorithms for time-series data\n• Build unsupervised learning systems for infrastructure monitoring\n• Develop forecasting models for capacity planning alerts\n• Scale ML systems to handle trillions of data points daily\n\nRequirements\n• 5+ years in ML or statistical modeling\n• Deep expertise in time-series analysis and anomaly detection\n• Experience with streaming data and real-time systems\n• Strong engineering skills in Python and Go\n\nNice to Have\n• Experience with observability or monitoring platforms\n• Knowledge of distributed systems and cloud infrastructure\n• Publications in relevant ML conferences`
            },
            {
                id: 502,
                title: 'Applied Scientist - Log Analytics',
                location: 'Paris, France',
                type: 'Full-time',
                posted: '5 days ago',
                relevancy: 80,
                salary: '€90k - €130k',
                department: 'Research',
                description: `About the Role\nApply ML and NLP techniques to revolutionize how engineers understand and search their log data.\n\nWhat You'll Do\n• Develop log parsing and clustering algorithms\n• Build semantic search capabilities for log data\n• Create automated root cause analysis tools\n• Research novel approaches to log pattern recognition\n\nRequirements\n• PhD or MS in ML/NLP with 2+ years industry experience\n• Experience with text mining and information extraction\n• Strong Python and systems programming skills\n• Familiarity with search engines and information retrieval\n\nNice to Have\n• Experience with LLMs for code and log understanding\n• Knowledge of DevOps and site reliability engineering`
            },
            {
                id: 503,
                title: 'Senior Data Engineer',
                location: 'New York, NY',
                type: 'Full-time',
                posted: '1 week ago',
                relevancy: 68,
                salary: '$160k - $220k',
                department: 'Data Platform',
                description: `About the Role\nBuild and maintain the data infrastructure powering Datadog's analytics and ML systems.\n\nWhat You'll Do\n• Design high-throughput data pipelines for petabyte-scale data\n• Build real-time and batch processing systems\n• Optimize data storage and query performance\n• Develop data quality and governance tools\n\nRequirements\n• 5+ years in data engineering\n• Expert knowledge of Spark, Kafka, and cloud data services\n• Strong SQL and Python/Scala skills\n• Experience with data warehouse design\n\nNice to Have\n• Experience with ClickHouse or similar OLAP databases\n• Knowledge of data mesh architectures`
            }
        ]
    },
    {
        id: 6,
        name: 'Block (Square)',
        logo: 'https://logo.clearbit.com/block.xyz',
        industry: 'Fintech',
        location: 'San Francisco, CA',
        openRoles: 9,
        selected: false,
        accountRequired: true,
        color: '#3E64FF',
        jobs: [
            {
                id: 601,
                title: 'Staff ML Engineer - Risk',
                location: 'San Francisco, CA',
                type: 'Full-time',
                posted: '1 day ago',
                relevancy: 95,
                salary: '$200k - $290k',
                department: 'Risk Engineering',
                description: `About the Role\nLead ML initiatives for Block's risk and compliance platform, protecting sellers and buyers across Square, Cash App, and Afterpay.\n\nWhat You'll Do\n• Architect and build next-generation ML risk models\n• Lead a team of ML engineers working on fraud and credit risk\n• Design real-time feature engineering pipelines\n• Drive ML strategy and roadmap for the risk organization\n\nRequirements\n• 7+ years in ML engineering with 2+ years in tech lead roles\n• Deep expertise in fraud detection and risk modeling\n• Experience scaling ML systems to millions of transactions\n• Strong leadership and mentorship skills\n\nNice to Have\n• Experience in payments, lending, or BNPL industries\n• Knowledge of regulatory requirements (BSA/AML, KYC)\n• Experience with graph-based fraud detection`
            },
            {
                id: 602,
                title: 'Data Scientist - Cash App',
                location: 'Remote (US)',
                type: 'Full-time',
                posted: '4 days ago',
                relevancy: 87,
                salary: '$155k - $215k',
                department: 'Cash App Analytics',
                description: `About the Role\nUse data science to drive growth and engagement for Cash App, one of the most popular financial apps in the US.\n\nWhat You'll Do\n• Build predictive models for user engagement and retention\n• Design and analyze experiments for new product features\n• Develop segmentation models for personalized experiences\n• Create causal inference frameworks for measuring impact\n\nRequirements\n• 3+ years in data science or quantitative analytics\n• Strong experimentation and causal inference skills\n• Proficient in Python, SQL, and statistical modeling\n• Experience with consumer product analytics\n\nNice to Have\n• Experience with mobile app analytics\n• Knowledge of recommendation systems\n• Background in behavioral economics`
            }
        ]
    }
];

export const userProfile = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    phone: '+1 (555) 123-4567',
    linkedin: 'linkedin.com/in/johndoe',
    github: 'github.com/johndoe',
    portfolio: 'johndoe.dev',
    location: 'San Francisco, CA',
    currentTitle: 'Senior Data Scientist',
    currentCompany: 'Tech Corp',
    yearsExperience: '5',
    education: {
        degree: 'Master of Science in Computer Science',
        school: 'Stanford University',
        year: '2020',
        gpa: '3.9'
    },
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL'],
    summary: 'Senior Data Scientist with 5+ years of experience in building and deploying machine learning models for fraud detection, recommendation systems, and NLP applications. Proficient in Python, TensorFlow, PyTorch, and cloud-based ML platforms. Passionate about using AI to solve complex real-world problems at scale.',
    workAuth: 'US Citizen',
    willingToRelocate: true,
    preferredLocations: ['San Francisco, CA', 'New York, NY', 'Remote'],
    salaryExpectation: '$180,000 - $220,000',
};

export const llmOptions = [
    { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'Groq', description: 'Best quality · used for parsing & profiling' },
    { id: 'llama3-8b', name: 'Llama 3 8B', provider: 'Groq', description: 'Fastest · used for reranking & form filling' },
];

export const continentData = [
    {
        id: 'north-america',
        name: 'North America',
        countries: [
            { id: 'usa', name: 'United States' },
            { id: 'canada', name: 'Canada' },
            { id: 'mexico', name: 'Mexico' },
        ]
    },
    {
        id: 'europe',
        name: 'Europe',
        countries: [
            { id: 'uk', name: 'United Kingdom' },
            { id: 'germany', name: 'Germany' },
            { id: 'france', name: 'France' },
            { id: 'netherlands', name: 'Netherlands' },
            { id: 'ireland', name: 'Ireland' },
            { id: 'switzerland', name: 'Switzerland' },
        ]
    },
    {
        id: 'asia',
        name: 'Asia',
        countries: [
            { id: 'singapore', name: 'Singapore' },
            { id: 'japan', name: 'Japan' },
            { id: 'india', name: 'India' },
            { id: 'hong-kong', name: 'Hong Kong' },
            { id: 'uae', name: 'UAE' },
        ]
    },
    {
        id: 'oceania',
        name: 'Oceania',
        countries: [
            { id: 'australia', name: 'Australia' },
            { id: 'new-zealand', name: 'New Zealand' },
        ]
    },
    {
        id: 'south-america',
        name: 'South America',
        countries: [
            { id: 'brazil', name: 'Brazil' },
            { id: 'argentina', name: 'Argentina' },
        ]
    },
];

export const timeOptions = [
    { value: '1', label: 'Last 24 hours' },
    { value: '7', label: 'Last 7 days' },
    { value: '14', label: 'Last 14 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '60', label: 'Last 60 days' },
    { value: 'all', label: 'All time' },
];
