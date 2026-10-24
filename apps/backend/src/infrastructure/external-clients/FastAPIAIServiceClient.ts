import { IAIServiceClient } from '../../domain/providers/IAIServiceClient';
import { env } from '../../config/env';
import { logger } from '../logging/logger';

export class FastAPIAIServiceClient implements IAIServiceClient {
  private readonly baseUrl: string;
  private readonly secretKey: string;

  constructor(baseUrl?: string, secretKey?: string) {
    this.baseUrl = baseUrl || env.INTERNAL_FASTAPI_URL;
    this.secretKey = secretKey || env.INTERNAL_SERVICE_SECRET;
  }

  public async triggerDocumentProcessing(
    documentId: string,
    storageUri: string,
    versionId?: string,
  ): Promise<void> {
    const url = `${this.baseUrl}/api/internal/v1/process/document`;

    try {
      const payload: Record<string, unknown> = {
        documentId,
        storageUri,
      };
      if (versionId) {
        payload.versionId = versionId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': this.secretKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn({
          message: 'FastAPI microservice returned non-2xx status on triggerDocumentProcessing',
          status: response.status,
          error: errorText,
          documentId,
        });
        return;
      }

      logger.info({
        message: 'Successfully triggered internal document processing on FastAPI microservice',
        documentId,
      });
    } catch (error) {
      // Graceful degradation: log warning without interrupting client workflow
      logger.warn({
        message: 'Failed to contact internal FastAPI microservice for document processing',
        documentId,
        err: error,
      });
    }
  }
}

export const fastAPIAIServiceClient = new FastAPIAIServiceClient();
