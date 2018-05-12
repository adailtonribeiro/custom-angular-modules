(function(){
  /**
   * @ngdoc filter
   * @name highlight
   * @description Filter to add highlight to matching items on the search.
   */
  angular.module('diApp').filter('highlight', function($sce) {
    return function(text, phrase, selectedItem) {
      if(_.isEmpty(selectedItem)){
        if(text){
          if (phrase) text = text.replace(new RegExp('('+phrase+')', 'gi'),
          '<span class="highlighted">$1</span>');

          return $sce.trustAsHtml(text);        
        }
      }else{
        return text;
      }
    };
  });
})();