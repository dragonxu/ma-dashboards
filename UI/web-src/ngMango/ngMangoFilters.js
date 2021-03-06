/**
 * @copyright 2018 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

import momentFilter from './filters/momentFilter';
import durationFilter from './filters/durationFilter';
import angular from 'angular';


/**
 * @ngdoc overview
 * @name ngMangoFilters
 *
 *
 * @description
 * The ngMangoFilters module handles loading of the custom filters used for formatting and manipulating data in
   a Mango 3.0 dashboard.
 *
 *
 **/
const ngMangoFilters = angular.module('ngMangoFilters', []);

ngMangoFilters.filter('maMoment', momentFilter);
ngMangoFilters.filter('maDuration', durationFilter);

ngMangoFilters.filter('maSum', function() {
	return function(arrayData, propName) {
	    let sum = 0;
		let val;
		if (!arrayData) return null;
		if (arrayData.length !== undefined) {
			for (let i = 0; i < arrayData.length; i++) {
				if (arrayData[i] !== undefined) {
					val = arrayData[i];
					if (!propName) {
						sum += val;
					} else if (val[propName]) {
						sum += val[propName];
					}
				}
			}
		} else {
			for (const key in arrayData) {
				if (arrayData[key] !== undefined) {
					val = arrayData[key];
					if (!propName) {
						sum += val;
					} else if (val[propName]) {
						sum += val[propName];
					}
				}
			}
		}
		return sum;
	};
});

ngMangoFilters.filter('maSumColumn', function() {
	return function(tableData, colNum) {
	    let sum = 0;
		if (!tableData) {
			return sum;
		}
		if (tableData.length !== undefined) {
			for (let i = 0; i < tableData.length; i++) {
				if (tableData[i] && tableData[i][colNum] !== undefined)
					sum += tableData[i][colNum];
			}
		} else {
			for (const key in tableData) {
				if (tableData[key] && tableData[key][colNum] !== undefined)
					sum += tableData[key][colNum];
			}
		}
		return sum;
	};
});

ngMangoFilters.filter('maPad', function() {
	  const zeros = '0000000000';
	  return function(a, b) {
		  return (zeros + a).slice(-b);
	  };
});

ngMangoFilters.filter('maFirst', function() {
	  return function(a) {
		  if (a && typeof a.length === 'number')
			  return a[0];
		  return a;
	  };
});

ngMangoFilters.filter('maUnique', ['maUtil', function(Util) {
	const uniqueFilter = Util.memoize(function uniqueFilter(collection, propName) {
	    
	    const result = [];
	    
        if (collection.length !== undefined) {
            for (let i = 0; i < collection.length; i++)
                addUnique(collection[i]);
        } else {
            for (const key in collection)
                addUnique(collection[key]);
        }
        
        return result;

        function addUnique(item) {
            const propValue = item[propName];
            if (result.indexOf(propValue) >= 0) return;
            result.push(propValue);
        }
	});

	return function(collection, propName) {
		if (!collection) return collection;
		return uniqueFilter.apply(null, arguments);
	};
}]);

ngMangoFilters.filter('maRange', function() {
    return function(input, start, end, step) {
        input.splice(0, input.length);
        for (let i = start || 0; i <= (end || 100); i = i + (step || 1))
            input.push(i);
        return input;
    };
});

ngMangoFilters.filter('maProperty', ['maUtil', function(Util) {
    const propertyFilter = Util.memoize(function propertyFilter(input, propertyName) {
        const result = [];
        for (let i = 0; i < input.length; i++)
            result.push(input[i][propertyName]);
        return result;
    });
    
    return function(input, propertyName) {
        if (!input || !Array.isArray(input)) return input;
        return propertyFilter.apply(null, arguments);
    };
}]);

ngMangoFilters.filter('maFilter', ['maUtil', '$filter', function(Util, $filter) {
    return Util.memoize($filter('filter'));
}]);

ngMangoFilters.filter('maNoNaN', function () {
    return function (input, suffix) {
          if (isNaN(input)) { return '\u2014'; }
          else { return input.toFixed(1) + suffix; }
    };
});

ngMangoFilters.filter('maBytes', function() {
	return function(bytes, precision) {
		if (bytes === 0) return '0 B';
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) return '-';
		if (typeof precision === 'undefined') precision = 1;
		const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'],
			number = Math.floor(Math.log(bytes) / Math.log(1024));
		if (number === 0) precision = 0;
		return (bytes / Math.pow(1024, Math.floor(number))).toFixed(precision) +  ' ' + units[number];
	};
});

ngMangoFilters.filter('maMath', ['maMath', function(math) {
    const callFn = (object, fnName, ...args) => {
        if (typeof object[fnName] === 'function') {
            return object[fnName](...args);
        }
        return object[fnName];
    };

    return function(input, ...args) {
        if (!args.length) {
            return input == null ? math : input;
        }
        
        for (let i = 0; i < args.length; i++) {
            if (!Array.isArray(args[i])) {
                args[i] = [args[i]];
            }
        }

        // add the input as the first argument for the function to call
        args[0].splice(1, 0, input);
        
        let result = math;
        args.forEach(fnNameAndArgs => {
            result = callFn(result, ...fnNameAndArgs);
        });
        
        return result;
    };
}]);

ngMangoFilters.filter('maConvertUnit', ['maMath', function(math) {
    return function(input, from, to) {
        if (input == null) return input;
        return math.unit(input, from).toNumber(to);
    };
}]);

ngMangoFilters.filter('maExtractBits', function () {
    return function(input, mask, shift = 0) {
        if (typeof mask === 'string') {
            let radix = mask.substr(0, 2) === '0x' ? 16 : 10;
            mask = parseInt(mask, radix);
        }
        let output = input & mask;
        if (shift > 0) {
            output = output >>> shift;
        } else if (shift < 0) {
            output = output << shift;
        }
        return output;
    };
});

ngMangoFilters.filter('maFindBy', function () {
    return function(input, property, value) {
        if (!Array.isArray(input)) return input;
        return input.find((item) => item[property] === value);
    };
});

const matchesTags = function matchesTags(tags, item) {
    return Object.keys(tags).every(tagKey => {
        if (tagKey === 'name') {
            return item.name === tags[tagKey];
        } else if (tagKey === 'device') {
            return item.device === tags[tagKey];
        }
        return item.tags && item.tags[tagKey] === tags[tagKey];
    });
};

ngMangoFilters.filter('maFindByTags', function () {
    return function(input, tags = {}) {
        if (!Array.isArray(input)) return input;
        return input.find(matchesTags.bind(null, tags));
    };
});

ngMangoFilters.filter('maFilterByTags', function () {
    return function(input, tags = {}) {
        if (!Array.isArray(input)) return input;
        return input.filter(matchesTags.bind(null, tags));
    };
});

ngMangoFilters.filter('maDisplayNull', ['maTranslate', function (maTranslate) {
    const nullStr = maTranslate.trSync('ui.app.null');
    return function(input, strict) {
        if (!strict && input == null || input === null) {
            return nullStr;
        }
        return input;
    };
}]);

export default ngMangoFilters;


