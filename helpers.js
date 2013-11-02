exports.capitalize = function(str, allWords){
  if (allWords) {
    return str.split(' ').map(function(word){
      return exports.capitalize(word);
    }).join(' ');
  }
  return str.charAt(0).toUpperCase() + str.substr(1);
};
exports.camelcase = function(str, uppercaseFirst){
  return str.replace(/[^\w\d ]+/g, '').split(' ').map(function(word, i){
    if (i || (0 == i && uppercaseFirst)) {
      word = exports.capitalize(word);
    }
    return word;
  }).join('');
};
exports.underscore = function(str){
  return str.replace(/([a-z\d])([A-Z])/g, '$1_$2').toLowerCase();
};
exports.log = function (e) {
    console.log(e); // log to file !!!
};
exports.defaultProfile = function(gid) {
    return {
        gid:    gid || false,
        name:   'Anonymous',
        url:    '',
        color:  '#333',
        image:  '/asset/img/anonymous.gif',
        mod:    false,
        room:   'Lobby',
        settings: {
            notifications:  false,
            leave:          false,
            join:           false,
            login:          false,
            lobby:          false,
            messages:       10
        }
    };
};