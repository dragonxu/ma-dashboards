/**
 * @copyright 2019 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Luis Güette
 */

import componentTemplate from './eventHandlerSetPointEditor.html';

const $inject = Object.freeze(['$scope']);

class eventHandlerSetPointEditorController {

    static get $inject() { return $inject; }
    static get $$ngIsClass() { return true; }

    constructor($scope) {
        this.$scope = $scope;
    }

    $onInit() {
        this.$scope.editor = this.editor;
    }

    changeTargetPoint() {
        if (this.targetPoint) {
            this.$scope.editor.eventHandler.targetPointXid = this.targetPoint.xid;
        }
    }

    changeActivePoint() {
        if (this.activePoint) {
            this.$scope.editor.eventHandler.activePointXid = this.activePoint.xid;
        }
    }

    changeInactivePoint() {
        if (this.inactivePoint) {
            this.$scope.editor.eventHandler.inactivePointXid = this.inactivePoint.xid;
        }
    }

    targetPointIs(dataType) {
        if (this.targetPoint) {
            return this.targetPoint.pointLocator.dataType === dataType;
        } else {
            return dataType === 'ALPHANUMERIC';
        }
    }

}

export default {
    bindings: {},
    require: {
        editor: '^maEventHandlerEditor'
    },
    controller: eventHandlerSetPointEditorController,
    template: componentTemplate
};