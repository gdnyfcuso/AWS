// Webhook 服务

import axios, { AxiosError } from 'axios';
import { createLogger } from '../utils/logger';
import { WebhookEvent } from '../types/vw_protocol';

const logger = createLogger('Webhook');

interface WebhookOptions {
  timeout?: number;
  retries?: number;
}

export class WebhookService {
  async sendEvent(
    url: string,
    event: WebhookEvent,
    options: WebhookOptions = {}
  ): Promise<boolean> {
    const { timeout = 5000, retries = 3 } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.debug(`Sending webhook to ${url}, attempt ${attempt}/${retries}`);

        await axios.post(url, event, {
          timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AgentWorld/1.0',
          },
        });

        logger.debug(`Webhook sent successfully to ${url}`);
        return true;
      } catch (error) {
        const axiosError = error as AxiosError;

        if (attempt === retries) {
          logger.error(
            `Failed to send webhook to ${url} after ${retries} attempts`,
            axiosError.message
          );
          return false;
        }

        // 指数退避
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return false;
  }

  async sendEventBatch(
    urls: string[],
    event: WebhookEvent,
    options: WebhookOptions = {}
  ): Promise<{ url: string; success: boolean }[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.sendEvent(url, event, options))
    );

    return urls.map((url, index) => ({
      url,
      success: results[index].status === 'fulfilled' && results[index].value === true,
    }));
  }
}

export const webhookService = new WebhookService();
