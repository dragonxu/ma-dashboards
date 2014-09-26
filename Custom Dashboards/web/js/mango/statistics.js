/**
 * Javascript Objects for the Displaying Data on HTML pages.  
 * 
 * 
 * Copyright (C) 2014 Infinite Automation Software. All rights reserved.
 * @author Terry Packer
 */


/**
 * Configuration for Statistics
 * @param divId
 * @param dataProviderIds
 * @param mixin
 * @param options
 * @returns
 */
StatisticsConfiguration = function(divPrefix, dataProviderIds, mangoChartMixin, options){
    this.divPrefix = divPrefix;
    this.dataProviderIds = dataProviderIds;
    this.mangoChartMixin = mangoChartMixin;
    this.dataType = 'Numeric';
    
    for(var i in options) {
        this[i] = options[i];
    }
    
};

/**
 * Serial Chart Config
 */
StatisticsConfiguration.prototype = {
        divPrefix: null, //Div of chart
        
        mangoChartMixin: null, //Any Mango Serial Chart mixins
        
        configuration: null, //The full config with mixin
       
        dataProviderIds: null, //List of my data provider ids
        
        dataType: null, //['Numeric', 'Multistate', 'Binary', 'Alphanumeric']
        
        /**
         * Do the heavy lifting and create the item
         * @return AmChart created
         */
        createDisplay: function(){
            var serial = new MangoStatistics(this.divPrefix, this.dataProviderIds);
            return $.extend(true, {}, serial, this.mangoPieMixin);
        },
};


/**
 * Statistics Object
 * @param dataProviderIds
 * @param options
 * @returns
 */
MangoStatistics = function(divPrefix, dataProviderIds, options){
    
    this.divPrefix = divPrefix;
    this.dataProviderIds = dataProviderIds;
    
    for(var i in options) {
        this[i] = options[i];
    }
};

MangoStatistics.prototype = {
        
        divPrefix: null,  //The prefix for all divs ie. myXidSum will contain the sum and prefix is myXid
        dataProviderIds: null,
        
        /**
         * Data Provider Listener
         * On Data Provider load we add new data
         */
        onLoad: function(data, xid){
            if(data.hasData == true){
                
                //Numeric Statistics
                $("#" + this.divPrefix + "Minimum").text(this.renderPointValueTime(data.minimum));
                $("#" + this.divPrefix + "Maximum").text(this.renderPointValueTime(data.maximum));
                $("#" + this.divPrefix + "Average").text(this.renderValue(data.average));
                $("#" + this.divPrefix + "Integral").text(this.renderValue(data.integral));
                $("#" + this.divPrefix + "Sum").text(this.renderValue(data.sum));
                $("#" + this.divPrefix + "First").text(this.renderPointValueTime(data.first));
                $("#" + this.divPrefix + "Last").text(this.renderPointValueTime(data.last));
                $("#" + this.divPrefix + "Count").text(this.renderValue(data.count));
            }
        },
        
        renderPointValueTime: function(pvt){
           return this.renderValue(pvt.value) + " @ " + this.renderTime(pvt.time);  
        },
        
        renderValue: function(number){
            return number.toFixed(2);
        },
        
        renderTime: function(time){
           return time;
        }
};