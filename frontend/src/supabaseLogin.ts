import { createClient } from '@supabase/supabase-js';

const supabaseUrlLogin = 'https://rlaxjjslueystcndhguv.supabase.co'; // <-- metti qui il tuo URL
const supabaseKeyLogin = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsYXhqanNsdWV5c3RjbmRoZ3V2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4OTg2MDIsImV4cCI6MjA2MzQ3NDYwMn0.alTlLN74NN4fGEK-_v5aANs66522Ef_v-oNXEvPUueM';

export const supabase = createClient(supabaseUrlLogin, supabaseKeyLogin);
