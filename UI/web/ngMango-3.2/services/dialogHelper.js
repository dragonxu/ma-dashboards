/**
 * @copyright 2017 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

define(['require', 'angular'], function(require, angular) {
'use strict';

DialogHelperFactory.$inject = ['$mdDialog', '$mdMedia', 'maTranslate'];
function DialogHelperFactory($mdDialog, $mdMedia, maTranslate) {
    function DialogHelper() {
    }
    
    DialogHelper.prototype.showDialog = function(templateUrl, locals, $event) {
        return $mdDialog.show({
            controller: function() {},
            templateUrl: templateUrl,
            targetEvent: $event,
            clickOutsideToClose: false,
            escapeToClose: false,
            fullscreen: $mdMedia('xs') || $mdMedia('sm'),
            controllerAs: '$ctrl',
            bindToController: true,
            locals: locals
        });
    };
    
    DialogHelper.prototype.showBasicDialog = function($event, locals) {
    	return $mdDialog.show({
            controller: function() {
            	this.close = function() {
            		$mdDialog.hide();
            	};
            },
            templateUrl: require.toUrl('./basicDialog.html'),
            targetEvent: $event,
            clickOutsideToClose: true,
            escapeToClose: true,
            fullscreen: $mdMedia('xs') || $mdMedia('sm'),
            controllerAs: '$ctrl',
            bindToController: true,
            locals: locals
        });
    };

    DialogHelper.prototype.confirm = function(event, translation) {
        var areYouSure = maTranslate.trSync('ui.app.areYouSure');
        var textContent = translation ? maTranslate.trSync(translation) : areYouSure;

        var confirm = $mdDialog.confirm()
            .title(areYouSure)
            .ariaLabel(areYouSure)
            .textContent(textContent)
            .targetEvent(event)
            .ok(maTranslate.trSync('common.ok'))
            .cancel(maTranslate.trSync('common.cancel'));

        return $mdDialog.show(confirm);
    };

    DialogHelper.prototype.showConfigImportDialog = function(importData, $event) {
        var locals = {importData: importData};
        var templateUrl = require.toUrl('../components/configImportDialog/configImportDialogContainer.html');
        return this.showDialog(templateUrl, locals, $event);
    };
    
    return new DialogHelper();
}

return DialogHelperFactory;

});