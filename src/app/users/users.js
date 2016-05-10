angular.module( 'orderCloud' )

    .config( UsersConfig )
    .controller( 'UsersCtrl', UsersController )
    .controller( 'UserEditCtrl', UserEditController )
    .controller( 'UserCreateCtrl', UserCreateController )

;

function UsersConfig( $stateProvider ) {
    $stateProvider
        .state( 'users', {
            parent: 'base',
            url: '/users',
            templateUrl:'users/templates/users.tpl.html',
            controller:'UsersCtrl',
            controllerAs: 'users',
            data: {componentName: 'Users'},
            resolve: {
                UserList: function( OrderCloud ) {
                    return OrderCloud.Users.List();
                }
            }
        })
        .state( 'users.edit', {
            url: '/:userid/edit',
            templateUrl:'users/templates/userEdit.tpl.html',
            controller:'UserEditCtrl',
            controllerAs: 'userEdit',
            resolve: {
                SelectedUser: function( $stateParams, OrderCloud) {
                    return OrderCloud.Users.Get( $stateParams.userid);
                }
            }
        })
        .state( 'users.create', {
            url: '/create',
            templateUrl:'users/templates/userCreate.tpl.html',
            controller:'UserCreateCtrl',
            controllerAs: 'userCreate'
        })
}

function UsersController( UserList ) {
    var vm = this;
    vm.list = UserList;
}

function UserEditController( $exceptionHandler, $state, OrderCloud, SelectedUser, toastr ) {
    var vm = this,
        userid = SelectedUser.ID;
    vm.userName = SelectedUser.Username;
    vm.user = SelectedUser;
    if(vm.user.TermsAccepted != null) {
        vm.TermsAccepted = true;
    }

    vm.Submit = function() {
        var today = new Date();
        vm.user.TermsAccepted = today;
        OrderCloud.Users.Update(userid, vm.user)
            .then(function() {
                $state.go('users', {}, {reload:true});
                toastr.success('User Updated', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    };

    vm.Delete = function() {
        OrderCloud.Users.Delete(userid)
            .then(function() {
                $state.go('users', {}, {reload:true});
                toastr.success('User Deleted', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    }
}

function UserCreateController( $exceptionHandler, $state, OrderCloud, toastr ) {
    var vm = this;
    vm.user = {Email:"", Password:""};
    vm.user.Active = false;
    vm.Submit = function() {
        var today = new Date();
        vm.user.TermsAccepted = today;
        OrderCloud.Users.Create( vm.user)
            .then(function() {
                $state.go('users', {}, {reload:true});
                toastr.success('User Created', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    }
}