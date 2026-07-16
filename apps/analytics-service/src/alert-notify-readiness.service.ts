import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AlertNotifyReadinessService {
  private findRepoRoot() {
    let dir = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (fs.existsSync(path.join(dir, 'scripts/ci-alert-notify-probe.ts'))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return process.cwd();
  }

  private fileExists(rel: string) {
    return fs.existsSync(path.join(this.findRepoRoot(), rel));
  }

  async getReadiness() {
    const slackTemplate = this.fileExists('infra/alertmanager/templates/slack.tmpl');
    const emailTemplate = this.fileExists('infra/alertmanager/templates/email.tmpl');
    const probeScript = this.fileExists('scripts/ci-alert-notify-probe.ts');

    let alertmanagerChannels = false;
    try {
      const am = fs.readFileSync(
        path.join(this.findRepoRoot(), 'infra/alertmanager/alertmanager.yml'),
        'utf8',
      );
      alertmanagerChannels =
        am.includes('slack_configs') &&
        am.includes('email_configs') &&
        am.includes('templates:');
    } catch {
      alertmanagerChannels = false;
    }

    let composeTemplatesMount = false;
    try {
      const compose = fs.readFileSync(
        path.join(this.findRepoRoot(), 'docker-compose.yml'),
        'utf8',
      );
      composeTemplatesMount =
        compose.includes('alertmanager/templates') || compose.includes('alertmanager/alertmanager.yml');
    } catch {
      composeTemplatesMount = false;
    }

    let ciGateIncludesProbe = false;
    try {
      const gate = fs.readFileSync(
        path.join(this.findRepoRoot(), 'scripts/ci-contract-gate.sh'),
        'utf8',
      );
      ciGateIncludesProbe = gate.includes('ci-alert-notify-probe');
    } catch {
      ciGateIncludesProbe = false;
    }

    const ready =
      slackTemplate &&
      emailTemplate &&
      probeScript &&
      alertmanagerChannels &&
      composeTemplatesMount &&
      ciGateIncludesProbe;

    return {
      ready,
      td011: ready ? 'yellow-minimum' : slackTemplate ? 'partial' : 'down',
      domain: 'ALERT_NOTIFY',
      slackTemplate,
      emailTemplate,
      probeScript,
      alertmanagerChannels,
      composeTemplatesMount,
      ciGateIncludesProbe,
      ciAlertNotifyEnv: process.env.CI_ALERT_NOTIFY === 'true',
      capabilities: ['Slack templates', 'Email templates', 'Alertmanager receivers'],
      checkedAt: new Date().toISOString(),
    };
  }
}
