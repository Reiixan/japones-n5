const SUPABASE_URL = 'https://ueaajyslbjhdndikyojo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlYWFqeXNsYmpoZG5kaWt5b2pvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NzY1NzksImV4cCI6MjA5NTU1MjU3OX0.BDK5R4XfwdCGOG01BLFEQ_sBxBU-1LHZCzQ-I541vSE';

let _client = null;

export function getClient() {
  if (!_client) {
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return _client;
}
