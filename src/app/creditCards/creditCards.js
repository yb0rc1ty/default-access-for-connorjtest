angular.module( 'orderCloud' )


    .config( CreditCardsConfig )
    .factory('creditCardExpirationDate', creditCardExpirationDate)
    .controller( 'CreditCardsCtrl', CreditCardsController )
    .controller( 'CreditCardEditCtrl', CreditCardEditController )
    .controller( 'CreditCardCreateCtrl', CreditCardCreateController )
    .controller( 'CreditCardAssignCtrl', CreditCardAssignController )

;

function CreditCardsConfig( $stateProvider ) {
    $stateProvider
        .state( 'creditCards', {
            parent: 'base',
            url: '/creditCards',
            templateUrl:'creditCards/templates/creditCards.tpl.html',
            controller:'CreditCardsCtrl',
            controllerAs: 'creditCards',
            data: {componentName: 'Credit Cards'},
            resolve: {
                CreditCardList: function(OrderCloud) {
                    return OrderCloud.CreditCards.List();
                }
            }
        })
        .state( 'creditCards.edit', {
            url: '/:creditCardid/edit',
            templateUrl:'creditCards/templates/creditCardEdit.tpl.html',
            controller:'CreditCardEditCtrl',
            controllerAs: 'creditCardEdit',
            resolve: {
                SelectedCreditCard: function($stateParams, OrderCloud) {
                    return OrderCloud.CreditCards.Get($stateParams.creditCardid);
                }
            }
        })
        .state( 'creditCards.create', {
            url: '/create',
            templateUrl:'creditCards/templates/creditCardCreate.tpl.html',
            controller:'CreditCardCreateCtrl',
            controllerAs: 'creditCardCreate'
        })
        .state( 'creditCards.assign', {
            url: '/:creditCardid/assign',
            templateUrl: 'creditCards/templates/creditCardAssign.tpl.html',
            controller: 'CreditCardAssignCtrl',
            controllerAs: 'creditCardAssign',
            resolve: {
                Buyer: function(OrderCloud) {
                    return OrderCloud.Buyers.Get();
                },
                UserGroupList: function(OrderCloud) {
                    return OrderCloud.UserGroups.List(null, 1, 20);
                },
                AssignedUserGroups: function($stateParams, OrderCloud) {
                    return OrderCloud.CreditCards.ListAssignments($stateParams.creditCardid);
                },
                SelectedCreditCard: function($stateParams, OrderCloud) {
                    return OrderCloud.CreditCards.Get($stateParams.creditCardid);
                }
            }
        })
}

function CreditCardsController( CreditCardList ) {
    var vm = this;
    vm.list = CreditCardList;
}

function creditCardExpirationDate(){
    //return the expirationMonth array and its function
    var expirationDate={
        expirationMonth : [{number:1,string:'01'}, {number:2,string:'02'},{number:3,string:'03'},{number:4,string:'04'},{number:5,string:'05'},{number:6,string:'06'},{number:7,string:'07'},{number:8,string:'08'},{number:9,string:'09'},{number:10,string:'10'},{number:11,string:'11'},{number:12,string:'12'}],
        expirationYear : []
    };

    function _ccExpireYears(){
        var today = new Date();
        today = today.getFullYear();

        for(var x=today; x < today+21; x++) {
            expirationDate.expirationYear.push(x);
        }
        return expirationDate.expirationYear;
    }
    _ccExpireYears();
    return expirationDate;
}

function CreditCardEditController( $exceptionHandler, $state, OrderCloud, Underscore, SelectedCreditCard, toastr , creditCardExpirationDate) {
    var vm = this,
        creditcardid = SelectedCreditCard.ID;
    vm.expireMonth = creditCardExpirationDate.expirationMonth;
    vm.expireYear =creditCardExpirationDate.expirationYear;
    vm.creditCardName = SelectedCreditCard.ID;
    vm.creditCard = SelectedCreditCard;

    if(vm.creditCard.ExpirationDate != null){
        vm.creditCard.ExpirationDate = new Date(vm.creditCard.ExpirationDate);
    }
   vm.creditCard.selectedExpireMonth = Underscore.findWhere(vm.expireMonth,{number: vm.creditCard.ExpirationDate.getMonth() +1});
    vm.creditCard.selectedExpireYear = vm.expireYear[vm.expireYear.indexOf(vm.creditCard.ExpirationDate.getFullYear())];
    vm.creditCard.Token = "token";

    vm.Submit = function() {
        var expiration = new Date();
        expiration.setMonth(vm.creditCard.selectedExpireMonth.number -1);
        expiration.setYear(vm.creditCard.selectedExpireYear);
        vm.creditCard.ExpirationDate = expiration;

        OrderCloud.CreditCards.Update(creditcardid, vm.creditCard)
            .then(function() {
                $state.go('creditCards', {}, {reload:true});
                toastr.success('Credit Card Updated', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    };

    vm.Delete = function() {
        OrderCloud.CreditCards.Delete(SelectedCreditCard.ID)
            .then(function() {
                $state.go('creditCards', {}, {reload:true})
                toastr.success('Credit Card Deleted', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }
}

function CreditCardCreateController( $exceptionHandler, $state, OrderCloud, toastr, creditCardExpirationDate) {
    var vm = this;
    vm.expireMonth = creditCardExpirationDate.expirationMonth;
    vm.expireYear = creditCardExpirationDate.expirationYear;
    vm.creditCard = {};
    //TODO: stop faking the token
    vm.creditCard.Token = "token";

    vm.Submit= function(){
        var expiration = new Date();
        expiration.setMonth(vm.selectedExpireMonth.number -1);
        expiration.setYear(vm.selectedExpireYear);
        vm.creditCard.ExpirationDate = expiration;
        OrderCloud.CreditCards.Create(vm.creditCard)

            .then(function() {
                $state.go('creditCards', {}, {reload:true});
                toastr.success('Credit Card Created', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
    }

}

function CreditCardAssignController(OrderCloud, Buyer, UserGroupList, AssignedUserGroups, SelectedCreditCard, Assignments, Paging, toastr) {
    var vm = this;
    vm.buyer = Buyer;
    vm.assignBuyer = false;
    vm.list = UserGroupList;
    vm.assignments = AssignedUserGroups;
    vm.creditCard = SelectedCreditCard;
    vm.saveAssignments = SaveAssignments;
    vm.pagingfunction = PagingFunction;

    function SaveFunc(ItemID) {
        return OrderCloud.CreditCards.SaveAssignment({
            CreditCardID: vm.creditCard.ID,
            UserID: null,
            UserGroupID: ItemID
        });
    }

    function DeleteFunc(ItemID) {
        return OrderCloud.CreditCards.DeleteAssignment(vm.creditCard.ID, null, ItemID);
    }

    function SaveAssignments() {
        toastr.success('Assignment Updated', 'Success');
        return Assignments.saveAssignments(vm.list.Items, vm.assignments.Items, SaveFunc, DeleteFunc, 'UserGroupID');
    }

    function AssignFunc() {
        return OrderCloud.CreditCards.ListAssignments(vm.creditCard.ID, null, null, null, vm.assignments.Meta.Page + 1, vm.assignments.Meta.PageSize);
    }

    function PagingFunction() {
        return Paging.paging(vm.list, 'UserGroups', vm.assignments, AssignFunc);
    }
}
