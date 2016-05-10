angular.module('orderCloud')
    .factory('RepeatOrderFactory', RepeatOrderFactory)
    .controller('RepeatOrderCtrl', RepeatOrderController)
    .directive('ordercloudRepeatOrder', OrderCloudRepeatOrderDirective)
;

function RepeatOrderController($state, toastr, OrderCloud, RepeatOrderFactory) {
    var vm = this;
    vm.reorder = function(orderID, includebilling, includeshipping, clientid, userid, claims){
        var includeBilling = (includebilling === 'true');
        var includeShipping = (includeshipping === 'true');
        var userType = JSON.parse(atob(OrderCloud.Auth.ReadToken().split('.')[1])).usrtype;
        var CredentialsObject = {ClientID: clientid, UserID: userid, Claims: claims || null};
        if(userType === 'admin' && (!orderID || !clientid || !userid)){
            toastr.error('This directive is not configured correctly. orderID, clientID and userID are required attributes');
        }
        else if(userType == 'buyer' && (!orderID)) {
            toastr.error('This directive is not configured correctly. orderID is a required attribute', 'Error')
        }
        else{
            RepeatOrderFactory.CheckLineItemsValid(userType, orderID, CredentialsObject)
                .then(function(validLI){
                    RepeatOrderFactory.GetCurrentOrderLineItems(validLI)
                        .then(function(totalLI){
                            RepeatOrderFactory.Reorder(orderID, includeBilling, includeShipping, CredentialsObject, totalLI, userType)
                                .then(function(data){
                                    if(userType == 'buyer'){
                                        (includeBilling || includeShipping) ? $state.go('checkout', {}, {reload:true}) : $state.go('cart', {}, {reload:true});
                                    }
                                    else{
                                        toastr.success('Your reorder was successfully placed! The new order number is: ' + data[0] );
                                        $state.go('orderHistory', {}, {reload:true});
                                    }
                                });
                        })
                })
        }
    }
}

function RepeatOrderFactory($q, $resource, $localForage, toastr, OrderCloud, appname, LineItemHelpers, CurrentOrder){
    return {
        CheckLineItemsValid: CheckLineItemsValid,
        GetCurrentOrderLineItems: GetCurrentOrderLineItems,
        Reorder: Reorder
    };
    function CheckLineItemsValid(userType, originalOrderID, CredentialsObject){
        var dfd =$q.defer();
        ListAllProducts(CredentialsObject)
            .then(function (productList) {
                var productIds = [];
                angular.forEach(productList, function (product) {
                    productIds.push(product.ID);
                });
                LineItemHelpers.ListAll(originalOrderID)
                    .then(function (lineItemList) {
                        var invalidLI = [];
                        var validLI =[];
                        angular.forEach(lineItemList, function (li) {
                            (productIds.indexOf(li.ProductID) > -1) ? validLI.push(li) : invalidLI.push(li.ProductID);
                        });
                        if (validLI.length && invalidLI.length) {
                            toastr.warning("There are " + invalidLI.length + " product(s) in your cart that either no longer exist or you do not have permission to reorder, the order will process only with the products you are able to order. The ID's of the products that have been excluded are: " + invalidLI.toString());
                            dfd.resolve(validLI)
                        }
                        if (validLI.length && !invalidLI.length) {
                            dfd.resolve(validLI)
                        }
                        if (!validLI.length) {
                            toastr.error('The product(s) from the order you are trying to place either no longer exist or you do not have permission to reorder', 'Error');
                            dfd.reject();
                        }
                    })
            });
        return dfd.promise;

        function ListAllProducts(CredentialsObject){
            var dfd = $q.defer();
            var queue=[];
            ( (userType === 'buyer') ? OrderCloud.Me.ListProducts(null,null,1,100) : ListProductsAsAdmin(CredentialsObject) )
                .then(function(data){
                    var productList = data;
                    if (data.Meta.TotalPages > data.Meta.Page) {
                        var page = data.Meta.Page;
                        while (page < data.Meta.TotalPages) {
                            page += 1;
                            (userType === 'buyer') ? queue.push(OrderCloud.Me.ListProducts(null, null, page, 100)) : queue.push(ListProductsAsAdmin(CredentialsObject))
                        }
                    }
                    $q.all(queue)
                        .then(function (results) {
                            angular.forEach(results, function (result) {
                                productList.Items = [].concat(productList.Items, result.Items);
                            });
                            dfd.resolve(productList.Items);
                        })
                        .catch(function(err){
                            dfd.reject(err)
                        })
                });
            return dfd.promise;
        }
    }

    //TODO: Replace this with impersonation when it is fixed & remove $resource as dependency
    function ListProductsAsAdmin(CredentialsObject) {
        return OrderCloud.Users.GetAccessToken(CredentialsObject.UserID, {
                ClientID: CredentialsObject.ClientID,
                Claims: CredentialsObject.Claims ? CredentialsObject.Claims : ["FullAccess"]
            })
            .then(function (_token) {
                var dfd = $q.defer();
                $resource('https://api.ordercloud.io/v1/me/products',
                    {
                        'search':null,
                        'categoryID': null,
                        'page': 1,
                        'pageSize': 100
                    },
                    {
                        callApi: {
                            method: 'GET',
                            headers: {
                                'Authorization': 'Bearer ' + _token.access_token
                            }
                        }
                    }).callApi(null).$promise
                    .then(function(data) {
                        dfd.resolve(data);
                    })
                    .catch(function(ex){
                        dfd.reject(ex);
                    });
                return dfd.promise;
            });
    }

    function GetCurrentOrderLineItems(validLI){
        var dfd = $q.defer();
        var totalLI;
        //cant use CurrentOrder.GetID() because if there is not a current ID the promise is rejected which halts everything
        $localForage.getItem(appname + '.CurrentOrderID')
            .then(function(order_id){
                if(order_id){
                    LineItemHelpers.ListAll(order_id)
                        .then(function(li){
                            if(li.length){toastr.warning('The line items from your current order were added to this reorder.', 'Please be advised')}
                            totalLI = validLI.concat(li);
                            dfd.resolve(totalLI);
                        })
                        .catch(function(err){
                            dfd.reject(err)
                        });
                } else{
                    totalLI = validLI;
                    dfd.resolve(totalLI);
                }
            });
        return dfd.promise;
    }

    function Reorder(originalOrderID, includeBilling, includeShipping, CredentialsObject, totalLI, userType) {
        var dfd = $q.defer();
        OrderCloud.Orders.Get(originalOrderID)
            .then(function (data) {
                var billingAddress = data.BillingAddress;
                (userType === 'buyer' ? OrderCloud.Orders.Create({}) : CreateOrderAsAdmin() )
                    .then(function (data) {
                        var orderID = data.ID;
                        userType === 'buyer' ? CurrentOrder.Set(orderID) : angular.noop();
                        includeBilling ? OrderCloud.Orders.SetBillingAddress(orderID, billingAddress) : angular.noop();
                        var queue = [];
                        queue.push(orderID);
                        angular.forEach(totalLI, function (lineItem) {
                            delete lineItem.OrderID;
                            delete lineItem.ID;
                            delete lineItem.QuantityShipped;
                            delete lineItem.ShippingAddressID;
                            !includeShipping ? delete lineItem.ShippingAddress : angular.noop();
                            queue.push(OrderCloud.LineItems.Create(orderID, lineItem));
                        });
                        $q.all(queue)
                            .then(function (data) {
                                dfd.resolve(data);
                            })
                            .catch(function(err){
                                dfd.reject(err);
                            })
                    })
            });
        return dfd.promise;

        //TODO: replace this with impersonation when it is fixed & remove $resource as dependency
        function CreateOrderAsAdmin(){
            return OrderCloud.Users.GetAccessToken(CredentialsObject.UserID, {ClientID: CredentialsObject.ClientID, Claims: CredentialsObject.Claims ? CredentialsObject.Claims : ["FullAccess"]})
                .then(function(_token) {
                    var dfd = $q.defer();
                    $resource("https://api.ordercloud.io/v1/buyers/:buyerID/orders",
                        {'buyerID': OrderCloud.BuyerID.Get()},
                        {
                            callApi:{
                                method: 'POST',
                                headers: {
                                    'Authorization': 'Bearer ' + _token.access_token
                                }
                            }
                        }).callApi({}).$promise
                        .then(function(data){
                            dfd.resolve(data);
                        })
                        .catch(function(ex) {
                            dfd.reject(ex);
                        });
                    return dfd.promise;
                });
        }
    }
}

function OrderCloudRepeatOrderDirective() {
    return {
        restrict: 'E',
        templateUrl: 'repeatOrder/templates/repeatOrderDirective.tpl.html',
        controller: 'RepeatOrderCtrl',
        controllerAs: 'repeatOrder',
        scope: {
            orderid: '=',
            includebilling: '@',
            includeshipping: '@',
            clientid: '@',
            userid: '@',
            claims: '@'
        }
    }
}