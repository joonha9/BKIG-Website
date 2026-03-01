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

# ---------------------------------------------------------------------------
# Alumni profiles (empty until populated from DB or API)
# ---------------------------------------------------------------------------
MOCK_ALUMNI = []

# ---------------------------------------------------------------------------
# Job postings (empty until populated from DB or API)
# ---------------------------------------------------------------------------
MOCK_JOBS = []

# ---------------------------------------------------------------------------
# Upcoming info sessions / recruiting events (Jobs sidebar)
# ---------------------------------------------------------------------------
MOCK_UPCOMING_SESSIONS = []

# ---------------------------------------------------------------------------
# Corporate partners — careers page links (Jobs sidebar)
# ---------------------------------------------------------------------------
MOCK_PARTNER_LINKS = []


def get_alumni_list():
    """Return list of alumni profiles (mock). Filtering can be done client-side or via query params later."""
    return list(MOCK_ALUMNI)


def get_job_list():
    """Return list of job postings (mock)."""
    return list(MOCK_JOBS)


def get_upcoming_sessions():
    """Return list of upcoming recruiting events (mock)."""
    return list(MOCK_UPCOMING_SESSIONS)


def get_partner_links():
    """Return list of corporate partner career page links (mock)."""
    return list(MOCK_PARTNER_LINKS)
