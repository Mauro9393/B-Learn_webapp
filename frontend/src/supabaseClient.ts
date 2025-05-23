import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cgnxxbmagtkwvwybirux.supabase.co'; // <-- metti qui il tuo URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnbnh4Ym1hZ3Rrd3Z3eWJpcnV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3NDQxNDMsImV4cCI6MjA2MzMyMDE0M30.0AuQ0x4Pb0NS8UAuGxf9LX2mh7C5QxJHXH8_0gafPIQ';         // <-- metti qui la tua anon key

export const supabase = createClient(supabaseUrl, supabaseKey);
