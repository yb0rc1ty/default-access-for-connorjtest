angular.module( 'orderCloud' )

    .config( PriceSchedulesConfig )
    .controller( 'PriceSchedulesCtrl', PriceSchedulesController )
    .controller( 'PriceScheduleEditCtrl', PriceScheduleEditController )
    .controller( 'PriceScheduleCreateCtrl', PriceScheduleCreateController )

;

function PriceSchedulesConfig( $stateProvider ) {
    $stateProvider
        .state( 'priceSchedules', {
            parent: 'base',
            url: '/priceSchedules',
            templateUrl:'priceSchedules/templates/priceSchedules.tpl.html',
            controller:'PriceSchedulesCtrl',
            controllerAs: 'priceSchedules',
            data: {componentName: 'Price Schedules'},
            resolve: {
                PriceScheduleList: function(OrderCloud) {
                    return OrderCloud.PriceSchedules.List();
                }
            }
        })
        .state( 'priceSchedules.edit', {
            url: '/:priceScheduleid/edit',
            templateUrl:'priceSchedules/templates/priceScheduleEdit.tpl.html',
            controller:'PriceScheduleEditCtrl',
            controllerAs: 'priceScheduleEdit',
            resolve: {
                SelectedPriceSchedule: function($stateParams, OrderCloud) {
                    return OrderCloud.PriceSchedules.Get($stateParams.priceScheduleid);
                }
            }
        })
        .state( 'priceSchedules.create', {
            url: '/create',
            templateUrl:'priceSchedules/templates/priceScheduleCreate.tpl.html',
            controller:'PriceScheduleCreateCtrl',
            controllerAs: 'priceScheduleCreate'
        })
}

function PriceSchedulesController(PriceScheduleList) {
    var vm = this;
    vm.list = PriceScheduleList;
}

function PriceScheduleEditController($scope, $exceptionHandler, $state, OrderCloud, SelectedPriceSchedule, PriceBreak, toastr ) {
    var vm = this,
        priceScheduleid = angular.copy(SelectedPriceSchedule.ID);
    vm.priceScheduleName = angular.copy(SelectedPriceSchedule.Name);
    vm.priceSchedule = SelectedPriceSchedule;
    vm.priceSchedule.MinQuantity =1;

    vm.addPriceBreak = function() {
        PriceBreak.addPriceBreak(vm.priceSchedule, vm.price, vm.quantity);
        vm.quantity = null;
        vm.price = null;
    };

    PriceBreak.addDisplayQuantity(vm.priceSchedule);

    vm.deletePriceBreak = PriceBreak.deletePriceBreak;

    vm.Submit = function() {
        vm.priceSchedule = PriceBreak.setMinMax(vm.priceSchedule);
        OrderCloud.PriceSchedules.Update(priceScheduleid, vm.priceSchedule)
            .then(function() {
                $state.go('priceSchedules', {}, {reload:true});
                toastr.success('Price Schedule Updated', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    };

    vm.Delete = function() {
        OrderCloud.PriceSchedules.Delete(priceScheduleid)
            .then(function() {
                $state.go('priceSchedules', {}, {reload:true});
                toastr.success('Price Schedule Deleted', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    };

    $scope.$watch(function() {
        return vm.priceSchedule.RestrictedQuantity;
    },function(value){

        if(vm.priceSchedule.RestrictedQuantity == true){
            vm.priceHeader = "Total Price";
        }else{
            vm.priceHeader =  "Price Per Unit";
        }
    });

}

function PriceScheduleCreateController($scope, $exceptionHandler, $state, OrderCloud, PriceBreak,toastr) {
    var vm = this;
    vm.priceSchedule = {};
    vm.priceSchedule.RestrictedQuantity = false;
    vm.priceSchedule.PriceBreaks = new Array();
    vm.priceSchedule.MinQuantity =1;

    vm.addPriceBreak = function() {
        PriceBreak.addPriceBreak(vm.priceSchedule, vm.price, vm.quantity);
        vm.quantity = null;
        vm.price = null;
    };

    vm.deletePriceBreak = PriceBreak.deletePriceBreak;

    vm.Submit = function() {
        vm.priceSchedule = PriceBreak.setMinMax(vm.priceSchedule);
        OrderCloud.PriceSchedules.Create(vm.priceSchedule)
            .then(function() {
                $state.go('priceSchedules', {}, {reload:true});
                toastr.success('Price Schedule Created', 'Success')
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    }

    $scope.$watch(function() {
        return vm.priceSchedule.RestrictedQuantity;
    },function(value){

        if(vm.priceSchedule.RestrictedQuantity == true){
            vm.priceHeader = "Total Price";
        }else{
            vm.priceHeader =  "Price Per Unit";
            }
    });


}
