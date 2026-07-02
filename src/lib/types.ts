export interface Jurisdiction {
  id: number;
  name: string;
  level: string;
  parent_id: number | null;
  state_code: string | null;
  region: string | null;
  data_status: string;
  confidence: number | null;
}

export interface Body {
  id: number;
  jurisdiction_id: number;
  name: string;
  short_name: string | null;
  body_type: string;
  data_status: string;
}

export interface Position {
  id: number;
  title: string;
  position_type: string;
  jurisdiction_id: number;
  body_id: number | null;
  jurisdiction_name: string | null;
  jurisdiction_level: string | null;
  body_name: string | null;
  person_name: string | null;
  person_party: string | null;
  is_vacant: boolean;
  data_status: string;
  confidence: number | null;
  rank_level: number | null;
}

export interface Person {
  id: number;
  full_name: string;
  honorific: string | null;
  party: string | null;
  data_status: string;
}

export interface Contact {
  id: number;
  contact_type: string;
  value: string;
  label: string | null;
  position_title: string | null;
  person_name: string | null;
  jurisdiction_name: string | null;
  is_public: boolean;
}

export interface Topic {
  id: number;
  name: string;
  keywords: string | null;
  description: string | null;
}

export interface SearchRecord {
  id: number;
  type: string;
  label: string;
  subtitle: string;
  keywords: string;
  data: Record<string, unknown>;
}

export interface Metrics {
  generatedAt: string;
  counts: Record<string, number>;
  coverage: {
    positionsFilled: number;
    positionsUnfilled: number;
    positionsVacant: number;
    positionsVerified: number;
    fillRate: number;
    verificationRate: number;
  };
  breakdowns: {
    positionsByLevel: Record<string, number>;
    positionsByType: Record<string, number>;
    positionsByStatus: Record<string, number>;
    contactsByType: Record<string, number>;
    jurisdictionsByLevel: Record<string, number>;
  };
  stateStats: Array<{
    id: number;
    name: string;
    state_code: string | null;
    districts: number;
    positions: number;
    dms_total: number;
    dms_filled: number;
    data_status: string;
  }>;
  latestCollection: {
    id: number;
    run_date: string;
    run_type: string;
    scope: string | null;
    records_added: number;
    records_updated: number;
    records_flagged: number;
    status: string;
    next_target: string | null;
    notes: string | null;
  } | null;
}

export interface Dataset {
  meta: {
    name: string;
    description: string;
    version: string;
    generatedAt: string;
  };
  metrics: Metrics;
  jurisdictions: Jurisdiction[];
  bodies: Body[];
  positions: Position[];
  persons: Person[];
  contacts: Contact[];
  topics: Topic[];
  searchIndex: SearchRecord[];
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}
