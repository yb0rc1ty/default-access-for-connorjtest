angular.module( 'orderCloud' )

    .config( AdminUsersConfig )
    .controller( 'AdminUsersCtrl', AdminUsersController )
    .controller( 'AdminUserEditCtrl', AdminUserEditController )
    .controller( 'AdminUserCreateCtrl', AdminUserCreateController )

;

function AdminUsersConfig( $stateProvider ) {
    $stateProvider
        .state( 'adminUsers', {
            parent: 'base',
            url: '/adminUsers',
            templateUrl:'adminUsers/templates/adminUsers.tpl.html',
            controller:'AdminUsersCtrl',
            controllerAs: 'adminUsers',
            data: {
                componentName: 'Admin Users'
            },
            resolve: {
                AdminUsersList: function(OrderCloud) {
                    return OrderCloud.AdminUsers.List();
                }
            }
        })
        .state( 'adminUsers.edit', {
            url: '/:adminuserid/edit',
            templateUrl:'adminUsers/templates/adminUserEdit.tpl.html',
            controller:'AdminUserEditCtrl',
            controllerAs: 'adminUserEdit',
            resolve: {
                SelectedAdminUser: function($stateParams, OrderCloud) {
                    return OrderCloud.AdminUsers.Get($stateParams.adminuserid);
                }
            }
        })
        .state( 'adminUsers.create', {
            url: '/create',
            templateUrl:'adminUsers/templates/adminUserCreate.tpl.html',
            controller:'AdminUserCreateCtrl',
            controllerAs: 'adminUserCreate'
        })
}

function AdminUsersController( AdminUsersList, TrackSearch ) {
    var vm = this;
    vm.list = AdminUsersList;
    vm.searching = function() {
        return TrackSearch.GetTerm() ? true : false;
    };
}

function AdminUserEditController( $exceptionHandler, $state, OrderCloud, SelectedAdminUser, toastr ) {
    var vm = this,
        adminuserid = SelectedAdminUser.ID;
    vm.adminUserName = SelectedAdminUser.Username;
    vm.adminUser = SelectedAdminUser;
    if(vm.adminUser.TermsAccepted != null) {
        vm.TermsAccepted = true;
    }

    vm.Submit = function() {
        OrderCloud.AdminUsers.Update(adminuserid, vm.adminUser)
            .then(function() {
                $state.go('adminUsers', {}, {reload:true});
                toastr.success('User Updated', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    };

    vm.Delete = function() {
        OrderCloud.AdminUsers.Delete(adminuserid)
            .then(function() {
                $state.go('adminUsers', {}, {reload:true});
                toastr.success('User Deleted', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    }
}

function AdminUserCreateController( $exceptionHandler, $state, OrderCloud, toastr ) {
    var vm = this;
    vm.adminUser = {Email:"", Password:""};
    vm.Submit = function() {
        var today = new Date();
        vm.adminUser.TermsAccepted = today;
        OrderCloud.AdminUsers.Create( vm.adminUser)
            .then(function() {
                $state.go('adminUsers', {}, {reload:true});
                toastr.success('User Created', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    }
}