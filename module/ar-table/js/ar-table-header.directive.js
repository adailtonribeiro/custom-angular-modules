(function () {
  /**
   * @ngdoc directive
   * @name arTableHeader
   * @author adailtonribeiro <adailton.ribeiro1@gmail.com>
   * @requires arTable
   * @description Component that represents a table header based on the html component "thead".
   * @example       
   * <ar-table-header>
   *    <ar-table-column-header>{{'nome' | translate}}</ar-table-column-header>
   * </ar-table-header>
   */
  angular.module('arTable').directive('arTableHeader', function () {
    return {
    	template: 
    	'<table class="table table-header custom-header">' +
    		'<thead>' +
		  		'<tr ng-transclude>' +
		  		'</tr>' +
		  	'</thead>' +
	  	'</table>',
    	restrict: 'E',
      transclude: true,
      replace: true,
      scope: false
    };
  });
})();