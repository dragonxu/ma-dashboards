/**
 * @copyright 2019 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

import filteringPointListTemplate from './filteringPointList.html';
import query from 'rql/query';

/**
 * @ngdoc directive
 * @name ngMango.directive:maFilteringPointList
 * @restrict E
 * @description
 * `<ma-filtering-point-list ng-model="myPoint"></ma-filtering-point-list>`
 * - Creates a self-filtering point list that allows you to select a data point by filtering on device names or point names that contain the text.
     Search results will update as you type.
 * - <a ui-sref="ui.examples.basics.pointList">View Demo</a>
 *
 * @param {object} ng-model Variable to hold the selected data point.
 * @param {number=} limit Limits the results in the list to a specified number of data points (200 defualt)
 * @param {boolean=} auto-init If set, enables auto selecting of the first data point in the list.
 * @param {string=} point-xid Used with `auto-init` to pre-select the specified point by xid.
 * @param {number=} point-id Used with `auto-init` to pre-select the specified point by data point id.
 * @param {expression=} query Expression should evaluate to a RQL query string.
 * @param {string=} label Set the floating label on the input
 * @param {expression=} list-text Expression is evaluated and the resulting string is used as the list text label.
 * @param {expression=} display-text Expression is evaluated and the resulting string is used as the display text label.
 * @param {object=} client-side-filter Uses the {@link https://docs.angularjs.org/api/ng/filter/filter AngularJS filter} to filter results
 *     returned from the REST API. The expression argument in the AngularJS documentation describes the object passed to this attribute.

 *
 * @usage
 * <ma-filtering-point-list ng-model="myPoint"></ma-filtering-point-list>
 */

class FilteringPointListController {
    static get $$ngIsClass() { return true; }
    static get $inject() { return ['maPoint', '$filter', 'maTranslate', '$scope']; }
    
    constructor(Point, $filter, Translate, $scope) {
        this.Point = Point;
        this.$filter = $filter;
        this.Translate = Translate;
        this.$scope = $scope;
        
        this.getByXid = true;
        this.allowClear = true;
    }

    $onChanges(changes) {
        if (changes.pointXid && (changes.pointXid.currentValue || !changes.pointXid.isFirstChange())) {
            this.setByXid();
        }
        
        if (changes.pointId && (changes.pointId.currentValue || changes.pointId.currentValue === 0 || !changes.pointId.isFirstChange())) {
            this.setById();
        }
    }

    $onInit() {
        this.ngModelCtrl.$render = this.render.bind(this);
        
        if (!this.label)
            this.label = this.Translate.trSync('ui.app.searchBy', ['points', 'name or device']);
        
        if (this.autoInit) {
            if (!this.pointXid && !(this.pointId || this.pointId === 0)) {
                this.Point.buildQuery().limit(1).query().then(items => {
                    if (items.length) {
                        this.setViewValue(items[0]);
                    }
                });
            }
        }

        if (!this.listText) {
            this.listText = defaultText;
        }
        
        if (!this.displayText) {
            this.displayText = defaultText;
        }
        
        function defaultText(opts) {
            return opts.$point.formatLabel();
        }
        
        this.deregister = this.Point.notificationManager.subscribe((event, point) => {
            if (this.viewValue && this.viewValue.id === point.id) {
                this.$scope.$apply(() => {
                    if (event.name === 'update') {
                        Object.assign(this.viewValue, point);
                        
                        // label doesn't update if its not a different item
                        this.selectedItem = point;
                    } else if (event.name === 'delete') {
                        this.setViewValue(null);
                    }
                });
            }
        });
    }
    
    $onDestroy() {
        this.deregister();
    }

    render() {
        this.viewValue = this.selectedItem = this.ngModelCtrl.$viewValue || null;
    }

    pointListChanged(point) {
        if (point || this.allowClear) {
            this.setViewValue(point);
        }
    }
    
    blurred($event) {
        if (!this.allowClear && !this.selectedItem) {
            this.selectedItem = this.viewValue;
        }
    }
    
    setViewValue(point) {
        this.viewValue = this.selectedItem = point;
        this.ngModelCtrl.$setViewValue(this.viewValue);
    }

    querySearch(inputText) {
        const rqlQuery = new query.Query();
        
        this.highlight = '';
        
        if (inputText)
            inputText = inputText.trim();
        
        if (inputText) {
            let nameLike, deviceNameLike;
            let searchByDeviceAndName = false;
            
            const split = inputText.split(/\s*[-\u2014]\s*/);
            if (split.length === 2) {
                searchByDeviceAndName = true;
                deviceNameLike = split[0];
                nameLike = split[1];
                this.highlight = nameLike;
            } else {
                nameLike = deviceNameLike = inputText;
                this.highlight = inputText;
            }
            
            const nameQuery = new query.Query({name: 'like', args: ['name', '*' + nameLike + '*']});
            const deviceNameQuery = new query.Query({name: 'like', args: ['deviceName', '*' + deviceNameLike + '*']});

            const searchQuery = new query.Query();
            rqlQuery.push(searchQuery);
            
            if (nameLike) {
                searchQuery.push(nameQuery);
            }
            if (deviceNameLike) {
                searchQuery.push(deviceNameQuery);
            }
            if (!searchByDeviceAndName && this.getByXid) {
                const xidEquals = new query.Query({name: 'eq', args: ['xid', inputText]});
                searchQuery.push(xidEquals);
            }
            
            searchQuery.name = searchByDeviceAndName ? 'and' : 'or';
        }
        
        if (this.dataType) {
            if (Array.isArray(this.dataType)) {
                rqlQuery.push(new query.Query({name: 'in', args: ['dataTypeId', this.dataType]}));
            } else {
                rqlQuery.push(new query.Query({name: 'eq', args: ['dataTypeId', this.dataType]}));
            }
        }

        let queryString;
        if (this.query) {
            const userQuery = this.query.replace(/^[?&]/, '');
            const q = rqlQuery.toString();
            queryString = q.length ? q + '&' + userQuery : userQuery;
        } else {
            queryString = rqlQuery.sort('deviceName', 'name')
                .limit(this.limit || 150)
                .toString();
        }
        
        return this.Point.query({
            rqlQuery: queryString
        }).$promise.then(result => {
            if (this.clientSideFilter) {
                return this.$filter('filter')(result, this.clientSideFilter);
            } else {
                return result;
            }
        }, () => []);
    }

    setByXid() {
        if (this.pointXid) {
            this.Point.get({xid: this.pointXid}).$promise.then(item => {
                this.setViewValue(item);
            });
        }
    }

    setById() {
        if (this.pointId !== null) {
            this.Point.getById({id: this.pointId}).$promise.then(item => {
                this.setViewValue(item);
            });
        }
    }
}

filteringPointList.$inject = [];
function filteringPointList() {
    return {
        restrict: 'E',
        template: filteringPointListTemplate,
        scope: {},
        controller: FilteringPointListController,
        controllerAs: '$ctrl',
        bindToController: {
            limit: '<?',
            autoInit: '<?',
            pointXid: '@?',
            pointId: '<?',
            query: '@?',
            label: '@?',
            listText: '&?',
            displayText: '&?',
            clientSideFilter: '<?',
            getByXid: '<?',
            allowClear: '<?',
            required: '@?',
            disabled: '@?',
            dataType: '<?type'
        },
        require: {
            ngModelCtrl: 'ngModel'
        },
        designerInfo: {
            translation: 'ui.components.filteringPointList',
            icon: 'filter_list',
            category: 'dropDowns',
            attributes: {
                getByXid: {type: 'boolean', defaultValue: true}
            }
        }
    };
}

export default filteringPointList;