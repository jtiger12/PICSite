import { LightningElement, api } from 'lwc';
import { ACCEPTED_FILE_TYPES, ATTACHMENT_HINT } from 'c/portalModel';

// Thin wrapper around lightning-file-upload so the portal's only base
// component lives in one place. Files are attached to `recordId` (the
// Test_Request__c just created, or the one selected in the tracker). The
// harness swaps this bundle for src/mock/fileUploader, which has the same
// API and events but uses a plain file input.
export default class FileUploader extends LightningElement {
    @api recordId;
    @api label = 'Attachments';
    @api hint = ATTACHMENT_HINT;
    files = [];

    get accept() {
        return ACCEPTED_FILE_TYPES;
    }

    get hasFiles() {
        return this.files.length > 0;
    }

    handleFinished(event) {
        const uploaded = ((event.detail && event.detail.files) || []).map((file) => ({
            id: file.documentId || file.contentVersionId || `${file.name}-${this.files.length}`,
            name: file.name
        }));
        this.files = [...this.files, ...uploaded];
        this.dispatchEvent(new CustomEvent('uploaded', { detail: { files: uploaded } }));
    }
}
