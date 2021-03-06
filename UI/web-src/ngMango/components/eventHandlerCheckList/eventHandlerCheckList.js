/**
 * @copyright 2018 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

import eventHandlerCheckListTemplate from './eventHandlerCheckList.html';

/**
 * @ngdoc directive
 * @name ngMango.directive:maEventHandlerCheckList
 * @restrict E
 * @description Displays a list of event handlers
 */

class EventHandlerCheckListController {
    static get $$ngIsClass() { return true; }
    static get $inject() { return ['maEventHandler', '$scope']; }
    
    constructor(maEventHandler, $scope) {
        this.maEventHandler = maEventHandler;
        this.$scope = $scope;
    }
    
    $onInit() {
        this.ngModelCtrl.$render = () => this.render();
        
        this.doQuery();
        
        this.maEventHandler.subscribe({
            scope: this.$scope,
            handler: (event, item, attributes) => {
                attributes.updateArray(this.eventHandlers);
            }
        });
        
        this.selected = new Map();
    }

    $onChanges(changes) {
    }
    
    doQuery() {
        const queryBuilder = this.maEventHandler.buildQuery();
        queryBuilder.limit(10000);
        return queryBuilder.query().then(eventHandlers => {
            return (this.eventHandlers = eventHandlers);
        });
    }
    
    setViewValue() {
        this.ngModelCtrl.$setViewValue(Array.from(this.selected.values()));
    }
    
    render() {
        this.selected.clear();
        const selected = this.ngModelCtrl.$viewValue;
        if (Array.isArray(selected)) {
            selected.forEach(eh => this.selected.set(eh.xid, eh));
        }
    }

    selectedGetterSetter(eventHandler) {
        return value => {
            const xid = eventHandler.xid;
            
            if (value === undefined) {
                return this.selected.has(xid);
            }
            
            if (value) {
                this.selected.set(xid, eventHandler);
            } else {
                this.selected.delete(xid);
            }
            
            this.setViewValue();
        };
    }
}

export default {
    template: eventHandlerCheckListTemplate,
    controller: EventHandlerCheckListController,
    bindings: {
    },
    require: {
        ngModelCtrl: 'ngModel'
    },
    designerInfo: {
        translation: 'ui.components.eventHandlerCheckList',
        icon: 'assignment_turned_in'
    }
};
