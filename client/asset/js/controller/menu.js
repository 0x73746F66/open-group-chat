var app         = window.ogc;

app.module.controller('MenuCtrl', function($scope) {
    $scope.auth  = false;
    $scope.image = "";
    $scope.alerts   = [];
    
    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
        var pad = ( 75 + ($scope.alerts.length*70) );
        jQuery('#messages').css('top', pad+'px');
    };
    
    app.connection.on('alert', function (data) {
        $scope.alerts.push(data);
        $scope.$apply();
        var pad = ( 75 + ($scope.alerts.length*70) );
        jQuery('#messages').css('top', pad+'px');
    });

    app.connection.on('auth', function (profile) {
        $scope.image = profile.image;
        $scope.auth  = true;
        $scope.$apply();
    });
    
});