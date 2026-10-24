/**
 * Contract for communicating with the internal Python AI microservice.
 */
export interface IAIServiceClient {
  /**
   * Dispatches an asynchronous document extraction and embedding command to the AI service.
   *
   * @param documentId MongoDB document ID
   * @param storageUri Relative or absolute storage path to the uploaded file
   */
  triggerDocumentProcessing(documentId: string, storageUri: string): Promise<void>;
}
