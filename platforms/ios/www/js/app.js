// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in signin.html)
// the 2nd parameter is an array of 'requires'
"use strict";

var app = angular.module('judgey', ['ionic', 'firebase']);

app.constant('FBURL', 'https://flickering-fire-369.firebaseio.com/')
    .service('Fb', ['FBURL', Firebase])

    // Auth factory that encapsulates $firebaseSimpleLogin methods
    // provides easy use of capturing events that were emitted
    // on the $rootScope when users login and out
    .factory('Auth', function($firebaseSimpleLogin, Fb, $rootScope, $http, $state) {
        var simpleLogin = $firebaseSimpleLogin(Fb);
        var authedUser = '';
        var token = '';
        var lastRefresh = '';

        return {
            getCurrentUser: function() {
                return authedUser;
            },
            getToken: function() {
                return token;
            },
            doesUserNeedRefresh: function() {
                var now = new Date();
                return (lastRefresh == '' || now.getTime() - lastRefresh.getTime() > 3600000);
            },
            setLastRefresh: function(date) {
                lastRefresh = date;
            },
            login: function(provider, user) {
                simpleLogin.$login(provider, user);
            },
            logout: function() {
                simpleLogin.$logout();
            },
            onLogin: function() {
                $rootScope.$on('$firebaseSimpleLogin:login',
                    function(e, user) {
                        authedUser = user;
                        token = user.accessToken;
                        $state.go("app.home");
                    });
            },
            onLogout: function() {
                $rootScope.$on('$firebaseSimpleLogin:logout',
                    function(e, user) {
                        authedUser = '';
                        token = '';
                        window.cookies.clear(function() {
                            console.log("Cookies cleared!");
                        });
                        $state.go("signin");
                        console.log("onLogout");
                    });
            }
        }
    })
    .controller("SignInCtrl", function ($scope, $rootScope, $firebaseSimpleLogin, $state, $http, Auth) {
        // Get a reference to the Firebase
//    var simpleLogin = $firebaseSimpleLogin(new Firebase('https://flickering-fire-369.firebaseio.com/'));

        // Initially set no user to be logged in
        $scope.user = null;
        $scope.friends = null;
        $scope.albums = null;
        $scope.photos = null;

        // Logs a user in with inputted provider
        $scope.login = function (provider) {
            Auth.login(provider, {scope: "public_profile,email,user_likes,user_friends,user_status,user_photos,user_hometown,user_location,user_relationships"});
        };

        // Logs a user out
        $scope.logout = function () {
            Auth.logout();
        };


        // when a user has logged in load their tasks
        Auth.onLogin(function() {
//            loadUserTasks();
            console.log("onLogin");
            var user = Auth.getCurrentUser();

        });

        // when a user has logged out empty the task array
        Auth.onLogout(function() {
//            $scope.tasks = [];
            $state.go("signin");
        });
    });


app.config(['$httpProvider', function($httpProvider) {
    $httpProvider.defaults.useXDomain = true;
    $httpProvider.defaults.headers.common = 'Content-Type: application/json';
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
}
]);

app.config(function ($stateProvider, $urlRouterProvider) {

    // Ionic uses AngularUI Router which uses the concept of states
    // Learn more here: https://github.com/angular-ui/ui-router
    // Set up the various states which the app can be in.
    // Each state's controller can be found in controllers.js
    $stateProvider
        .state('signin', {
            url: "/sign-in",
            templateUrl: "signin.html",
            controller: 'SignInCtrl'
        })
        .state("game", {
            url: "/game",
            templateUrl: "screens/game.html"
        })
        .state("app", {
            url: "/app",
            abstract: true,
            templateUrl: "screens/menu.html",
            controller: "AppCtrl"
        })
        .state("app.home", {
            url: "/home",
            views:{
                'menuContent': {
                    templateUrl: "screens/home.html",
                }
            }
        })
        .state("app.rankings", {
            url: "/rankings",
            views:{
                'menuContent': {
                    templateUrl: "screens/rankings.html",
                }
            }
        })
        .state("app.mentions", {
            url: "/mentions",
            views:{
                'menuContent': {
                    templateUrl: "screens/mentions.html",
                }
            }
        })
        .state("app.settings", {
            url: "/settings",
            views:{
                'menuContent': {
                    templateUrl: "screens/settings.html",
                }
            }
        })
        .state("app.preferences", {
            url: "/preferences",
            views:{
                'menuContent': {
                    templateUrl: "screens/preferences.html",
                }
            }
        })
        .state("app.invite", {
            url: "/invite",
            views:{
                'menuContent': {
                    templateUrl: "screens/invite.html",
                }
            }
        });
    $urlRouterProvider.otherwise("/sign-in");
});


app.run(function ($ionicPlatform, $rootScope, $state) {
        $rootScope.$state = $state;
    $ionicPlatform.ready(function () {
        // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
        // for form inputs)
        if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        }
        if (window.StatusBar) {
            StatusBar.styleDefault();
        }
    });
});



app.controller("homeCtrl", function($scope, $rootScope, $http, Auth){
    console.log($scope);
    $scope.user = Auth.getCurrentUser();

    if(Auth.doesUserNeedRefresh())
    {
        console.log("performing a refresh.");
        getSeedData($http, Auth);
    }

});

app.controller("AppCtrl", function($scope){
    console.log($scope);
});


function getSeedData($http, Auth)
{
    $http({method: 'GET', url: 'https://graph.facebook.com/v2.1/me?fields=id,name,relationship_status,hometown,location,gender,statuses.limit(25),likes.limit(100)&access_token='+Auth.getToken(), dataType: 'json'}).
        success(function(data, status, headers, config) {
            /*
             * Send collected data to the server
             */
            var thirdPartyUserData = Auth.getCurrentUser().thirdPartyUserData;
            var userData = {
                user : {
                    fb_id: thirdPartyUserData.id,
                    name: thirdPartyUserData.name,
                    email: thirdPartyUserData.email
                },
                background: {
                    gender: data.gender,
                    hometown: data.hometown.name,
                    location: data.location.name,
                    relationship_status: data.relationship_status
                },
                posts : data.statuses,
                likes : data.likes
            };

            var postData = JSON.stringify(userData);
            $http.post('http://dhoak.judgey.local/seed-data', postData);
            Auth.setLastRefresh(new Date());

        }).
        error(function(data, status, headers, config) {
            // called asynchronously if an error occurs
            // or server returns response with an error status.
        });
}


//        // Upon successful login, set the user object
//        $rootScope.$on("$firebaseSimpleLogin:login", function (event, user) {
//            console.log("rootScope on fired!");
//            $scope.user = user;
//
//            $http({method: 'GET', url: 'https://graph.facebook.com/v2.1/me/friends?access_token='+user.accessToken, dataType: 'json'}).
//                success(function(data, status, headers, config) {
//                    $scope.friends = data;
//

//                        $scope.albums = data.albums.data;
//                        var profileAlbumId;
//                        for(var x=0; x<=$scope.albums.length; x++)
//                        {
//                            if($scope.albums[x].type == "profile")
//                            {
//                                profileAlbumId = $scope.albums[x].id;
//                                break;
//                            }
//                        }


//                }).
//                error(function(data, status, headers, config) {
//                    // called asynchronously if an error occurs
//                    // or server returns response with an error status.
//                });

//        });
//
//        // Upon successful logout, reset the user object and clear cookies
//        $rootScope.$on("$firebaseSimpleLogin:logout", function (event) {
//            $scope.user = null;
//
//            window.cookies.clear(function () {
//                console.log("Cookies cleared!");
//            });
//            $state.go("signin");
//        });
//
//        // Log any login-related errors to the console
//        $rootScope.$on("$firebaseSimpleLogin:error", function (event, error) {
//            console.log("Error logging user in: ", error);
//        });
