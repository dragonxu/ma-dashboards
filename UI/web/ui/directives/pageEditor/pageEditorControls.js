/**
 * @copyright 2017 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

define(['require', 'angular'], function(require, angular) {
'use strict';

pageEditorControls.$inject = [];
function pageEditorControls() {
    return {
        restrict: 'E',
        scope: {},
        templateUrl: require.toUrl('./pageEditorControls.html'),
        controller: PageEditorControlsController,
        controllerAs: '$ctrl',
        bindToController: {
            onPageChanged: '&?',
            newPageContents: '&?'
        },
        transclude: {
            extraControls: '?extraControls'
        }
    };
}

PageEditorControlsController.$inject = ['$scope', 'Page', 'jsonStoreEventManager', 'MA_UI_PAGES_XID', 'MenuEditor', '$state',
    'localStorageService', '$mdDialog', 'Translate', 'Menu', '$window', 'User', '$q', 'MA_UI_EDIT_MENUS_PERMISSION'];
function PageEditorControlsController($scope, Page, jsonStoreEventManager, MA_UI_PAGES_XID, MenuEditor, $state,
        localStorageService, $mdDialog, Translate, Menu, $window, User, $q, MA_UI_EDIT_MENUS_PERMISSION) {
    this.$scope = $scope;
    this.Page = Page;
    this.jsonStoreEventManager = jsonStoreEventManager;
    this.MA_UI_PAGES_XID = MA_UI_PAGES_XID;
    this.MenuEditor = MenuEditor;
    this.$state = $state;
    this.localStorageService = localStorageService;
    this.$mdDialog = $mdDialog;
    this.Translate = Translate;
    this.Menu = Menu;
    this.$window = $window;
    this.User = User; // used in template
    this.$q = $q;
    this.MA_UI_EDIT_MENUS_PERMISSION = MA_UI_EDIT_MENUS_PERMISSION; // used in template
}

PageEditorControlsController.prototype.$onInit = function() {
    var Translate = this.Translate;
    var $window = this.$window;
    
    this.jsonStoreEventManager.smartSubscribe(this.$scope, this.MA_UI_PAGES_XID, ['add', 'update'], function updateHandler(event, payload) {
        this.pageSummaryStore.jsonData = payload.object.jsonData;
    }.bind(this));
    
    this.$scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
        if (this.pageEditorForm.$dirty || this.selectedPage.$dirty) {
            if (!confirm(Translate.trSync('ui.app.discardUnsavedChanges'))) {
                event.preventDefault();
            }
        }
    }.bind(this));

    var oldUnload = $window.onbeforeunload;
    $window.onbeforeunload = function(event) {
        if (this.pageEditorForm.$dirty || this.selectedPage.$dirty) {
            var text = Translate.trSync('ui.app.discardUnsavedChanges');
            event.returnValue = text;
            return text;
        }
    }.bind(this);

    this.$scope.$on('$destroy', function() {
        $window.onbeforeunload = oldUnload;
    });

    this.Page.getPages().then(function(pageSummaryStore) {
        this.pageSummaryStore = pageSummaryStore;
    }.bind(this));

    // Attempt load lastSelectedPage from local storage
    var lastSelectedPage = this.localStorageService.get('lastSelectedPage');
    
    if (this.$state.params.pageXid) {
        this.loadPage(this.$state.params.pageXid);
    } else if (this.$state.params.templateUrl) {
        $templateRequest(this.$state.params.templateUrl).then(this.createNewPage.bind(this));
    } else if (this.$state.params.markup) {
        this.createNewPage(this.$state.params.markup);
    } else if (lastSelectedPage && lastSelectedPage.pageXid) {
        this.loadPage(lastSelectedPage.pageXid);
    } else {
        this.createNewPage();
    }
};

PageEditorControlsController.prototype.createNewPage = function createNewPage(markup) {
    var page = this.Page.newPageContent();
    if (!markup && this.newPageContents) {
        markup = this.newPageContents();
    }
    page.jsonData.markup = markup || '';
    this.menuItem = null;
    return this.setSelectedPage(page);
};

PageEditorControlsController.prototype.confirmLoadPage = function confirmLoadPage(xid) {
    if (this.pageEditorForm.$dirty || this.selectedPage.$dirty) {
        if (!confirm(this.Translate.trSync('ui.app.discardUnsavedChanges'))) {
            return;
        }
    }
    
    if (xid) {
        this.loadPage(xid);
    } else {
        this.createNewPage();
    }
    
};

PageEditorControlsController.prototype.loadPage = function loadPage(xid) {
    var menuItemPromise = this.MenuEditor.getMenuItemForPageXid(xid).then(function(menuItem) {
        this.menuItem = menuItem;
    }.bind(this), angular.noop);
    
    var pagePromise = this.Page.loadPage(xid).then(function(page) {
        this.localStorageService.set('lastSelectedPage', {
            pageXid: page.xid
        });
        return page;
    }.bind(this));
    
    return this.$q.all([menuItemPromise, pagePromise]).then(function(result) {
        return this.setSelectedPage(result[1]);
    }.bind(this), function() {
        return this.createNewPage();
    }.bind(this));
};

PageEditorControlsController.prototype.setSelectedPage = function setSelectedPage(page, triggerChange) {
    if (triggerChange == null) triggerChange = true;
    
    this.selectedPage = page;
    this.selectedPageSummary = pageToSummary(page);
    this.updateViewLink();
    // form might not have initialized
    if (this.pageEditorForm) {
        this.pageEditorForm.$setPristine();
        this.pageEditorForm.$setUntouched();
    }
    if (triggerChange && this.onPageChanged) {
        this.onPageChanged({$page: page});
    }
    return page;
};

PageEditorControlsController.prototype.updateViewLink = function updateViewLink() {
    var xid = this.selectedPage.isNew ? null : this.selectedPage.xid;
    
    if (this.menuItem) {
        this.viewPageLink = this.$state.href(this.menuItem.name);
    } else {
        this.viewPageLink = this.$state.href('ui.viewPage', {pageXid: xid});
    }
    
    this.$state.params.pageXid = xid;
    this.$state.go('.', this.$state.params, { location: 'replace', notify: false });
};

PageEditorControlsController.prototype.editMenuItem = function($event) {
    var defaults = {
        menuText: this.selectedPage.name,
        permission: this.selectedPage.readPermission
    };
    return this.MenuEditor.editMenuItemForPageXid($event, this.selectedPage.xid, defaults).then(function(menuItem) {
        this.menuItem = menuItem;
        this.updateViewLink();
    }.bind(this));
};

PageEditorControlsController.prototype.confirmDeletePage = function confirmDeletePage() {
    var Translate = this.Translate;
    
    var confirm = this.$mdDialog.confirm()
        .title(Translate.trSync('ui.app.areYouSure'))
        .textContent(Translate.trSync('ui.app.confirmDeletePage'))
        .ariaLabel(Translate.trSync('ui.app.areYouSure'))
        .targetEvent(event)
        .ok(Translate.trSync('common.ok'))
        .cancel(Translate.trSync('common.cancel'));

    return this.$mdDialog.show(confirm).then(this.deletePage.bind(this));
};

PageEditorControlsController.prototype.deletePage = function deletePage() {
    var pageXid = this.selectedPage.xid;
    
    // consume errors, page might not exist in store for build in demo pages etc
    var pageDeletedPromise = this.selectedPage.$delete().then(null, angular.noop);
    var menuItemDeletedPromise;
    if (this.menuItem) {
        menuItemDeletedPromise = this.Menu.removeMenuItem(this.menuItem.name).then(null, angular.noop);
    } else {
        menuItemDeletedPromise = this.$q.when();
    }
    
    this.$q.all([pageDeletedPromise, menuItemDeletedPromise]).then(function() {
        var pageSummaries = this.pageSummaryStore.jsonData.pages;
        for (var i = 0; i < pageSummaries.length; i++) {
            if (pageSummaries[i].xid === pageXid) {
                pageSummaries.splice(i, 1);
                break;
            }
        }
        this.createNewPage();
        return this.pageSummaryStore.$save();
    }.bind(this));
};

PageEditorControlsController.prototype.savePage = function savePage() {
    this.pageEditorForm.$setSubmitted();
    if (this.pageEditorForm.$valid) {
        return this.selectedPage.$save().then(function(page) {
            this.localStorageService.set('lastSelectedPage', {
                pageXid: page.xid
            });

            this.selectedPageSummary = pageToSummary(page);
            this.updateViewLink();
            this.pageEditorForm.$setPristine();
            this.pageEditorForm.$setUntouched();

            var pageSummaries = this.pageSummaryStore.jsonData.pages;
            var found = false;
            
            for (var i = 0; i < pageSummaries.length; i++) {
                if (pageSummaries[i].xid === page.xid) {
                    angular.copy(this.selectedPageSummary, pageSummaries[i]);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                pageSummaries.push(this.selectedPageSummary);
            }

            return this.pageSummaryStore.$save();
        }.bind(this));
    }
};

function pageToSummary(input) {
    var result = {};
    result.xid = input.xid;
    result.name = input.name;
    result.editPermission = input.editPermission;
    result.readPermission = input.readPermission;
    return result;
}

return pageEditorControls;

}); // define