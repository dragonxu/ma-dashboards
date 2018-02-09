/**
 * @copyright 2016 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

define(['angular', 'require'], function(angular, require) {
'use strict';
/**
 * @ngdoc directive
 * @name ngMango.directive:maDeviceNameList
 * @restrict E
 * @description
 * `<ma-device-name-list ng-model="myDeviceName" data-source-xid="myDataSource.xid"></ma-device-name-list>`
 * - Displays a list of Mango device names in a drop down selector. The selected device name will be outputed to the
 *   variable specified by the `ng-model` attribute.
 * - In the example below a list a points is generated that have the specified device name.
 * - <a ui-sref="ui.examples.basics.dataSourceAndDeviceList">View Demo</a>
 *
 * @param {object} ng-model Variable to hold the selected device name.
 * @param {boolean=} auto-init Enables auto selecting of the first device name in the list. (Defaults to `true`)
 * @param {expression=} data-source-xid Expression which should evaluate to a string. If provided will filter device names to a specific data source by xid.
 * @param {number=} data-source-id If provided will filter device names to a specific data source by id.
 * @param {expression=} contains Expression which should evaluate to a string. If provided will filter device names to those containing the specified string.
 *     Capitalization sensitive. (eg: `'Meta'`)
 * @param {boolean=} show-clear If set to `true` a clear option will be shown at the top of the the list, allowing you to set
 * the data source to undefined. (Defaults to `false`)
 * @param {expression=} on-query Expression is evaluated when querying starts. Available scope parameters are `$promise`.
 *
 * @usage
 * <md-input-container>
        <label>Device names for selected data source</label>
        <ma-device-name-list ng-model="myDeviceName" data-source-xid="myDataSource.xid"></ma-device-name-list>
    </md-input-container>

    <md-input-container>
        <label>Points for selected device name</label>
        <ma-point-list query="{deviceName: myDeviceName}" limit="100" ng-model="myPoint"></ma-point-list>
    </md-input-container>
 *
 */
deviceNameList.$inject = ['maDeviceName', '$injector'];
function deviceNameList(DeviceName, $injector) {
    return {
        restrict: 'E',
        require: 'ngModel',
        designerInfo: {
            translation: 'ui.components.deviceNameList',
            icon: 'view_list',
            category: 'dropDowns'
        },
        scope: {
            // attributes that start with data- have the prefix stripped
            dataSourceId: '<?sourceId',
            dataSourceXid: '<?sourceXid',
            contains: '<?',
            autoInit: '<?',
            showClear: '<?',
            onQuery: '&?'
        },
        templateUrl: function(element, attrs) {
          if ($injector.has('mdSelectDirective') || $injector.has('mdAutocompleteDirective')) {
            return require.toUrl('./deviceNameList-md.html');
          }
          return require.toUrl('./deviceNameList.html');
        },
        replace: true,
        link: function ($scope, $element, attrs, ngModelCtrl) {
            if (angular.isUndefined($scope.autoInit)) {
                $scope.autoInit = true;
            }

            var promise;
            $scope.onOpen = function onOpen() {
                return promise;
            };

            $scope.$watchGroup(['dataSourceId', 'dataSourceXid', 'contains'], function(value) {
                var queryResult;
                if (!angular.isUndefined($scope.dataSourceId)) {
                    queryResult = DeviceName.byDataSourceId({id: $scope.dataSourceId, contains: $scope.contains});
                } else if (!angular.isUndefined($scope.dataSourceXid)) {
                    queryResult = DeviceName.byDataSourceXid({xid: $scope.dataSourceXid, contains: $scope.contains});
                } else {
                    queryResult = DeviceName.query({contains: $scope.contains});
                }

                $scope.deviceNames = [];
                promise = queryResult.$promise.then(function(deviceNames) {
                    $scope.deviceNames = deviceNames;
                    if ($scope.autoInit && deviceNames.length && deviceNames.indexOf(ngModelCtrl.$viewValue) < 0) {
                    	ngModelCtrl.$setViewValue(deviceNames[0]);
                    }
                });

                if (this.onQuery) {
                    this.onQuery({$promise: promise});
                }
            });
        }
    };
}

return deviceNameList;

}); // define
