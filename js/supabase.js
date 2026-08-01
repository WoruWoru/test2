// =========================================
// CONFIGURACIÓN DE SUPABASE
// =========================================
// Reemplaza estos valores con los de tu proyecto de Supabase.
// Los encuentras en: Project Settings > API
// =========================================

const SUPABASE_URL = "https://wrihvbryodnyxxotbnol.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyaWh2YnJ5b2RueXh4b3Ribm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyNjM1MDEsImV4cCI6MjEwMDgzOTUwMX0.CYaPu0_KT8-_MrsB6cpOe2mnQOY3EbrFtZzFCj5ocQo";

// Cliente global de Supabase, usado por script.js, login.js y admin.js
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
