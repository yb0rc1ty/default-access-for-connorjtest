angular.module( 'orderCloud' )

    .config( SpecsConfig )
    .controller( 'SpecsCtrl', SpecsController )
    .controller( 'SpecEditCtrl', SpecEditController )
    .controller( 'SpecCreateCtrl', SpecCreateController )
    .controller( 'SpecAssignCtrl', SpecAssignController )

;

function SpecsConfig( $stateProvider ) {
    $stateProvider
        .state( 'specs', {
            parent: 'base',
            url: '/specs',
            templateUrl:'specs/templates/specs.tpl.html',
            controller:'SpecsCtrl',
            controllerAs: 'specs',
            data: {componentName: 'Specs'},
            resolve: {
                SpecList: function(OrderCloud) {
                    return OrderCloud.Specs.List();
                }
            }
        })
        .state( 'specs.edit', {
            url: '/:specid/edit',
            templateUrl:'specs/templates/specEdit.tpl.html',
            controller:'SpecEditCtrl',
            controllerAs: 'specEdit',
            resolve: {
                SelectedSpec: function($stateParams, OrderCloud) {
                    return OrderCloud.Specs.Get($stateParams.specid);
                }
            }
        })
        .state( 'specs.create', {
            url: '/create',
            templateUrl:'specs/templates/specCreate.tpl.html',
            controller:'SpecCreateCtrl',
            controllerAs: 'specCreate'
        })
        .state('specs.assign', {
            url: '/:specid/assign',
            templateUrl: 'specs/templates/specAssign.tpl.html',
            controller: 'SpecAssignCtrl',
            controllerAs: 'specAssign',
            resolve: {
                ProductList: function (OrderCloud) {
                    return OrderCloud.Products.List(null, 1, 20);
                },
                ProductAssignments: function ($stateParams, OrderCloud) {
                    return OrderCloud.Specs.ListProductAssignments($stateParams.specid);
                },
                SelectedSpec: function ($stateParams, OrderCloud) {
                    return OrderCloud.Specs.Get($stateParams.specid);
                }
            }
        })
}

function SpecsController( SpecList ) {
    var vm = this;
    vm.list = SpecList;
}

function SpecEditController( $exceptionHandler, $state, Underscore, OrderCloud, SelectedSpec, toastr ) {
    var vm = this,
        specid = angular.copy(SelectedSpec.ID);
    vm.specName = angular.copy(SelectedSpec.Name);
    vm.spec = SelectedSpec;
    vm.Option = {};
    vm.Options = vm.spec.Options;
    vm.overwrite = false;

    vm.addSpecOpt = function() {

        if (Underscore.where(vm.Options, {ID: vm.Option.ID}).length) {
            vm.overwrite = true;
            toastr.warning('There is already a spec option with that ID, select Update Spec Option to continue', 'Warning');

        }

        if (!Underscore.where(vm.Options, {ID: vm.Option.ID}).length) {
            vm.Options.push(vm.Option);
            if (vm.DefaultOptionID) {
                vm.spec.DefaultOptionID = vm.Option.ID;
            }
            OrderCloud.Specs.CreateOption(specid, vm.Option)
                .then(function () {
                    vm.Option = null;
                })
        }

    };

    vm.updateSpecOpt = function () {

        var specOptIndex;

        if (Underscore.where(vm.Options, {ID: vm.Option.ID}).length) {

            angular.forEach(vm.Options, function (option, index) {
                if (option.ID == vm.Option.ID) {

                    specOptIndex = index;
                }
            });


            vm.Options.splice(specOptIndex, 1);
            vm.Options.push(vm.Option);
            if (vm.DefaultOptionID) {
                vm.spec.DefaultOptionID = vm.Option.ID;
            }
            OrderCloud.Specs.UpdateOption(specid, vm.Option.ID, vm.Option)
                .then(function () {
                    vm.Option = null;
                    vm.overwrite = false;
                })
        } else {
            vm.addSpecOpt();


        }
    };



    vm.deleteSpecOpt = function($index) {
        if (vm.spec.DefaultOptionID == vm.spec.Options[$index].ID) {
            vm.spec.DefaultOptionID = null;
        }
        OrderCloud.Specs.DeleteOption(specid, vm.spec.Options[$index].ID)
            .then(function(){
                vm.Options.splice($index, 1);
            });


    };

    vm.Submit = function() {
        OrderCloud.Specs.Update(specid, vm.spec)
            .then(function() {
                $state.go('specs', {}, {reload:true});
                toastr.success('Spec Updated', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    };

    vm.Delete = function() {
        OrderCloud.Specs.Delete(specid)
            .then(function() {
                $state.go('specs', {}, {reload:true})
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    }
}

function SpecCreateController( $exceptionHandler, $q, $state, OrderCloud, Underscore, toastr) {
    var vm = this;
    vm.spec = {};
    vm.Options = [];
    var DefaultOptionID;
    vm.overwrite = false;

    vm.addSpecOpt = function() {
        if (Underscore.where(vm.Options, {ID: vm.Option.ID}).length) {
            vm.overwrite = true;
            toastr.warning('There is already a spec option with that ID, select Update Spec Option to continue', 'Warning');

        }
        if (!Underscore.where(vm.Options, {ID: vm.Option.ID}).length) {
            vm.Options.push(vm.Option);
            if (vm.DefaultOptionID) {
                DefaultOptionID = vm.Option.ID;
            }
            vm.Option = null;
            vm.DefaultOptionID = null;
        }
    };

    vm.updateSpecOpt = function () {

        var specOptIndex;

        if (Underscore.where(vm.Options, {ID: vm.Option.ID}).length) {

            angular.forEach(vm.Options, function (option, index) {
                if (option.ID == vm.Option.ID) {

                    specOptIndex = index;
                }
            });


            vm.Options.splice(specOptIndex, 1);
            vm.Options.push(vm.Option);
            if (vm.DefaultOptionID) {
                vm.spec.DefaultOptionID = vm.Option.ID;
            }
            vm.Option = null;
            vm.overwrite = false;

        } else {
            vm.addSpecOpt();


        }
    };

    vm.deleteSpecOpt = function($index) {
        if (vm.spec.DefaultOptionID == vm.Options[$index].ID) {
            vm.spec.DefaultOptionID = null;
        }
        vm.Options.splice($index, 1);
    };

    vm.Submit = function() {
        OrderCloud.Specs.Create(vm.spec)
            .then(function(spec) {
                var queue = [],
                    dfd = $q.defer();
                angular.forEach(vm.Options, function(opt) {
                    queue.push(OrderCloud.Specs.CreateOption(spec.ID, opt));
                });
                $q.all(queue).then(function() {
                    dfd.resolve();
                    if(DefaultOptionID != null){
                        OrderCloud.Specs.Patch(spec.ID, {DefaultOptionID: DefaultOptionID})
                    }
                    $state.go('specs', {}, {reload: true});
                    toastr.success('Spec Created', 'Success');
                });
                return dfd.promise;
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    }
}
function SpecAssignController(OrderCloud, Assignments, Paging, ProductList, ProductAssignments, SelectedSpec, toastr) {
    var vm = this;
    vm.Spec = SelectedSpec;
    vm.list = ProductList;
    vm.assignments = ProductAssignments;
    vm.saveAssignments = SaveAssignment;
    vm.pagingfunction = PagingFunction;

    function SaveFunc(ItemID) {
        return OrderCloud.Specs.SaveProductAssignment({
            SpecID: vm.Spec.ID,
            ProductID: ItemID
        });
    }

    function DeleteFunc(ItemID) {
        return OrderCloud.Specs.DeleteProductAssignment(vm.Spec.ID, ItemID);
    }

    function SaveAssignment() {
        toastr.success('Assignment Updated', 'Success');
        return Assignments.saveAssignments(vm.list.Items, vm.assignments.Items, SaveFunc, DeleteFunc, 'ProductID');
    }

    function AssignmentFunc() {
        return OrderCloud.Specs.ListProductAssignments(vm.Spec.ID, null, vm.assignments.Meta.PageSize);
    }

    function PagingFunction() {
        return Paging.paging(vm.list, 'Products', vm.assignments, AssignmentFunc);
    }
}
