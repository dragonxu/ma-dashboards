/**
 * @copyright 2016 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

define(['amcharts/gantt', 'angular', 'moment'], function(AmCharts, angular, moment) {
'use strict';
/**
 * @ngdoc directive
 * @name ngMango.maStateChart
 * @restrict E
 * @description
 * `<ma-state-chart>
 </ma-state-chart>`
 * - This directive will display a chart showing the proportion of time over a time range a multi-state data point has been in a particular state.
 * - <a ui-sref="dashboard.examples.charts.stateChart">View Demo</a>

 * @param {object=} options extend AmCharts configuration object for customizing design of the chart (see [amCharts](https://www.amcharts.com/demos/simple-pie-chart/))
 * @param {string=} end-date Sets the end date for the chart.
 * @param {array} series-X-values Inputs a values array generated by `<ma-point-values>`.
 * @param {string=} series-X-title Sets the text in the legend for the given series (replace `X` with series number starting with 1).
 * @param {string=} series-X-labels Sets for the labels for the different states of a data point. Should be set to `rendererMap()` property of a multistate point.
 * @usage
 * <ma-state-chart style="height: 500px; width: 100%"
 	series-1-title="{{point1.name}}" series-1-values="point1Values" series-1-labels="point1.rendererMap()"
 	series-2-title="{{point2.name}}" series-2-values="point2Values" series-2-labels="point2.rendererMap()">
 </ma-state-chart>
 *
 */
function stateChart(mangoDateFormats) {
	var MAX_SERIES = 10;
	var scope = {
		options: '=?',
		endDate: '@'
	};
	for (var j = 1; j <= MAX_SERIES; j++) {
		scope['series' + j + 'Values'] = '=';
		scope['series' + j + 'Title'] = '@';
		scope['series' + j + 'Labels'] = '=';
	}
	
    return {
        restrict: 'E',
        replace: true,
        designerInfo: {
            translation: 'ui.components.stateChart',
            icon: 'insert_chart',
            category: 'pointValuesAndCharts'
        },
        scope: scope,
        template: '<div class="amchart"></div>',
        link: function ($scope, $element, attributes) {
            var options = defaultOptions();
            options = angular.extend(options, $scope.options);
            var chart = AmCharts.makeChart($element[0], options);
            
            for (var i = 1; i <= MAX_SERIES; i++) {
        		$scope.$watchCollection('series' + i + 'Values', valuesChanged.bind(null, i));
        	}
            
            function valuesChanged(seriesNumber, newValue, oldValue) {
            	if (!newValue) removeProvider(seriesNumber);
                else setupProvider(seriesNumber);
                updateValues();
            }
            
            function createLabelFn(labels) {
                return function(value) {
                    var label = labels && labels[value] || {};
                    
                    if (typeof label === 'string') {
                        label = {
                            text: label
                        };
                    }
                    
                    if (!label.text) {
                        label.text = value;
                    }
                    
                    return label;
                };
            }
            
            function removeProvider(graphNum) {
                for (var i = 0; i < chart.dataProvider.length; i++) {
                    if (chart.dataProvider[i].id === "series-" + graphNum) {
                        chart.dataProvider.splice(i, 1);
                        break;
                    }
                }
            }
            
            function findProvider(graphNum) {
                var graph;
                for (var i = 0; i < chart.dataProvider.length; i++) {
                    if (chart.dataProvider[i].id === "series-" + graphNum) {
                        graph = chart.dataProvider[i];
                        break;
                    }
                }
                return graph;
            }
            
            function setupProvider(graphNum) {
                var graph = findProvider(graphNum);
                
                if (!graph) {
                    graph = {
                        id: 'series-' + graphNum
                    };
                    chart.dataProvider.push(graph);
                }
                
                graph.category = $scope['series' + graphNum + 'Title'] || ('Series ' + graphNum);
                
                chart.dataProvider.sort(function(a, b) {
                    if (a.id < b.id)
                        return -1;
                      if (a.id > b.id)
                        return 1;
                      return 0;
                });
            }

            function updateValues() {
                var endDate = moment($scope.endDate);
                
                for (var i = 1; i <= MAX_SERIES; i++) {
                    var graph = findProvider(i);
                    var values = $scope['series' + i + 'Values'];
                    var labels = $scope['series' + i + 'Labels'];
                    var labelFn = createLabelFn(labels);
                    
                    if (graph && values) {
                        var provider = [];
                        
                        var prevStartOfDay = 0;
                        
                        for (var j = 0; j < values.length; j++) {
                            var val = values[j];
                            var label = labelFn(val.value);
                            
                            // remove duplicates
                            while ((j+1) < values.length && values[j+1].value === val.value) {
                                values.splice(j+1, 1);
                            }
                            
                            var endTime = (j+1) < values.length ? values[j+1].timestamp : endDate.valueOf();
                            var duration = endTime - val.timestamp;
                            var startMoment = moment(val.timestamp);
                            var startOfDay = moment(val.timestamp).startOf('day').valueOf();
                            var startFormatted = startOfDay === prevStartOfDay ?
                                    startMoment.format(mangoDateFormats.timeSeconds) :
                                    startMoment.format(mangoDateFormats.dateTimeSeconds);
                            prevStartOfDay = startOfDay;
                            
                            provider.push({
                                startDate: new Date(val.timestamp),
                                startFormatted: startFormatted,
                                endDate: new Date(endTime),
                                duration: moment.duration(duration).humanize(),
                                task: label.text,
                                colour: label.colour || getColour(val.value)
                            });
                        }
                        
                        graph.segments = provider;
                    }
                }
                chart.validateData();
            }
            
            var colourMap = {};
            var colourIndex = 0;
            function getColour(value) {
                if (colourMap[value]) {
                    return colourMap[value];
                }
                var colour = chart.colors[colourIndex++ % chart.colors.length];
                colourMap[value] = colour;
                return colour;
            }
        }
    };
}

function defaultOptions() {
    return {
        type: "gantt",
        theme: "light",
        columnWidth: 0.7,
        valueAxis: {
            type: "date"
        },
        graph: {
            fillAlphas: 1,
            balloonText: "<b>[[task]]</b>: [[startFormatted]], [[duration]]"
        },
        rotate: true,
        categoryField: "category",
        segmentsField: "segments",
        colorField: "colour",
        startDateField: "startDate",
        endDateField: "endDate",
        //durationField: "duration",
        dataProvider: [],
        showBalloonAt: "top",
        chartCursor: {
            valueBalloonsEnabled: false,
            cursorAlpha: 0.1,
            valueLineBalloonEnabled: true,
            valueLineEnabled: true,
            fullWidth: true
        },
        'export': {
            enabled: false
        }
    };
}

stateChart.$inject = ['mangoDateFormats'];

return stateChart;

}); // define
