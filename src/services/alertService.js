import nodemailer from 'nodemailer';
import { supabaseAdmin } from '../supabase/supabaseClient.js';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL_USER,
    pass: process.env.ALERT_EMAIL_PASS,
  },
});

export async function sendCronAlert(label, error) {
  if (!process.env.ALERT_EMAIL_USER || !process.env.ALERT_EMAIL_PASS) return;

  const to = process.env.ALERT_EMAIL_USER;
  const date = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  await transporter.sendMail({
    from: `"CRM Partiu" <${to}>`,
    to,
    subject: `❌ Cron falhou: ${label} — ${date}`,
    text: `O job "${label}" falhou em ${date}.\n\nErro:\n${error}\n\nVerifique os logs no Render para mais detalhes.`,
  });
}

export async function sendWeeklyAuditReport() {
  if (!process.env.ALERT_EMAIL_USER || !process.env.ALERT_EMAIL_PASS) return;

  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: logs, error } = await supabaseAdmin
    .from('audit_logs')
    .select('action, new_values, old_values, user_email, created_at')
    .eq('table_name', 'clients')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (error) throw new Error('Erro ao buscar audit_logs: ' + error.message);

  const cadastrados = logs.filter(l => l.action === 'INSERT' && !l.new_values?.restored);
  const atualizados = logs.filter(l => l.action === 'UPDATE');
  const excluidos   = logs.filter(l => l.action === 'DELETE');
  const restaurados = logs.filter(l => l.action === 'INSERT' && l.new_values?.restored);

  const fmt = (d) => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  const nome = (l) => l.new_values?.name || l.old_values?.name || '—';

  const section = (title, items, fn) =>
    items.length === 0
      ? `${title}: nenhum\n`
      : `${title} (${items.length}):\n${items.map(l => `  • ${fn(l)}`).join('\n')}\n`;

  const periodStart = since.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const periodEnd   = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const body = [
    `Resumo semanal do CRM Partiu Pra Boa`,
    `Período: ${periodStart} a ${periodEnd}`,
    ``,
    section('✅ Cadastrados', cadastrados, l => `${nome(l)} — por ${l.user_email || 'sistema'} em ${fmt(l.created_at)}`),
    section('✏️  Atualizados', atualizados, l => `${nome(l)} — por ${l.user_email || 'sistema'} em ${fmt(l.created_at)}`),
    section('🗑️  Excluídos',   excluidos,   l => `${nome(l)} — por ${l.user_email || 'sistema'} em ${fmt(l.created_at)}`),
    section('♻️  Restaurados', restaurados, l => `${nome(l)} — por ${l.user_email || 'sistema'} em ${fmt(l.created_at)}`),
    `Total de movimentações: ${logs.length}`,
  ].join('\n');

  await transporter.sendMail({
    from: `"CRM Partiu" <${process.env.ALERT_EMAIL_USER}>`,
    to: 'contato@partiupraboa.com',
    subject: `📋 Resumo semanal do CRM — ${periodStart} a ${periodEnd}`,
    text: body,
  });
}
