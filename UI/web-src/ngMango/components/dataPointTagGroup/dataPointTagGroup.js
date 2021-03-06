/**
 * @copyright 2018 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

import dataPointTagGroupTemplate from './dataPointTagGroup.html';

/**
 * @ngdoc directive
 * @name ngMango.directive:maDataPointTagGroup
 * @restrict 'E'
 * @scope
 *
 * @description Provides an interface to select tag values for a group of tag keys.
 **/

class DataPointTagGroupController {
    static get $$ngIsClass() { return true; }
    static get $inject() { return ['maDataPointTags']; }
    
    constructor(maDataPointTags) {
        this.maDataPointTags = maDataPointTags;
    }
    
    $onInit() {
        this.ngModelCtrl.$render = () => {
            this.selected = this.ngModelCtrl.$viewValue;
        };

        this.queryPromise = this.maDataPointTags.keys().then(tagKeys => {
            this.tagKeys = tagKeys.sort();
        });
        
        if (this.onQuery) {
            this.onQuery({$promise: this.queryPromise});
        }
    }
    
    $onChanges(changes) {
        
    }
    
    inputChanged() {
        this.ngModelCtrl.$setViewValue(Object.assign({}, this.selected));
    }
}

export default {
    bindings: {
        onQuery: '&?'
    },
    require: {
        ngModelCtrl: 'ngModel'
    },
    template: dataPointTagGroupTemplate,
    controller: DataPointTagGroupController
};
