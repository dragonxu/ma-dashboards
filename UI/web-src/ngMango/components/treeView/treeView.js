/**
 * @copyright 2018 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

import treeViewTemplate from './treeView.html';
import './treeView.css';

class Context {
    constructor($ctrl, item, parent) {
        this.item = item;
        this.parent = parent;
        this.depth = parent ? parent.depth + 1 : 0;
        this.$q = $ctrl.$q;
        this.$timeout = $ctrl.$timeout;
        this.$ctrl = $ctrl;
        
        if (item) {
            this.hasChildren = $ctrl.hasChildren(item);
            this.retrieveChildren = () => $ctrl.children(this.item);
            
            if (this.hasChildren && $ctrl.expanded(item, this.depth)) {
                this.toggleChildren();
            }
        }
        
        this.loadCount = 0;
    }

    loadChildren() {
        const children = this.retrieveChildren();

        const loadingDelay = this.$timeout(() => this.loading = true, 200);
        
        const count = ++this.loadCount;

        const showResults = () => {
            this.$timeout.cancel(loadingDelay);
            if (this.loadCount === count) {
                delete this.childrenPromise;
                delete this.loading;
            }
        };
        
        this.childrenPromise = this.$q.when(children).then(resolvedChildren => {
            if (this.loadCount === count) {
                this.updateChildren(resolvedChildren);
            }
        }, error => {
            this.loadError = error && (error.mangoStatusText || error.localizedMessage) || ('' + error);
        }, progressChildren => {
            if (Array.isArray(progressChildren) && this.loadCount === count) {
                this.updateChildren(progressChildren);
                showResults();
            }
        });
        
        this.childrenPromise.finally(showResults);
    }
    
    updateChildren(newChildren) {
        const existingChildren = this.children;
        this.children = newChildren;
        
        if (!Array.isArray(existingChildren)) {
            return;
        }
        
        // context is created via a ng-init for each object tracked by id
        // we need to update the existing item if it exists so the item in the context is updated
        const existingById = existingChildren.reduce((map, e) => (map[this.$ctrl.id(e)] = e, map), {});
        this.children.forEach(c => {
            const id = this.$ctrl.id(c);
            const existing = existingById[id];
            if (existing) {
                Object.assign(existing, c);
            }
        });
    }
    
    toggleChildren() {
        this.showChildren = !this.showChildren;
        if (this.showChildren) {
            this.loadChildren();
        } else {
            delete this.children;
            delete this.loadError;
        }
    }
}
    
class TreeViewController {
    static get $$ngIsClass() { return true; }
    static get $inject() { return ['$scope', '$transclude', '$q', '$timeout']; }
    
    constructor($scope, $transclude, $q, $timeout) {
        this.$scope = $scope;
        this.$transclude = $transclude;
        this.$q = $q;
        this.$timeout = $timeout;

        this.$scope.context = new Context(this);
        this.$scope.context.retrieveChildren = () => this.items;
    }
    
    $onChanges(changes) {
        if (changes.items) {
            delete this.$scope.context.children;
            this.$scope.context.loadChildren();
        }
    }
    
    newContext(item, parent) {
        return new Context(this, item, parent);
    }

    id(item) {
        if (typeof this.itemId === 'function') {
            return this.itemId({$item: item});
        }
        return item.id;
    }
    
    hasChildren(item) {
        if (typeof this.itemHasChildren === 'function') {
            return this.itemHasChildren({$item: item});
        }
        return Array.isArray(item.children) && item.children.length;
    }

    children(item) {
        if (typeof this.itemChildren === 'function') {
            return this.itemChildren({$item: item});
        } else {
            return item.children;
        }
    }
    
    expanded(item, depth) {
        if (typeof this.itemExpanded === 'function') {
            return this.itemExpanded({$item: item, $depth: depth});
        } else {
            return false;
        }
    }
}

export default {
    template: treeViewTemplate,
    controller: TreeViewController,
    bindings: {
        items: '<',
        itemId: '&?',
        itemChildren: '&?',
        itemHasChildren: '&?',
        itemExpanded: '&?'
    },
    transclude: true
};
