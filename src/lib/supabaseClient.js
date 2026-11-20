/**
 * Supabase Client & Identity Service
 * Lightweight, zero-dependency REST & Auth client compatible with Supabase PostgreSQL and RLS.
 * 
 * Time Complexity: O(1) request construction; network-bound HTTP overhead.
 * Space Complexity: O(R) where R is query result set size.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

class SupabaseAuth {
  constructor(url, key) {
    this.url = url;
    this.key = key;
  }

  getHeaders(token = null) {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.key
    };
    const activeToken = token || localStorage.getItem('token');
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  async signInWithPassword({ email, password }) {
    if (!this.url || !this.key) {
      throw new Error('Supabase URL and Anon Key are not configured.');
    }
    const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Authentication failed');
    return { data, error: null };
  }

  async signUp({ email, password, options = {} }) {
    if (!this.url || !this.key) {
      throw new Error('Supabase URL and Anon Key are not configured.');
    }
    const res = await fetch(`${this.url}/auth/v1/signup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password, data: options.data || {} })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || 'Signup failed');
    return { data, error: null };
  }

  async signOut() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    if (this.url && this.key) {
      try {
        await fetch(`${this.url}/auth/v1/logout`, {
          method: 'POST',
          headers: this.getHeaders()
        });
      } catch (err) {
        // Silently clear local session even if remote logout fails
      }
    }
    return { error: null };
  }

  getSession() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    return {
      access_token: token,
      user: {
        id: localStorage.getItem('userId'),
        name: localStorage.getItem('userName'),
        email: localStorage.getItem('userEmail'),
        role: localStorage.getItem('userRole')
      }
    };
  }
}

class SupabaseQueryBuilder {
  constructor(url, key, table) {
    this.tableUrl = `${url}/rest/v1/${table}`;
    this.key = key;
    this.filters = [];
    this.selectFields = '*';
    this.orderClause = null;
    this.limitCount = null;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.key,
      'Prefer': 'return=representation'
    };
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  select(fields = '*') {
    this.selectFields = fields;
    return this;
  }

  eq(column, value) {
    this.filters.push(`${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`);
    return this;
  }

  order(column, { ascending = true } = {}) {
    this.orderClause = `order=${encodeURIComponent(column)}.${ascending ? 'asc' : 'desc'}`;
    return this;
  }

  limit(count) {
    this.limitCount = `limit=${count}`;
    return this;
  }

  async execute() {
    const queryParts = [`select=${encodeURIComponent(this.selectFields)}`, ...this.filters];
    if (this.orderClause) queryParts.push(this.orderClause);
    if (this.limitCount) queryParts.push(this.limitCount);
    
    const url = `${this.tableUrl}?${queryParts.join('&')}`;
    const res = await fetch(url, { headers: this.getHeaders() });
    const data = await res.json();
    if (!res.ok) return { data: null, error: data };
    return { data, error: null };
  }

  async insert(record) {
    const res = await fetch(this.tableUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(record)
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: data };
    return { data, error: null };
  }

  async update(updates) {
    const queryParts = [...this.filters];
    const url = `${this.tableUrl}?${queryParts.join('&')}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(updates)
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: data };
    return { data, error: null };
  }

  async delete() {
    const queryParts = [...this.filters];
    const url = `${this.tableUrl}?${queryParts.join('&')}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    const data = await res.json();
    if (!res.ok) return { data: null, error: data };
    return { data, error: null };
  }
}

export class SupabaseClient {
  constructor(url, key) {
    this.url = url?.replace(/\/$/, '') || '';
    this.key = key || '';
    this.auth = new SupabaseAuth(this.url, this.key);
  }

  from(tableName) {
    return new SupabaseQueryBuilder(this.url, this.key, tableName);
  }

  isConfigured() {
    return Boolean(this.url && this.key);
  }
}

export const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
