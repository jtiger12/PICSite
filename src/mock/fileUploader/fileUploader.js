import { LightningElement, api } from 'lwc';
import { ACCEPTED_FILE_TYPES, ATTACHMENT_HINT } from 'c/portalModel';

// Harness stand-in for c/fileUploader (which wraps lightning-file-upload).
// Same public API and `uploaded` event; nothing is actually uploaded.
export default class FileUploader extends LightningElement {
    @api recordId;
    @api label = 'Attachments';
    @api hint = ATTACHMENT_HINT;
    files = [];

    get accept() {
        return ACCEPTED_FILE_TYPES.join(',');
    }

    get hasFiles() {
        return this.files.length > 0;
    }

    handleFiles(event) {
        const uploaded = Array.from(event.target.files || []).map((file, i) => ({ id: `${file.name}-${this.files.length + i}`, name: file.name }));
        this.files = [...this.files, ...uploaded];
        this.dispatchEvent(new CustomEvent('uploaded', { detail: { files: uploaded } }));
    }
}
