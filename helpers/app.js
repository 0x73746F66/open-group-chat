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
exports.defaultProfile = function(sid){
    return {
        id:     sid,
        gid:    false,
        name:   String('Anonymous'),
        color:  String('#333'),
        image:  String('/asset/img/anonymous.gif'),
        room:   String('Lobby'),
        settings: {
            notifications:  false,
            leave:          false,
            join:           true,
            login:          true,
            lobby:          false,
            messages:       10
        }
    };
};