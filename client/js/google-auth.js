var clientId = '504437119269.apps.googleusercontent.com';
var apiKey = 'AIzaSyAa4jBJ9FXmBAPXTN8CdC934D4yyAuvr7w';
var scopes = 'https://www.googleapis.com/auth/plus.me';
function handleClientLoad() {
  gapi.client.setApiKey(apiKey);
  window.setTimeout(checkAuth,1);
}
function checkAuth() {
  gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: true}, handleAuthResult);
}
function handleAuthResult(authResult) {
  var authorizeButton = document.getElementById('authorize-button');
  if (authResult && !authResult.error) {
    authorizeButton.style.visibility = 'hidden';
    makeApiCall();
  } else {
    authorizeButton.style.visibility = '';
    authorizeButton.onclick = handleAuthClick;
  }
}
function handleAuthClick(event) {
  gapi.auth.authorize({client_id: clientId, scope: scopes, immediate: false}, handleAuthResult);
  return false;
}
function makeApiCall() {
  gapi.client.load('plus', 'v1', function() {
      var request = gapi.client.plus.people.get({
          'userId': 'me'
            });
        request.execute(function(resp) {
            window.socket.emit('login', resp);
        });
    });
}