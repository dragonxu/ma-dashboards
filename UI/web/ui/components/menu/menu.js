/**
 * @copyright 2016 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

define(['require', 'angular'], function(require, angular) {
'use strict';

MenuController.$inject = [];
function MenuController() {
    this.childVisible = function childVisible(menuItems) {
        var visibleCount = 0;
        for (var i = 0; i < menuItems.length; i++) {
            var menuItem = menuItems[i];
            
            var info = this.visibleMap[menuItem.name] = {};
            
            if (menuItem.children) {
                info.visibleChildren = this.childVisible(menuItem.children);
                info.visible = !menuItem.menuHidden && !!info.visibleChildren && this.user.hasPermission(menuItem.permission);
            } else {
                info.visible = !menuItem.menuHidden && this.user.hasPermission(menuItem.permission);
            }
            if (info.visible) {
                visibleCount++;
            }
        }
        return visibleCount;
    };

    this.$onChanges = function(changes) {
        if (this.user && this.origMenuItems) {
            this.copyMenu();
        }
    };
    
    this.copyMenu = function() {
        var items = this.origMenuItems;
        this.visibleMap = {};
        this.childVisible(items);
        this.menuItems = items;
    };
    
    this.isVisible = function(item) {
        return this.visibleMap[item.name].visible;
    };
    
    this.menuOpened = function menuOpened(toggleCtrl) {
        var submenu = null;
        var ctrl = toggleCtrl;
        while(ctrl) {
            if (ctrl.item.submenu) {
                submenu = ctrl.item;
                break;
            }
            ctrl = ctrl.parentToggle;
        }
        this.openSubmenu = submenu;
        
        this.openMenu = toggleCtrl.item;
        this.openMenuLevel = toggleCtrl.menuLevel + 1;
    };
    
    this.menuClosed = function menuOpened(toggleCtrl) {
        if (this.openSubmenu && toggleCtrl.item.name === this.openSubmenu.name) {
            delete this.openSubmenu;
        }
        if (this.openMenu && this.openMenu.name.indexOf(toggleCtrl.item.name) === 0) {
            this.openMenu = toggleCtrl.parentToggle ? toggleCtrl.parentToggle.item : null;
            this.openMenuLevel = toggleCtrl.menuLevel;
        }
    };
}

return {
    controller: MenuController,
    templateUrl: require.toUrl('./menu.html'),
    bindings: {
        origMenuItems: '<menuItems',
        user: '<user'
    }
};

}); // define