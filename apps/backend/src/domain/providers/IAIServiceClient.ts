/**
 * Contract for communicating with the internal Python AI microservice.
 */
export interface IAIServiceClient {
  /**
   * Dispatches an asynchronous document extraction and embedding command to the AI service.
   *
   * @param documentId MongoDB document ID
   * @param storageUri Relative or absolute storage path to the uploaded file
   * @param versionId Optional version UUID to target specific version
   */
  triggerDocumentProcessing(
    documentId: string,
    storageUri: string,
    versionId?: string,
  ): Promise<void>;
}
