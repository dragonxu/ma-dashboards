/**
 * @copyright 2018 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Luis Güette
 */

import componentTemplate from './scriptingEditor.html';

const $inject = Object.freeze(['$scope', 'maScriptingEditor', 'maDialogHelper']);

class scriptingEditorController {

    static get $inject() { return $inject; }
    static get $$ngIsClass() { return true; }

    constructor($scope, maScriptingEditor, maDialogHelper) {
        this.$scope = $scope;
        this.maScriptingEditor = maScriptingEditor;
        this.maDialogHelper = maDialogHelper;
   }

    $onInit() {
        this.ngModelCtrl.$render = () => this.render(); 
        this.highlightLines = [];

        this.initMode();
    }

    initMode() {
        if (!this.mode) {
            this.mode = 'javascript';
        }
    }

    setHighlightLines() {
        if (this.highlightLines.length > 0) {
            this.range = this.editor.session.highlightLines(...this.highlightLines);
            return this.range;
        }
    }

    getHighlightLines() {
        if (this.scriptErrors && this.scriptErrors.length > 0) {
            this.scriptErrors.forEach(error => {
                if (error.lineNumber) {
                    this.highlightLines.push(error.lineNumber - 1);
                }
            });
        }
    }

    clearHighLightLines() {
        if (this.range) {
            this.highlightLines = [];
            return this.editor.session.removeMarker(this.range.id);
        }
    }

    setViewValue() {
        this.ngModelCtrl.$setViewValue(this.scriptData.script);
    }

    render() {
        this.scriptData = new this.maScriptingEditor();
        this.scriptData.script = this.ngModelCtrl.$viewValue;
    }

    validate() {
        this.scriptData.context = this.context;

        if (this.resultDataType) {
            this.scriptData.resultDataType = this.resultDataType;
        }

        if (this.wrapInFunction) {
            this.scriptData.wrapInFunction = this.wrapInFunction;
        }

        if (this.permissions) {
            this.scriptData.permissions = this.permissions;
        }

        this.scriptErrors = null;
        this.scriptActions = null;
        this.scriptOutput = null;

        this.clearHighLightLines();

        this.scriptData.validate(this.url).then(response => {
            this.scriptErrors = response.errors;
            this.scriptActions = response.actions;
            this.scriptOutput = response.scriptOutput;

            this.getHighlightLines();
            this.setHighlightLines();

            this.maDialogHelper.toastOptions({
                textTr: ['scriptingEditor.ui.scriptValidated'],
                hideDelay: 5000
            });
        }, error => {
            this.scriptErrors = error.data.result.messages;

            this.maDialogHelper.toastOptions({
                textTr: ['scriptingEditor.ui.scriptError'],
                hideDelay: 5000
            });
        });
    }

}

export default {
    bindings: {
        context: '<',
        resultDataType: '<?',
        wrapInFunction: '<?',
        permissions: '<?',
        url: '@',
        mode: '@'
    },
    require: {
        ngModelCtrl: 'ngModel'
    },
    controller: scriptingEditorController,
    template: componentTemplate
};