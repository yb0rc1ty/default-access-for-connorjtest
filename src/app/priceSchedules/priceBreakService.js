angular.module('orderCloud')
    .factory('PriceBreak', PriceBreakFactory);

function PriceBreakFactory (Underscore) {
    var service = {
        addPriceBreak : addPriceBreak,
        setMinMax: setMinMax,
        deletePriceBreak: deletePriceBreak,
        addDisplayQuantity:addDisplayQuantity
    };

    function setMinMax(priceSchedule) {
            var quantities =  _.pluck(priceSchedule.PriceBreaks, 'Quantity');
            priceSchedule.MinQuantity = _.min(quantities);
        if (priceSchedule.RestrictedQuantity) {
            priceSchedule.MaxQuantity = _.max(quantities);
        }
        return priceSchedule;
    }

    function addPriceBreak( priceSchedule, price, quantity) {
        var numberExist= Underscore.findWhere(priceSchedule.PriceBreaks, {Quantity: quantity});
        if(numberExist === undefined){
            priceSchedule.PriceBreaks.push({Price: price, Quantity: quantity})
        }else{
            throw new Error('Quantity already exists, please delete and re-enter quantity to edit','Error');
        }
        displayQuantity(priceSchedule);
        return setMinMax(priceSchedule);
    }

    function addDisplayQuantity(priceSchedule){
        displayQuantity(priceSchedule);
        return setMinMax(priceSchedule);
    }

    function deletePriceBreak(priceSchedule, index) {
        priceSchedule.PriceBreaks.splice(index, 1);
        return setMinMax(priceSchedule);
    }

    function displayQuantity(priceSchedule){
        //Organize the priceschedule array in order of quantity
        priceSchedule.PriceBreaks.sort(function(a,b){return a.Quantity - b.Quantity});
        //find out the max quantity in the array
        var maxQuantity = Math.max.apply(Math,priceSchedule.PriceBreaks.map(function(object){
            return object.Quantity}));
        // go through each item in the priceschedule array
        for(var i=0; i < priceSchedule.PriceBreaks.length; i++){
            //if max number is unique, display max number  with + symbol
            if(priceSchedule.PriceBreaks[i].Quantity == maxQuantity) {
                priceSchedule.PriceBreaks[i].displayQuantity= priceSchedule.PriceBreaks[i].Quantity + "+";
            }else{
                //otherwise get the range of numbers between the current index quantity , and the next index Quantity
                var itemQuantityRange = Underscore.range(priceSchedule.PriceBreaks[i].Quantity, priceSchedule.PriceBreaks[i + 1].Quantity);
                itemQuantityRange;
                // If the difference between the range of numbers is only 1 . then just display that quantity number
                if(itemQuantityRange.length === 1){
                    priceSchedule.PriceBreaks[i].displayQuantity = itemQuantityRange[0];
                }else{
                    //the last quantity in the array of PriceBreaks minus the 1st quantity in the calculate range is less than or =1 , add only the first number in the Item
                    if(((priceSchedule.PriceBreaks[priceSchedule.PriceBreaks.length-1]).Quantity - itemQuantityRange[0]) <= 1){
                        priceSchedule.PriceBreaks[i].displayQuantity = itemQuantityRange[0];
                        //displays range between two quantities in the array
                    }else{
                        priceSchedule.PriceBreaks[i].displayQuantity = itemQuantityRange[0] + "-" + itemQuantityRange[itemQuantityRange.length-1] ;
                    }
                }
            }
        }
    }
    return service;
}
