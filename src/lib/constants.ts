export const APP_CONFIG = {
  name: 'Esports HQ',
  tagline: 'Every tournament. Your next opportunity.',
  game: 'Free Fire',
  defaultTimezone: 'Asia/Kolkata',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://pivamlbexbpnlqbhqljm.supabase.co',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

export const EVENT_STATUS_LABELS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  registration_open: {
    label: 'Registration Open',
    color: '#D97736',
    bg: '#FDF3EC',
    border: '#F6CEB4',
  },
  scheduled: {
    label: 'Upcoming',
    color: '#246B4B',
    bg: '#EBF4F0',
    border: '#BFE0D2',
  },
  live: {
    label: 'LIVE NOW',
    color: '#FFFFFF',
    bg: '#D97736',
    border: '#BF6328',
  },
  registration_closed: {
    label: 'Registration Closed',
    color: '#777A75',
    bg: '#EEEEEC',
    border: '#E4E1D9',
  },
  completed: {
    label: 'Completed',
    color: '#777A75',
    bg: '#EEEEEC',
    border: '#E4E1D9',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#A83232',
    bg: '#FCEBEB',
    border: '#F5C6C6',
  },
  postponed: {
    label: 'Postponed',
    color: '#8A6D3B',
    bg: '#FCF8E3',
    border: '#FAEBCC',
  },
};

export const CONFIRMATION_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Verified Schedule', color: '#246B4B', bg: '#EBF4F0' },
  unconfirmed: { label: 'Unconfirmed', color: '#777A75', bg: '#EEEEEC' },
  needs_review: { label: 'Needs Review', color: '#D97736', bg: '#FDF3EC' },
};

export const TRACKING_STATUS_OPTIONS = [
  { value: 'interested', label: 'Interested' },
  { value: 'registered', label: 'Registered' },
  { value: 'not_participating', label: 'Not Participating' },
  { value: 'completed', label: 'Completed' },
] as const;

export const REGISTRATION_STATUS_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'intending', label: 'Intending' },
  { value: 'registered', label: 'Registered' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'confirmed', label: 'Confirmed' },
] as const;

export const TEAM_ROLE_LABELS: Record<string, string> = {
  owner: 'Team Owner',
  manager: 'Manager',
  captain: 'Captain',
  member: 'Active Roster',
  substitute: 'Substitute',
};
