"""
Network & Career — Alumni Directory and Job Board.
Data layer and mock data. API routes are registered in terminal.py (terminal_bp).

TypeScript interfaces (for frontend / API contract):

  AlumniProfile: {
    id: number;
    name: string;
    company: string;
    role: string;
    industry: string;           // IB, PE, HF, Audit, Tech
    location: string;           // NYC, Seoul, HK
    status: 'open_for_coffee' | 'busy' | 'email_me';
    tags: string[];            // e.g. #M&A, #Quant, #CPA
    contactInfo: { email?: string; linkedin?: string };
    graduationYear: number;
    avatarUrl?: string;
    companyLogoUrl?: string;
  }

  JobPosting: {
    id: number;
    title: string;
    company: string;
    type: 'Intern' | 'Full-time';
    deadline: string;          // ISO date
    isReferral: boolean;
    referralAlumniId?: number;
    referralAlumniName?: string;
    link?: string;
    firmType?: 'bulge_bracket' | 'big_4' | 'other';  // for calendar color
    eventType?: string;         // e.g. Resume Drop, Online Test
  }
"""

from datetime import date, timedelta


# ---------------------------------------------------------------------------
# Mock: Alumni profiles
# ---------------------------------------------------------------------------
MOCK_ALUMNI = [
    {
        "id": 1,
        "name": "Jane Park",
        "company": "Goldman Sachs",
        "role": "Analyst, Investment Banking",
        "industry": "IB",
        "location": "NYC",
        "status": "open_for_coffee",
        "tags": ["M&A", "TMT"],
        "contactInfo": {"email": "jane.park@example.com", "linkedin": "https://linkedin.com/in/janepark"},
        "graduationYear": 2022,
        "avatarUrl": None,
        "companyLogoUrl": None,
    },
    {
        "id": 2,
        "name": "David Kim",
        "company": "KKR",
        "role": "Associate, Private Equity",
        "industry": "PE",
        "location": "NYC",
        "status": "email_me",
        "tags": ["LBO", "Due Diligence"],
        "contactInfo": {"email": "david.kim@example.com", "linkedin": "https://linkedin.com/in/davidkim"},
        "graduationYear": 2020,
        "avatarUrl": None,
        "companyLogoUrl": None,
    },
    {
        "id": 3,
        "name": "Sarah Lee",
        "company": "Citadel",
        "role": "Quantitative Researcher",
        "industry": "HF",
        "location": "NYC",
        "status": "busy",
        "tags": ["Quant", "Python"],
        "contactInfo": {"email": "sarah.lee@example.com"},
        "graduationYear": 2021,
        "avatarUrl": None,
        "companyLogoUrl": None,
    },
    {
        "id": 4,
        "name": "Michael Cho",
        "company": "Deloitte",
        "role": "Senior Consultant, Audit",
        "industry": "Audit",
        "location": "Seoul",
        "status": "open_for_coffee",
        "tags": ["CPA", "IFRS"],
        "contactInfo": {"email": "michael.cho@example.com", "linkedin": "https://linkedin.com/in/michaelcho"},
        "graduationYear": 2019,
        "avatarUrl": None,
        "companyLogoUrl": None,
    },
    {
        "id": 5,
        "name": "Emily Zhang",
        "company": "Google",
        "role": "Product Manager",
        "industry": "Tech",
        "location": "NYC",
        "status": "email_me",
        "tags": ["Product", "Growth"],
        "contactInfo": {"email": "emily.zhang@example.com"},
        "graduationYear": 2023,
        "avatarUrl": None,
        "companyLogoUrl": None,
    },
    {
        "id": 6,
        "name": "James Hong",
        "company": "Morgan Stanley",
        "role": "VP, Equity Research",
        "industry": "IB",
        "location": "HK",
        "status": "open_for_coffee",
        "tags": ["Equity Research", "Asia"],
        "contactInfo": {"email": "james.hong@example.com", "linkedin": "https://linkedin.com/in/jameshong"},
        "graduationYear": 2018,
        "avatarUrl": None,
        "companyLogoUrl": None,
    },
]


# ---------------------------------------------------------------------------
# Mock: Job postings (with deadlines and referral flag)
# ---------------------------------------------------------------------------
def _job_date(offset_days):
    d = date.today() + timedelta(days=offset_days)
    return d.isoformat()


MOCK_JOBS = [
    {
        "id": 1,
        "title": "Investment Banking Summer Analyst",
        "company": "Goldman Sachs",
        "type": "Intern",
        "deadline": _job_date(14),
        "isReferral": True,
        "referralAlumniId": 1,
        "referralAlumniName": "Jane Park",
        "link": "https://example.com/apply/gs",
        "firmType": "bulge_bracket",
        "eventType": "Resume Drop",
    },
    {
        "id": 2,
        "title": "Private Equity Associate",
        "company": "KKR",
        "type": "Full-time",
        "deadline": _job_date(21),
        "isReferral": False,
        "link": "https://example.com/apply/kkr",
        "firmType": "bulge_bracket",
        "eventType": "Online Test",
    },
    {
        "id": 3,
        "title": "Audit Intern",
        "company": "Deloitte",
        "type": "Intern",
        "deadline": _job_date(7),
        "isReferral": True,
        "referralAlumniId": 4,
        "referralAlumniName": "Michael Cho",
        "link": "https://example.com/apply/deloitte",
        "firmType": "big_4",
        "eventType": "Resume Drop",
    },
    {
        "id": 4,
        "title": "Quantitative Researcher",
        "company": "Citadel",
        "type": "Full-time",
        "deadline": _job_date(30),
        "isReferral": False,
        "link": "https://example.com/apply/citadel",
        "firmType": "other",
        "eventType": "Online Test",
    },
    {
        "id": 5,
        "title": "Consulting Summer Analyst",
        "company": "McKinsey",
        "type": "Intern",
        "deadline": _job_date(10),
        "isReferral": False,
        "link": "https://example.com/apply/mck",
        "firmType": "other",
        "eventType": "Resume Drop",
    },
]


def get_alumni_list():
    """Return list of alumni profiles (mock). Filtering can be done client-side or via query params later."""
    return list(MOCK_ALUMNI)


def get_job_list():
    """Return list of job postings (mock)."""
    return list(MOCK_JOBS)
