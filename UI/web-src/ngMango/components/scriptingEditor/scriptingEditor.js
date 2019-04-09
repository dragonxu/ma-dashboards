/**
 * @copyright 2018 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Luis Güette
 */

import angular from 'angular';
import componentTemplate from './scriptingEditor.html';
import './scriptingEditor.css';

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
        this.initOptions();

        if (!this.logLevel) this.logLevel = 'TRACE';

        this.$scope.$watch('$ctrl.scriptData.script', (script) => {
            this.clearAnnotations();
            this.clearHighLightLines();
        });
    }

    $onChanges(changes) {}

    initOptions() {
        if (!this.options) {
            this.options = {
                enableLiveAutocompletion: true
            };
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

    setAnnotations() {
        if (this.scriptErrors && this.scriptErrors.length > 0) {
            let annotations = [];

            this.scriptErrors.forEach(error => {
                annotations.push({
                    row: error.lineNumber - 1,
                    column: error.columnNumber,
                    text: 'Error Message', // Or the Json reply from the parser 
                    type: 'error' // also warning and information
                });
            });
            
            this.editor.session.setAnnotations(annotations);
        }
    }

    clearAnnotations() {
        if (this.editor) {
            return this.editor.session.clearAnnotations();
        }
    }

    setViewValue() {
        this.ngModelCtrl.$setViewValue(this.scriptData.script);
        this.clearAnnotations();
        this.clearHighLightLines();
    }

    render() {
        this.scriptData = new this.maScriptingEditor();
        this.scriptData.script = this.ngModelCtrl.$viewValue;
    }

    clearErrors() {
        this.scriptErrors = null;
        this.scriptActions = null;
        this.scriptOutput = null;
    }

    validate() {
        this.scriptData.context = angular.copy(this.context);

        if(this.contextVarXidName) {
            this.scriptData.context.forEach(item => {
                item.xid = item[this.contextVarXidName];
                delete item[this.contextVarXidName];
            });
        }

        if (this.resultDataType) {
            this.scriptData.resultDataType = this.resultDataType;
        }

        if (this.wrapInFunction) {
            this.scriptData.wrapInFunction = this.wrapInFunction;
        }

        if (this.permissions) {
            this.scriptData.permissions = this.permissions;
        }

        this.scriptData.logLevel = this.logLevel;

        this.clearErrors();
        this.clearHighLightLines();
        this.clearAnnotations();

        this.scriptData.validate(this.url).then(response => {
            this.scriptErrors = response.errors;
            this.scriptActions = response.actions;
            this.scriptOutput = response.scriptOutput;

            this.getHighlightLines();
            this.setHighlightLines();
            this.setAnnotations();

            if (!this.scriptErrors) {
                this.maDialogHelper.toastOptions({
                    textTr: ['scriptingEditor.ui.scriptValidated'],
                    hideDelay: 5000
                });
            } else {
                this.maDialogHelper.toastOptions({
                    textTr: ['scriptingEditor.ui.scriptError'],
                    hideDelay: 5000,
                    classes: 'md-warn'
                });
            }
        }, error => {
            this.scriptErrors = error.data.result.messages;
        });
    }

    hideOutput() {
        this.clearErrors();
        this.clearAnnotations();
        this.clearHighLightLines();
    }

}

export default {
    bindings: {
        context: '<',
        resultDataType: '<?',
        wrapInFunction: '<?',
        permissions: '<?',
        url: '@',
        disabled: '<?',
        options: '<?',
        logLevel: '=?',
        logCount: '=?',
        logSize: '=?',
        contextVarXidName: '<?',
        showLogFileInputs: '<?'
    },
    require: {
        ngModelCtrl: 'ngModel'
    },
    controller: scriptingEditorController,
    template: componentTemplate
};