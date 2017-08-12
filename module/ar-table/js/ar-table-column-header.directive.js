(function(){
  /**
   * @ngdoc directive
   * @name arTableColumnHeader
   * @author adailtonribeiro <adailton.ribeiro1@gmail.com>
   * @requires arTableHeader
   * @description Component that represents a table column header based on the html component "th".
   * @param {String}
   *          width Percent value of the column header width, this value also will be applied to the corresponding column of the table body.
   * @example
   * <ar-table-column-header>{{'name' | translate}}</ar-table-column-header>
   */
  angular.module('arTable').directive('arTableColumnHeader', function($compile){
    return {
      template: '<th class="column-header" ng-transclude></th>',
      restrict: 'E',
      transclude: true,
      replace: true,
      scope: false,
      require: '?arTableHeader',
      link: function(scope, elem, attrs, controller, transcludeFn){
      	
      	/**
         * Check whether the table has multi-selection and adds a checkbox as the first element of the row.
         */
      	if(scope.tableWithMultiSelection && !elem.parent().children().first().hasClass("header-cbx")) {
      		var tdCheckBox = angular.element('<th class="column-header header-cbx" width="3%"></th>');
      		var inputCheckBox = angular.element('<input class="opt-allcbx" ng-model="headerCheckbox.option" type="checkbox" ng-click="checkSelectionAllCheckbox();">');
      		tdCheckBox.append(inputCheckBox);
      		elem.parent().prepend(tdCheckBox);
      		$compile(inputCheckBox)(scope);
        }

      	/**
      	 * If the element does not have an indication of width, this will be controlled automatically.
      	 */
        if (!elem.attr('width')) {
          var amountColumnsHeaders = 0;
          var amountPercentLess = 0;
          elem.parent().children().each(function(index, item){
            if (item.attributes.getNamedItem('width')) {
              amountPercentLess += parseInt(item.attributes.getNamedItem('width').nodeValue.replace('%', ''));
            } else {
              amountColumnsHeaders++;
            }
          });
          elem.attr('width', (100 - amountPercentLess) / amountColumnsHeaders + "%");
        }

      }
    };
  });
})();