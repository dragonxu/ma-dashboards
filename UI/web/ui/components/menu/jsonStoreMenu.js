/**
 * @copyright 2016 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

define(['require', 'angular'], function(require, angular) {
'use strict';

JsonStoreMenuController.$inject = ['$scope', 'Menu', '$rootScope'];
function JsonStoreMenuController($scope, Menu, $rootScope) {

    this.$onInit = function() {
        this.retrieveMenu();
        
        this.deregister = $rootScope.$on('maUIMenuChanged', function(event, menuHierarchy) {
            this.createMenuItemArray(menuHierarchy);
        }.bind(this));
        $scope.$on('$destroy', this.deregister);
    };

    this.retrieveMenu = function() {
        Menu.getMenuHierarchy().then(function(menuHierarchy) {
            this.createMenuItemArray(menuHierarchy);
        }.bind(this));
    };
    
    this.createMenuItemArray = function(menuHierarchy) {
        var rootArray = menuHierarchy.children.slice();
        
        Menu.forEach(rootArray, function(item, index, array) {
            var copy = angular.extend({}, item);
            delete copy.parent;
            array.splice(index, 1, copy);
        });
        
        // combine root menu items and items under ui into a top level menu array
        rootArray.forEach(function(item, index, array) {
            if (item.name === 'ui') {
                array.splice(index, 1);
                Array.prototype.push.apply(array, item.children);
            }
        });
        this.menuItems = rootArray;
    };
}

return {
    controller: JsonStoreMenuController,
    template: '<ma-ui-menu menu-items="$ctrl.menuItems" user="$ctrl.user"></ma-ui-menu>',
    bindings: {
        user: '<user'
    }
};

}); // define
