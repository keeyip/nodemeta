module.exports = {
    translate: function(s) {
      var translationError = function(m, i) { console.error("Translation error - please tell Alex about this!"); throw fail },
          tree             = BSOMetaJSParser.matchAll(s, "topLevel", undefined, function(m, i) {
                                                                                  throw objectThatDelegatesTo(fail, {errorPos: i}) })
      return BSOMetaJSTranslator.match(tree, "trans", undefined, translationError)
    }
};

