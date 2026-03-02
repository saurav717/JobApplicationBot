# ApplyBot - Agentic Job Application UI
## Comprehensive Prompt for LLM Recreation

---

## OVERVIEW

Create a React application for an agentic job application software called "ApplyBot". This app allows users to:
1. Upload their resume once
2. Browse companies and job listings with AI-calculated relevancy scores
3. Preview auto-filled application forms
4. Queue jobs for automated application submission

The app has two main views: a Landing Page and a Job Browser.

**Tech Stack:**
- React (functional components with hooks)
- Tailwind CSS for styling
- Lucide React for icons

**Required Lucide Icons:**
```javascript
import { 
  Briefcase, ChevronRight, ChevronDown, ChevronUp, Check, X, Upload, 
  Sparkles, Zap, Shield, ArrowRight, Building2, MapPin, Clock, 
  TrendingUp, Filter, Search, User, Mail, Phone, FileText, 
  GraduationCap, Link2, Linkedin, Github, Bot, CheckCircle2, 
  AlertCircle, Loader2, Globe, Calendar, Cpu, SlidersHorizontal 
} from 'lucide-react';
```

---

## DESIGN SYSTEM

### Color Palette
```
Primary Background: slate-950, indigo-950
Panel Backgrounds: slate-900, slate-800 (with /50, /30 opacity variants)
Borders: slate-800, slate-700 (with /50 opacity)

Accent Colors:
- Primary: indigo-500, indigo-600
- Secondary: purple-500, purple-600
- Success/Selected: teal-500, emerald-500
- Warning/Partial: amber-500, orange-500
- Text Primary: white
- Text Secondary: slate-400, slate-500
- Text Muted: slate-600
```

### Gradients
```css
/* Background gradient */
bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950

/* Button gradients */
bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600
bg-gradient-to-r from-indigo-600 to-purple-600

/* Text gradients */
bg-gradient-to-r from-indigo-400 via-purple-400 to-teal-400 bg-clip-text text-transparent

/* Relevancy score gradients */
90%+: from-emerald-400 to-teal-500
80-89%: from-blue-400 to-cyan-500
70-79%: from-amber-400 to-orange-500
Below 70%: from-slate-400 to-gray-500
```

### Border Radius
- Small elements: rounded-lg, rounded-xl
- Cards/Panels: rounded-2xl
- Large containers: rounded-3xl

### Effects
```css
/* Glassmorphism */
bg-slate-900/80 backdrop-blur-xl

/* Shadows */
shadow-lg shadow-indigo-500/20
shadow-xl shadow-indigo-500/30

/* Transitions */
transition-all duration-300
```

### Custom Scrollbar CSS
```css
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(100, 116, 139, 0.1);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(100, 116, 139, 0.3);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.5);
}
```

### Custom Animations
```css
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}
.animate-float {
  animation: float 6s ease-in-out infinite;
}
```

---

## STATE MANAGEMENT

```javascript
// View state
const [currentView, setCurrentView] = useState('landing'); // 'landing' or 'browser'

// Data states
const [companies, setCompanies] = useState(mockCompanies);
const [selectedCompany, setSelectedCompany] = useState(null);
const [selectedJob, setSelectedJob] = useState(null);
const [selectedJobs, setSelectedJobs] = useState({}); // { jobId: boolean }
const [expandedJobs, setExpandedJobs] = useState({}); // { jobId: boolean }

// Filter states
const [searchQuery, setSearchQuery] = useState('');
const [showOnlySelected, setShowOnlySelected] = useState(false);
const [showFilters, setShowFilters] = useState(true);
const [selectedLLM, setSelectedLLM] = useState('claude-sonnet');
const [selectedContinents, setSelectedContinents] = useState(['north-america']);
const [selectedCountries, setSelectedCountries] = useState(['usa', 'canada']);
const [expandedContinents, setExpandedContinents] = useState({});
const [postedWithin, setPostedWithin] = useState('30');

// Application form state
const [fillingStatus, setFillingStatus] = useState('idle'); // 'idle', 'filling', 'complete'
```

---

## MOCK DATA STRUCTURES

### Companies Array
```javascript
const mockCompanies = [
  {
    id: 1,
    name: 'Stripe',
    logo: 'https://logo.clearbit.com/stripe.com',
    industry: 'Fintech',
    location: 'San Francisco, CA',
    openRoles: 12,
    selected: true,
    accountRequired: true, // Shows "LOGIN" badge
    color: '#635BFF',
    jobs: [
      { 
        id: 101, 
        title: 'Senior Machine Learning Engineer', 
        location: 'San Francisco, CA', 
        type: 'Full-time', 
        posted: '2 days ago', 
        relevancy: 96, // Percentage match score
        salary: '$180k - $250k', 
        department: 'Engineering',
        description: `About the Role
We're looking for a Senior Machine Learning Engineer...

What You'll Do
• Design, develop, and deploy machine learning models...
• Build real-time ML inference systems...

Requirements
• 5+ years of experience in machine learning...
• Strong programming skills in Python...

Nice to Have
• Experience with real-time streaming systems...`
      },
      // More jobs...
    ]
  },
  // More companies: Coinbase, Palantir, Plaid, Datadog, Block (Square)
];
```

### User Profile (for auto-fill)
```javascript
const userProfile = {
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
  summary: 'Senior Data Scientist with 5+ years of experience...',
  workAuth: 'US Citizen',
  willingToRelocate: true,
  preferredLocations: ['San Francisco, CA', 'New York, NY', 'Remote'],
  salaryExpectation: '$180,000 - $220,000',
};
```

### Filter Options
```javascript
const llmOptions = [
  { id: 'claude-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Best balance of speed & quality' },
  { id: 'claude-opus', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Most capable, slower' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Fast multimodal model' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', description: 'High capability' },
  { id: 'gemini-pro', name: 'Gemini 1.5 Pro', provider: 'Google', description: 'Long context window' },
];

const continentData = [
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

const timeOptions = [
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '60', label: 'Last 60 days' },
  { value: 'all', label: 'All time' },
];
```

---

## VIEW 1: LANDING PAGE

### Structure
```
┌─────────────────────────────────────────────────────────┐
│ NAV: Logo | Links | Sign In Button                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              [Badge: Autonomous Job Apps]               │
│                                                         │
│              Your AI Agent                              │
│         Applies While You Sleep                         │
│                                                         │
│              (subheadline text)                         │
│                                                         │
│        [Start Applying]  [Watch Demo]                   │
│                                                         │
│           Works with: [logos] +2000 more                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │
│  │Feature 1│  │Feature 2│  │Feature 3│                 │
│  └─────────┘  └─────────┘  └─────────┘                 │
├─────────────────────────────────────────────────────────┤
│         How It Works: 01 → 02 → 03 → 04                │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐               │
│  │     Final CTA with gradient border  │               │
│  └─────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

### Background Effects
- Fixed position, pointer-events-none
- Multiple blurred gradient orbs with animate-pulse
- Floating small circles with animate-float (staggered delays)
- Dot grid pattern overlay (radial-gradient)

### Navigation
- Flex container with justify-between
- Logo: 44px gradient rounded-2xl box with Bot icon
- Brand name with gradient text
- Links: Features, How it Works (text-white/50)
- Sign In: glass button with border

### Hero Section
- Badge: Rounded-full pill with Sparkles icon, gradient bg
- H1: Two lines, second line with gradient text
- Paragraph: text-xl text-slate-400, max-w-2xl
- Buttons: Primary gradient with shadow, secondary outline
- Company logos: grayscale, 32px

### Features Grid
- 3-column grid, gap-8
- Each card:
  - p-8 rounded-3xl
  - bg-slate-900/50 border border-slate-800
  - Icon box: 64px rounded-2xl with gradient bg
  - Title: text-xl font-bold
  - Description: text-slate-400

### How It Works
- 4-column grid
- Each step card with:
  - Icon box (48px)
  - Large faded step number (text-4xl text-slate-800)
  - Title and description
  - Chevron arrows between cards (except last)

### Final CTA
- Wrapper: gradient border using padding trick (p-[2px])
- Inner: bg-slate-950 rounded-3xl
- Large Bot icon centered
- Headline, description, gradient button

---

## VIEW 2: JOB BROWSER

### Overall Layout
```
┌─────────────────────────────────────────────────────────┐
│ HEADER (sticky top, z-30, bg-slate-950/95)              │
├─────────────────────────────────────────────────────────┤
│ FILTER PANEL (collapsible, z-20, border-b)              │
├──────────┬──────────┬───────────────────────────────────┤
│ COMPANIES│  JOBS    │  APPLICATION FORM                 │
│  PANEL   │  PANEL   │  (flex-1)                         │
│ (280-360)│(320-400) │                                   │
│  z-10    │  z-10    │  z-10                             │
│ overflow │ overflow │  overflow-hidden                  │
│ -y-auto  │ -y-auto  │                                   │
└──────────┴──────────┴───────────────────────────────────┘
```

### Important Layout Rules
1. Main container: `flex flex-col min-h-screen`
2. Header: `flex-shrink-0 sticky top-0 z-30`
3. Filter panel: `flex-shrink-0 z-20`
4. Content area: `flex flex-1 overflow-hidden`
5. Each panel: `flex flex-col overflow-hidden`
6. Panel headers: `flex-shrink-0`
7. Panel content: `flex-1 overflow-y-auto custom-scrollbar`

### Header
```
[Logo] ApplyBot | Job Browser    [Filters] [X companies | Y jobs] [Apply to Selected]
```
- Logo clickable to return to landing
- Filters toggle button with SlidersHorizontal icon
- Stats in rounded container
- Apply button with gradient

### Filter Panel

**Layout:** Horizontal flex with gap-6

**1. LLM Selection (flex-shrink-0, w-[220px])**
- Label with Cpu icon
- Custom styled select dropdown
- Description text below

**2. Posted Within (flex-shrink-0, w-[160px])**
- Label with Calendar icon
- Select dropdown

**3. Location Filter (flex-1)**
- Label with Globe icon
- Horizontal flex-wrap of continent buttons
- Each continent: split button design
  - Left: click to select/deselect all countries
  - Right: chevron to expand country dropdown
- Country dropdown: absolute positioned, z-50
- States:
  - All selected: indigo bg, checkmark
  - Partial: amber bg, ◐ symbol
  - None: slate bg

**4. Rescore Button (flex-shrink-0)**
- Gradient button with Sparkles icon

### Companies Panel (Left)

**Width:** 280px when job selected, 360px otherwise

**Search Section (flex-shrink-0):**
- Search input with Search icon
- "Selected" filter toggle button
- Company count

**Company List (flex-1 overflow-y-auto):**
Each company card:
```
┌──────────────────────────────────┐
│ [Logo 40px]  Company Name    [✓]│
│              Industry            │
│ X roles                  [LOGIN] │
└──────────────────────────────────┘
```
- Click card: select company, show jobs
- Click checkbox: toggle company selection (stops propagation)
- Selected state: gradient bg with indigo border
- LOGIN badge: amber bg when accountRequired=true

### Jobs Panel (Middle)

**Width:** 320px when job selected, 400px otherwise

**Header (flex-shrink-0):**
- Company logo and name
- Job count
- "Sorted by relevancy" indicator

**Jobs List (flex-1 overflow-y-auto):**
Each job card:
```
┌────────────────────────────────────┐
│ Job Title                    [96%]│
│ 📍 Location                        │
│ $180k-$250k  [Expand JD ▼] [📋]   │
├────────────────────────────────────┤
│ (Expanded JD content when open)   │
│ Posted X ago • Full-time • Dept   │
│ ┌──────────────────────────────┐  │
│ │ Full job description text    │  │
│ │ with scrolling...            │  │
│ └──────────────────────────────┘  │
│ [View Application Form] [Select]  │
└────────────────────────────────────┘
```

**Relevancy Badge Colors:**
- 90%+: emerald/teal gradient
- 80-89%: blue/cyan gradient
- 70-79%: amber/orange gradient
- Below: slate/gray gradient

**Expand JD Button:**
- Toggle button showing "Expand JD ▼" or "Collapse ▲"
- When expanded:
  - Show metadata row (posted, type, department)
  - Job description in scrollable container (max-h-[300px])
  - Action buttons

### Application Form Panel (Right)

**Takes remaining space (flex-1)**

**Header (flex-shrink-0):**
- Company logo + name + department badge
- Job title (text-2xl font-bold)
- Metadata: location, type, posted date, salary
- Close button (X)

**AI Status Bar (flex-shrink-0):**
Three states:
1. `idle`: Bot icon, "Ready to auto-fill", slate bg
2. `filling`: Loader2 spinning, "AI is filling...", indigo bg
3. `complete`: CheckCircle2, "Application auto-filled", teal bg

**Job Description Toggle (flex-shrink-0):**
- Collapsible section with FileText icon
- "Show/Hide full JD" toggle
- When expanded: scrollable JD container

**Application Form (flex-1 overflow-y-auto):**

Sections with icons and completion checkmarks:
1. **Personal Information** (User icon, indigo)
   - First Name, Last Name
   - Email, Phone
   - Location, LinkedIn

2. **Professional Links** (Link2 icon, purple)
   - GitHub, Portfolio

3. **Experience** (Briefcase icon, amber)
   - Current Title, Company
   - Years of Experience, Salary Expectation

4. **Education** (GraduationCap icon, teal)
   - Degree (full width)
   - University, Graduation Year

5. **Documents** (FileText icon, rose)
   - Resume card (dashed border)
   - Cover Letter card (AI-generated)

6. **Professional Summary** (Bot icon, indigo)
   - "AI-Tailored" badge
   - Summary text area

7. **Additional Questions** (AlertCircle icon, amber)
   - Work Authorization
   - Willing to Relocate
   - Preferred Locations

**Form Field Component:**
```javascript
function FormField({ label, value, icon, filled, className = '' }) {
  // Shows label above
  // Rounded container with border
  // Icon on left if provided
  // Value or "..." placeholder
  // Checkmark on right when filled
  // Border/bg changes: slate when empty, teal when filled
}
```

**Submit Section:**
- Border-top separator
- Flex row with gap-4
- Primary button: "Add to Apply Queue" or "✓ Added to Queue"
- Secondary button: "Edit Fields"

### Empty States

**No company selected:**
- Centered content
- Building2 icon in rounded container
- "Select a Company" heading
- Description text

**Company selected, no job:**
- Briefcase icon
- "Select a Role" heading
- Description text

---

## KEY INTERACTIONS

### Company Selection
```javascript
const toggleCompanySelection = (companyId) => {
  setCompanies(prev => prev.map(c => 
    c.id === companyId ? { ...c, selected: !c.selected } : c
  ));
};
```

### Job Selection
```javascript
const toggleJobSelection = (jobId) => {
  setSelectedJobs(prev => ({
    ...prev,
    [jobId]: !prev[jobId]
  }));
};
```

### Opening a Job (triggers AI fill animation)
```javascript
const handleJobClick = (job, company) => {
  setSelectedJob({ ...job, company });
  setFillingStatus('filling');
  setTimeout(() => {
    setFillingStatus('complete');
  }, 2000);
};
```

### Job Description Expand
```javascript
const toggleJobExpand = (jobId, e) => {
  e.stopPropagation(); // Prevent triggering job click
  setExpandedJobs(prev => ({
    ...prev,
    [jobId]: !prev[jobId]
  }));
};
```

### Continent/Country Selection
```javascript
const toggleContinent = (continentId) => {
  const continent = continentData.find(c => c.id === continentId);
  const countryIds = continent.countries.map(c => c.id);
  
  if (selectedContinents.includes(continentId)) {
    // Remove continent and all its countries
    setSelectedContinents(prev => prev.filter(id => id !== continentId));
    setSelectedCountries(prev => prev.filter(id => !countryIds.includes(id)));
  } else {
    // Add continent and all its countries
    setSelectedContinents(prev => [...prev, continentId]);
    setSelectedCountries(prev => [...new Set([...prev, ...countryIds])]);
  }
};

const toggleCountry = (countryId, continentId) => {
  // Toggle individual country
  // Update continent state based on if all/some/none selected
};
```

### Click Outside to Close Dropdowns
```javascript
useEffect(() => {
  const handleClickOutside = (e) => {
    if (!e.target.closest('.continent-dropdown')) {
      setExpandedContinents({});
    }
  };
  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, []);
```

---

## RESPONSIVE BEHAVIOR

### Panel Width Transitions
- When `selectedJob` exists:
  - Companies panel: 280px
  - Jobs panel: 320px
  - Form panel: remaining space
- When no job selected:
  - Companies panel: 360px
  - Jobs panel: 400px
  - Form panel: empty state

### Transitions
```css
transition-all duration-300
```

---

## Z-INDEX LAYERING

```
z-0:  Background effects (fixed, pointer-events-none)
z-10: Content panels (companies, jobs, form)
z-20: Filter panel
z-30: Header
z-50: Dropdown menus (continent country lists)
```

---

## ACCESSIBILITY CONSIDERATIONS

- All interactive elements are buttons or have proper roles
- Focus states with outline-none focus:border-indigo-500/50
- Proper contrast ratios (white/slate text on dark backgrounds)
- Click handlers on appropriate elements
- stopPropagation where needed to prevent unwanted parent triggers

---

## SAMPLE COMPANIES DATA

Include at least 6 companies with realistic data:
1. **Stripe** - Fintech, San Francisco, requires login
2. **Coinbase** - Crypto/Fintech, Remote-first, requires login
3. **Palantir** - Data Analytics, Denver, requires login
4. **Plaid** - Fintech, San Francisco, no login required
5. **Datadog** - Observability, New York, requires login
6. **Block (Square)** - Fintech, San Francisco, requires login

Each with 2-4 jobs including full descriptions with:
- About the Role section
- What You'll Do (bullet points)
- Requirements (bullet points)
- Nice to Have (bullet points)

---

## FINAL NOTES

1. **Single File**: Export everything as a single React component with the FormField helper component at the bottom

2. **No External Dependencies** beyond React, Tailwind, and Lucide

3. **Working Interactions**: All clicks, toggles, and state changes should work

4. **Smooth Animations**: Use Tailwind transitions throughout

5. **Proper Overflow Handling**: Prevent content bleeding between panels

6. **Mock Data**: Include realistic job descriptions relevant to ML/Data Science roles

7. **Logo URLs**: Use Clearbit for company logos: `https://logo.clearbit.com/{domain}`