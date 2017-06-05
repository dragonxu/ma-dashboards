/**
 * @copyright 2016 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

define(['angular'], function(angular) {
'use strict';

accordion.$inject = [];
function accordion() {
    return {
        restrict: 'A',
        scope: false,
        link: function($scope, $element, attrs, controller) {
            // jshint eqnull:true
            $scope[attrs.maAccordion] = controller;
            if (attrs.maAccordionSingle != null) {
                controller.single = true;
            }
        },
        controller: AccordionController
    };
}

AccordionController.$inject = [];
function AccordionController() {
    this.section = {};
}

AccordionController.prototype.open = function open(id) {
    if (this.single) {
        for (var sectionId in this.section) {
            this.section[sectionId] = false;
        }
    }

    this.section[id] = true;
};

AccordionController.prototype.close = function close(id) {
    this.section[id] = false;
};

AccordionController.prototype.toggle = function toggle(id) {
    if (this.section[id]) {
        this.close(id);
    } else {
        this.open(id);
    }
};

return accordion;

}); // define