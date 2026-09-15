/**
 * config.js
 * Configuração de conexão com o Supabase.
 *
 * A "anon key" abaixo é pública por natureza (é enviada ao navegador de
 * qualquer visitante) — a segurança real do banco vem das políticas de
 * RLS (Row Level Security) configuradas nas tabelas, não do sigilo desta
 * chave. Ainda assim, se precisar trocar a chave um dia (ex: girar por
 * boa prática), troque apenas aqui.
 */
window.LAUDOS_CONFIG = {
  SUPABASE_URL: "https://cyohvgqgtoniydbiumwj.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5b2h2Z3FndG9uaXlkYml1bXdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMjg5ODEsImV4cCI6MjEwNDcwNDk4MX0.Rn40LdSIIjCFm6WrD2FEHmA6kbNLiVjP7emaxFTFutM"
};