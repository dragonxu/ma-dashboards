/**
 * @copyright 2018 {@link http://infiniteautomation.com|Infinite Automation Systems, Inc.} All rights reserved.
 * @author Jared Wiltshire
 */

import serialPortSelectTemplate from './serialPortSelect.html';

class SerialPortSelectController {
    static get $$ngIsClass() { return true; }
    static get $inject() { return ['maSerialPort', 'maDialogHelper']; }
    
    constructor(maSerialPort, maDialogHelper) {
        this.maSerialPort = maSerialPort;
        this.maDialogHelper = maDialogHelper;
    }
    
    $onInit() {
        this.getSerialPorts();
    }

    getSerialPorts(params = {}) {
        this.serialPortPromise = this.maSerialPort.list(params).then(serialPorts => {
            this.serialPorts = serialPorts;
            return serialPorts;
        });

        return this.serialPortPromise;
    }

    refreshList() {
        this.getSerialPorts({ refresh: true }).then(response => {
            this.maDialogHelper.toast('ui.app.serialPort.portListRefreshed');
        });
    }
}

export default {
    controller: SerialPortSelectController,
    template: serialPortSelectTemplate,
    require: {
        ngModelCtrl: 'ngModel'
    },
    bindings: {
        showIcon: '<?',
        showClear: '<?',
        disabled: '@?',
        required: '@?'
    },
    transclude: {
        label: '?maLabel'
    },
    designerInfo: {
        translation: 'ui.components.maSerialPortSelect',
        icon: 'storage',
        attributes: {
            showClear: {type: 'boolean'}
        }
    }
};