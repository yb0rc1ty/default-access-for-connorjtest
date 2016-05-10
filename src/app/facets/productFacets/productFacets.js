angular.module('orderCloud')

    .config( ProductFacetsConfig )
    .controller( 'ProductFacetsCtrl', ProductFacetsController)
    .controller( 'ProductFacetsManageCtrl', FacetedProductManageController)

;

function ProductFacetsConfig( $stateProvider ) {
    $stateProvider
        .state ('productFacets', {
            parent: 'base',
            url: '/productFacets',
            templateUrl: 'facets/productFacets/templates/productFacets.tpl.html',
            controller: 'ProductFacetsCtrl',
            controllerAs: 'facetedProd',
            data: {componentName: 'Product Facets'},
            resolve: {
                ProductList: function(OrderCloud) {
                    return OrderCloud.Products.List();
                }
            }
        })
        .state ('productFacets.manage', {
            url: '/:productid/manage',
            templateUrl: 'facets/productFacets/templates/productFacetsManage.tpl.html',
            controller: 'ProductFacetsManageCtrl',
            controllerAs: 'facetedProdManage',
            data: {componentName: 'Product Facets'},
            resolve: {
                Product: function(OrderCloud, $stateParams) {
                    return OrderCloud.Products.Get($stateParams.productid);
                },
                AssignedCategories: function($q, OrderCloud, $stateParams) {
                    var dfd = $q.defer();
                    var assignedCategories = [];
                    OrderCloud.Categories.ListProductAssignments(null, $stateParams.productid)
                        .then(function(categories){
                            angular.forEach(categories.Items, function(cat){
                                assignedCategories.push(OrderCloud.Categories.Get(cat.CategoryID))
                            });
                            $q.all(assignedCategories)
                                .then(function(results){
                                    dfd.resolve(results);
                                });
                        });
                    return dfd.promise
                }
            }
        })
}

function ProductFacetsController( ProductList, TrackSearch ) {
    var vm = this;
    vm.list = ProductList;

    vm.searching = function() {
        return TrackSearch.GetTerm() ? true : false;
    };
}

function FacetedProductManageController ( Product, AssignedCategories, OrderCloud, toastr, $state ) {
    var vm = this;
    vm.assignedCategories = AssignedCategories;
    vm.product = Product;
    if(vm.product.xp == null) vm.product.xp = { OC_Facets: {}};
    if (vm.product.xp && !vm.product.xp.OC_Facets) vm.product.xp.OC_Facets = {};

    vm.setSelected = function(scope) {
        if(vm.product.xp.OC_Facets[scope.$parent.cat.ID] && vm.product.xp.OC_Facets[scope.$parent.cat.ID][scope.$parent.facetName]) {
            scope.selected = vm.product.xp.OC_Facets[scope.$parent.cat.ID][scope.$parent.facetName].indexOf(scope.facetValue) > -1;
        }
    };

    vm.toggleSelection = function(scope) {
        scope.selected = !scope.selected;
        if(scope.selected && vm.product.xp.OC_Facets[scope.$parent.cat.ID]) {
            if (vm.product.xp.OC_Facets[scope.$parent.cat.ID][scope.$parent.facetName]) {
                vm.product.xp.OC_Facets[scope.$parent.cat.ID][scope.$parent.facetName].push(scope.facetValue);
            } else if (!vm.product.xp.OC_Facets[scope.$parent.cat.ID][scope.$parent.facetName]) {
                vm.product.xp.OC_Facets[scope.$parent.cat.ID][scope.$parent.facetName] = [];
                vm.product.xp.OC_Facets[scope.$parent.cat.ID][scope.$parent.facetName].push(scope.facetValue);
            }
        } else if (scope.selected && !vm.product.xp.OC_Facets[scope.$parent.cat.ID]) {
            vm.product.xp.OC_Facets[scope.$parent.cat.ID] = {};
            vm.product.xp.OC_Facets[scope.$parent.cat.ID][scope.$parent.facetName] = [];
            vm.product.xp.OC_Facets[scope.$parent.cat.ID][scope.$parent.facetName].push(scope.facetValue);
        }
        else {
            vm.product.xp.OC_Facets[scope.$parent.cat.ID][scope.$parent.facetName].splice(vm.product.xp.OC_Facets[scope.$parent.cat.ID][scope.$parent.facetName].indexOf(scope.facetValue), 1);
        }
    };

    vm.requiredFacet = function(cat) {
      var disabled = false;
      if(cat.xp && cat.xp.OC_Facets) {
          angular.forEach((cat.xp.OC_Facets), function(facetValues, facet){
             if(facetValues.isRequired && vm.product.xp.OC_Facets[cat.ID] && vm.product.xp.OC_Facets[cat.ID][facet] && vm.product.xp.OC_Facets[cat.ID][facet].length == 0) {
                 disabled = true;
             }
          });
      }
        return disabled;
    };

    vm.saveSelections = function() {
        (OrderCloud.Products.Update(vm.product.ID, vm.product))
            .then(function() {
                toastr.success('Your product facets have been saved successfully');
                $state.go($state.current, {}, {reload: true});
            });
    };


    vm.addValueExisting = function (cat, facetName) {
        cat.xp.OC_Facets[facetName].Values.push(vm.newFacetValue[facetName].toLowerCase());
        OrderCloud.Categories.Update(cat.ID, cat)
            .then(function() {
                if (!vm.product.xp.OC_Facets) vm.product.xp.OC_Facets = {};
                if (!vm.product.xp.OC_Facets[cat.ID]) vm.product.xp.OC_Facets[cat.ID] = {};
                if(!vm.product.xp.OC_Facets[cat.ID][facetName]) vm.product.xp.OC_Facets[cat.ID][facetName] = [];
                vm.product.xp.OC_Facets[cat.ID][facetName].push(vm.newFacetValue[facetName].toLowerCase());
                OrderCloud.Products.Update(vm.product.ID, vm.product)
                    .then(function() {
                        vm.newFacetValue[facetName] = null;
                        $state.go($state.current, {}, {reload: true})
                    });
            });
    };
}
