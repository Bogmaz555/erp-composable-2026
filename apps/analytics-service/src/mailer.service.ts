import { Injectable, Logger } from '@nestjs/common';
import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface MailMessage {
  to: string;
  subject: string;
  body: string;
  tenantId?: string;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly logPath = process.env.ERP_SWARM_LOG
    || join(process.cwd(), '.agents', 'swarm', 'email-outbox.log');
  private readonly outbox: MailMessage[] = [];

  constructor() {
    try {
      mkdirSync(join(process.cwd(), '.agents', 'swarm'), { recursive: true });
    } catch { /* */ }
  }

  async send(msg: MailMessage) {
    const line = `[${new Date().toISOString()}] TO:${msg.to} SUBJ:${msg.subject} | ${msg.body.slice(0, 200)}\n`;
    try {
      appendFileSync(this.logPath, line);
    } catch { /* */ }

    this.outbox.unshift(msg);
    if (this.outbox.length > 100) this.outbox.pop();

    const smtpUrl = process.env.SMTP_URL;
    if (smtpUrl) {
      try {
        await fetch(smtpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(msg),
          signal: AbortSignal.timeout(5000),
        });
        this.logger.log(`SMTP sent: ${msg.subject}`);
      } catch (e) {
        this.logger.warn(`SMTP failed (logged locally): ${(e as Error).message}`);
      }
    } else {
      this.logger.log(`[MAIL OUTBOX] ${msg.subject} → ${msg.to}`);
    }
    return { queued: true, to: msg.to, subject: msg.subject };
  }

  getOutbox(take = 20) {
    return { items: this.outbox.slice(0, take), smtpConfigured: !!process.env.SMTP_URL };
  }

  notifyApproval(action: 'APPROVED' | 'REJECTED', title: string, resolvedBy: string, tenantId: string) {
    const to = process.env.WORKFLOW_NOTIFY_EMAIL || 'workflow@erp.local';
    return this.send({
      to,
      subject: `[ERP] Wniosek ${action === 'APPROVED' ? 'zatwierdzony' : 'odrzucony'}: ${title}`,
      body: `Akcja: ${action}\nWniosek: ${title}\n przez: ${resolvedBy}\nTenant: ${tenantId}`,
      tenantId,
    });
  }
}
