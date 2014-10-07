/**
 * Javascript Objects Used for Configuration of Time Period Type Picker
 * 
 * 
 * 
 * Copyright (C) 2014 Infinite Automation Software. All rights reserved.
 * @author Terry Packer
 */

TimePeriodTypeConfiguration = function(divId, mixin, options){
    
    this.divId = divId;
    
    this.mixin = mixin;
    
    for(var i in options) {
        this[i] = options[i];
    }
    
    this.configuration = $.extend(true, {}, this.getBaseConfiguration(), this.mixin);
    var self = this;
    this.configuration.onChange = function(){
        self.onChange($(this).val(), self.owner);
    };
};

TimePeriodTypeConfiguration.prototype = {
        
        
        divId: null, //Id of div to place Picker
        owner: null, //Owner Object to include in callback
        mixin: null, //Configuration overload
        configuration: null, //Full mixed-in config
        selected: 0,
        
        addItem: function(label, id, selected){
            var html = "<option></option>";
            $('#' + this.divId).append( $(html).text(label).val(id));
        },
        
        create: function(){
            var self = this;
            //Add the options
            var select = $('#' + this.divId);
            //Add the options
            for(k in this.configuration.options){
                if(k == this.selected)
                    this.addItem(this.configuration.options[k].label, this.configuration.options[k].value, true);
                else
                    this.addItem(this.configuration.options[k].label, this.configuration.options[k].value, false);
                    
            }
            
            if(this.placeholder != null)
                $('#' + this.divId).attr("placeholder", this.placeholder);
 
            //Add the onChange method
            select.change(self.configuration.onChange);
            if(this.configuration.options.length > 0){
                $('#' + this.divId).val(this.configuration.options[this.selected].value);
                if($('#' + this.divId).selectmenu != undefined)
                    $('#' + this.divId).selectmenu('refresh', true);
            }
        },
        
        onChange: function(value, owner){
            console.log(value);
        },
        
        getBaseConfiguration: function(){
            return {
                options: [
                                  {label: 'MINUTES', value: 'MINUTES'},
                                  {label: 'HOURS', value: 'HOURS'},
                                  {label: 'DAYS', value: 'DAYS'},
                                  {label: 'WEEKS', value: 'WEEKS'},
                                  {label: 'MONTHS', value: 'MONTHS'},
                                  {label: 'YEARS', value: 'YEARS'}
                                  ], //Not using yet 'MILLISECONDS', 'SECONDS',
                                      
                onChange: function(timePeriod){
                    console.log(timePeriod);
                }
            };
        }
        
};
