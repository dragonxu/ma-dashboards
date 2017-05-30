/**
 * @copyright 2017 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

define(['angular'], function(angular) {
'use strict';

ChangeController.$inject = ['$scope', '$element'];
function ChangeController($scope, $element) {
    this.$scope = $scope;
    this.$element = $element;
    
    this.boundChangeHandler = this.changeHandler.bind(this);
}

ChangeController.prototype.$onInit = function() {
    var $ctrl = this;
    this.$element.on('change', this.boundChangeHandler);
    this.$scope.$on('$destroy', function() {
        $ctrl.$element.off('change', $ctrl.boundChangeHandler);
    });
};

ChangeController.prototype.changeHandler = function($event) {
    this.maChange({$event: $event});
};

change.$inject = [];
function change($compile, $timeout) {
    return {
        restrict: 'A',
        scope: false,
        controller: ChangeController,
        bindToController: {
            maChange: '&'
        }
    };
}

return change;

}); // define
