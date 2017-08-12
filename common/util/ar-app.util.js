(function () {

  /**
   * @ngdoc service
   * @name ArAppUtil
   * @author adailtonribeiro <adailton.ribeiro1@gmail.com>
   * @description Service responsible for providing useful functions.
   */
  angular.module('arUtil').service('ArAppUtil', function ($interval, $log, $state, $rootScope, $parse) {
    
    /**
     * @ngdoc method
     * @memberof ArAppUtil
     * @param {Object} scope Scope.
     * @param {String} String containing the attribute name to be identified the owner scope.
     * @description Function responsible for returning the owner scope of the attribute passed as parameter.
     */
    this.getScopeOwnerProperty = function (scope, attribute) {
      var firstAttribute = attribute.split('.')[0];
      if (!scope.hasOwnProperty(firstAttribute) && scope.$parent) {
        return this.getScopeOwnerProperty(scope.$parent, firstAttribute);
      }

      return scope;
    };

  });
})();