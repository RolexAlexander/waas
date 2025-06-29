import { Mail } from '../../types';
import { Agent } from './Agent';

export class MailSystem {
  private routes: Record<string, Agent> = {};
  public mailLog: Mail[] = [];
  private onMailSent: (mail: Mail) => void;

  constructor(onMailSent: (mail: Mail) => void) {
    this.onMailSent = onMailSent;
  }

  register(agent: Agent) {
    this.routes[agent.name] = agent;
  }

  send(to: string, message: Omit<Mail, 'to' | 'id' | 'timestamp'>) {
    const recipient = this.routes[to];
    const mail: Mail = {
        ...message,
        id: `mail-${Date.now()}-${Math.random()}`,
        to,
        timestamp: Date.now()
    }
    this.mailLog.push(mail);
    this.onMailSent(mail);
    if (recipient) {
      recipient.receiveMail(mail);
    } else {
      console.warn(`[MailSystem] No route for agent ${to}, mail dropped.`);
    }
  }
}
