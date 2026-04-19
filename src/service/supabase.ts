
import { createClient } from '@supabase/supabase-js';

// Safe environment variable retrieval for browser environments
const getEnv = (key: string, fallback: string = '') => {
  // Check if process.env exists (Node/Bundled env)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Hardcoded fallback for Supabase URL from provided context
  if (key === 'SUPABASE_URL') return 'https://scnbjrkwrgshihgnixvu.supabase.co';
  return fallback;
};

const supabaseUrl = getEnv('SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_KEY');

let client: any;

// Helper to create a dummy chainable object for missing credentials
// This prevents "Cannot read properties of undefined" errors in db.ts
const createMockBuilder = () => {
    const mockResponse = { data: null, error: { message: 'Supabase not configured' } };
    
    // Create a chainable builder that mimics Supabase query builder
    const mockBuilder: any = {
        select: async () => mockResponse,
        eq: () => mockBuilder,
        single: () => mockBuilder,
        order: () => mockBuilder,
        limit: () => mockBuilder,
        // Make it thenable so it can be awaited directly
        then: (resolve: any) => resolve(mockResponse)
    };

    return {
        select: async () => ({ data: [], error: { message: 'Supabase not configured (Missing URL/Key)' } }),
        insert: () => mockBuilder,
        update: () => mockBuilder,
        delete: () => mockBuilder,
        upsert: () => mockBuilder
    };
};

// Check for valid credentials (ignoring placeholder if present)
const isValidKey = supabaseKey && !supabaseKey.includes('PASTE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !isValidKey) {
    // Warning suppressed as requested
    // console.warn('[SUPABASE] Running in Offline/Cache Mode. (Missing valid URL or Key)');
    client = {
        from: () => createMockBuilder(),
        isConfigured: false
    };
} else {
    try {
        client = createClient(supabaseUrl, supabaseKey);
        (client as any).isConfigured = true;
    } catch (e) {
        console.error('[SUPABASE] Client initialization failed:', e);
        client = {
            from: () => createMockBuilder(),
            isConfigured: false
        };
    }
}

export const supabase = client;
