angular.module('orderCloud')

    .config( CategoryFacetsConfig )
    .controller( 'CategoryFacetsCtrl', CategoryFacetsController)
    .controller( 'CategoryFacetsManageCtrl', FacetedCategoryManageController)
    .controller( 'CategoryFacetsModalCtrl', CategoryFacetsModalController)

;

function CategoryFacetsConfig( $stateProvider ) {
    $stateProvider
        .state ('categoryFacets', {
        parent: 'base',
        url: '/categoryFacets',
        templateUrl: 'facets/categoryFacets/templates/categoryFacets.tpl.html',
        controller: 'CategoryFacetsCtrl',
        controllerAs: 'facetedCat',
        data: {componentName: 'Category Facets'},
        resolve: {
            CategoryList: function(OrderCloud) {
                return OrderCloud.Categories.List(null, 'all');
            }
        }
    })
    .state ('categoryFacets.manage', {
        url: '/:categoryid/manage',
        templateUrl: 'facets/categoryFacets/templates/categoryFacetsManage.tpl.html',
        controller: 'CategoryFacetsManageCtrl',
        controllerAs: 'facetedCatManage',
        data: {componentName: 'Category Facets'},
        resolve: {
            Category: function(OrderCloud, $stateParams) {
                return OrderCloud.Categories.Get($stateParams.categoryid);
            }
        }
    })
}

function CategoryFacetsController( CategoryList, TrackSearch ) {
    var vm = this;
    vm.list = CategoryList;

    vm.searching = function() {
        return TrackSearch.GetTerm() ? true : false;
    };
}

function FacetedCategoryManageController ( $state, Category, OrderCloud, toastr, Underscore, $uibModal ) {
    var vm = this;
    Category.xp && Category.xp.OC_Facets ? vm.list = Category.xp.OC_Facets : vm.list = null;
    vm.category = Category;
    vm.facetValues = [];
    vm.isRequired = false;

    vm.createFacetModal = function() {
        var modalInstance = $uibModal.open({
            animation: vm.animationsEnabled,
            templateUrl: 'facets/categoryFacets/templates/categoryFacets.modal.tpl.html',
            controller: 'CategoryFacetsModalCtrl',
            controllerAs: 'catFacetModal'
        });

        modalInstance.result.then(function(facetToSave) {
            if(vm.category.xp == null) vm.category.xp = { OC_Facets: {}};
            if (vm.category.xp && !vm.category.xp.OC_Facets) vm.category.xp.OC_Facets = {};
            vm.category.xp.OC_Facets[facetToSave.facet.toLowerCase()] = {};
            vm.category.xp.OC_Facets[facetToSave.facet.toLowerCase()].Values = facetToSave.facetValues;
            vm.category.xp.OC_Facets[facetToSave.facet.toLowerCase()].isRequired = facetToSave.isRequired;
            (OrderCloud.Categories.Update(vm.category.ID, vm.category))
                .then(function() {
                    toastr.success('Your category facet has been saved successfully');
                    $state.reload();
                });
        })
    };


    vm.addValueExisting = function (facetName, index) {
        vm.category.xp.OC_Facets[facetName].Values.push(vm[facetName].newFacetValue.toLowerCase());
        OrderCloud.Categories.Update(vm.category.ID, vm.category)
            .then(function() {
               vm[facetName].newFacetValue = null;
                $('#newFacetValue' + index).focus();
            });
    };

    vm.removeValueExisting = function(facetName, facetValueIndex) {
        vm.category.xp.OC_Facets[facetName].Values.splice(facetValueIndex, 1);
        OrderCloud.Categories.Update(vm.category.ID, vm.category);
    };

    vm.toggleFacetRequired = function(facetName) {
            vm.category.xp.OC_Facets[facetName].isRequired = !vm.category.xp.OC_Facets[facetName].isRequired;
            OrderCloud.Categories.Update(vm.category.ID, vm.category);
    };

    vm.deleteFacet = function(facetName) {
        if(confirm('Are you sure you want to delete this facet?')) {
            if(Object.keys(vm.category.xp.OC_Facets).length === 1) {
                delete vm.category.xp.OC_Facets;
                OrderCloud.Categories.Update(vm.category.ID, vm.category)
                    .then(function(){
                    var keyName = 'xp.OC_Facets.' + vm.category.ID + '.' + facetName;
                    var filterObj = {};
                    filterObj[keyName] = '*';
                    OrderCloud.Products.List(null, 1, 100, null,null, filterObj)
                        .then(function(matchingProds) {
                            console.log(matchingProds)
                            angular.forEach(Underscore.uniq(matchingProds.Items, true, 'ID'), function(prod) {
                                delete prod.xp.OC_Facets[vm.category.ID];
                                OrderCloud.Products.Update(prod.ID, prod);
                            });
                        });
                });
            }
            else {
                delete vm.category.xp.OC_Facets[facetName];
                OrderCloud.Categories.Update(vm.category.ID, vm.category)
                    .then(function(){
                        var keyName = 'xp.OC_Facets.' + vm.category.ID + '.' + facetName;
                        var filterObj = {};
                        filterObj[keyName] = '*';
                        OrderCloud.Products.List(null, 1, 100, null,null, filterObj)
                            .then(function(matchingProds) {
                                angular.forEach(Underscore.uniq(matchingProds.Items, true, 'ID'), function(prod) {
                                    delete prod.xp.OC_Facets[vm.category.ID][facetName];
                                    OrderCloud.Products.Update(prod.ID, prod);
                                });
                            });
                    });
            }

        }
        else {
            //do nothing
        }

    };
}

function CategoryFacetsModalController($uibModalInstance) {
    var vm = this;
    vm.facetValues = [];
    vm.isRequired = false;
    vm.facetValue = null;
    vm.facet = null;

    vm.addValue = function() {
        if(vm.facetValue != null) {
            vm.facetValues.push(vm.facetValue);
            vm.facetValue = null;
            $( "#facetValue" ).focus();
        }
    };

    vm.removeValue = function(index) {
        vm.facetValues.splice(index, 1);
    };

    vm.save = function () {
        var facetToSave = {
            facet: vm.facet,
            facetValues: vm.facetValues,
            isRequired: vm.isRequired
        };
        $uibModalInstance.close(facetToSave);
    };

    vm.cancel = function () {
        $uibModalInstance.dismiss('cancel');
    };
}
