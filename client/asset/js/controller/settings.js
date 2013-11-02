var app         = window.ogc;

app.module.controller('SettingsCtrl', function($scope) {
    $scope.settings = {};

    app.connection.on('auth', function (data) {
        $scope.settings = data.settings;
        $scope.$apply();
    });

    app.connection.on('update-profile', function (data) {
        $scope.settings = data.settings;
        $scope.$apply();
    });

    $scope.save = function () {
        app.connection.emit('save-settings', $scope.settings);
    };
    
    $scope.$watch('settings.notifications', function() {
        if ( app.notifications && $scope.settings.notifications )
        window.Notification.requestPermission();
    });
    
});