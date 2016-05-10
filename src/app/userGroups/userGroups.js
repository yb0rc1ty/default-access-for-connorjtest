angular.module( 'orderCloud' )

    .config( UserGroupsConfig )
    .controller( 'UserGroupsCtrl', UserGroupsController )
    .controller( 'UserGroupEditCtrl', UserGroupEditController )
    .controller( 'UserGroupCreateCtrl', UserGroupCreateController )
    .controller( 'UserGroupAssignCtrl', UserGroupAssignController )

;
//TODO: listing users and adding users to a group.!!!

function UserGroupsConfig( $stateProvider ) {
    $stateProvider
        .state( 'userGroups', {
            parent: 'base',
            url: '/userGroups',
            templateUrl:'userGroups/templates/userGroups.tpl.html',
            controller:'UserGroupsCtrl',
            controllerAs: 'userGroups',
            data: {componentName: 'User Groups'},
            resolve: {
                UserGroupList: function(OrderCloud) {
                    return OrderCloud.UserGroups.List(null, 1, 20);
                }
            }
        })
        .state( 'userGroups.edit', {
            url: '/:userGroupid/edit',
            templateUrl:'userGroups/templates/userGroupEdit.tpl.html',
            controller:'UserGroupEditCtrl',
            controllerAs: 'userGroupEdit',
            resolve: {
                SelectedUserGroup: function($stateParams, OrderCloud) {
                    return OrderCloud.UserGroups.Get($stateParams.userGroupid);
                }
            }
        })
        .state( 'userGroups.create', {
            url: '/create',
            templateUrl:'userGroups/templates/userGroupCreate.tpl.html',
            controller:'UserGroupCreateCtrl',
            controllerAs: 'userGroupCreate'
        })
        .state('userGroups.assign', {
            url: '/:userGroupid/assign',
            templateUrl: 'userGroups/templates/userGroupAssign.tpl.html',
            controller: 'UserGroupAssignCtrl',
            controllerAs: 'userGroupAssign',
            resolve: {
                UserList: function (OrderCloud) {
                    return OrderCloud.Users.List(null, 1, 20);
                },
                AssignedUsers: function ($stateParams, OrderCloud) {
                    return OrderCloud.UserGroups.ListUserAssignments($stateParams.userGroupid);
                },
                SelectedUserGroup: function($stateParams, OrderCloud) {
                    return OrderCloud.UserGroups.Get($stateParams.userGroupid);
                }
            }
        })
}

function UserGroupsController( UserGroupList, TrackSearch ) {
    var vm = this;
    vm.list = UserGroupList;
    vm.searching = function() {
        return TrackSearch.GetTerm() ? true : false;
    };
}

function UserGroupEditController( $exceptionHandler, $state, OrderCloud, SelectedUserGroup, toastr ) {
    var vm = this,
        groupID = SelectedUserGroup.ID;
    vm.userGroupName = SelectedUserGroup.Name;
    vm.userGroup = SelectedUserGroup;

    vm.Submit = function() {
        OrderCloud.UserGroups.Update(groupID, vm.userGroup)
            .then(function() {
                $state.go('userGroups', {}, {reload:true});
                toastr.success('User Group Updated', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    };

    vm.Delete = function() {
        OrderCloud.UserGroups.Delete(SelectedUserGroup.ID)
            .then(function() {
                $state.go('userGroups', {}, {reload:true})
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    }
}

function UserGroupCreateController( $exceptionHandler, $state, OrderCloud, toastr ) {
    var vm = this;

    vm.Submit = function() {
        OrderCloud.UserGroups.Create(vm.userGroup)
            .then(function() {
                $state.go('userGroups', {}, {reload:true});
                toastr.success('User Group Created', 'Success');
            })
            .catch(function(ex) {
                $exceptionHandler(ex)
            });
    }
}

function UserGroupAssignController(OrderCloud, Assignments, Paging, UserList, AssignedUsers, SelectedUserGroup, toastr) {
    var vm = this;
    vm.UserGroup = SelectedUserGroup;
    vm.list = UserList;
    vm.assignments = AssignedUsers;
    vm.saveAssignments = SaveAssignment;
    vm.pagingfunction = PagingFunction;

    function SaveFunc(ItemID) {
        return OrderCloud.UserGroups.SaveUserAssignment({
            UserID: ItemID,
            UserGroupID: vm.UserGroup.ID
        });
    }

    function DeleteFunc(ItemID) {
        return OrderCloud.UserGroups.DeleteUserAssignment(vm.UserGroup.ID, ItemID);
    }

    function SaveAssignment() {
        toastr.success('Assignment Updated', 'Success');
        return Assignments.saveAssignments(vm.list.Items, vm.assignments.Items, SaveFunc, DeleteFunc, 'UserID');
    }

    function AssignmentFunc() {
        return OrderCloud.UserGroups.ListUserAssignments(vm.UserGroup.ID, null, vm.assignments.Meta.PageSize, 'UserID');
    }

    function PagingFunction() {
        return Paging.paging(vm.list, 'Users', vm.assignments, AssignmentFunc);
    }
}