(function () {
  /**
   * @ngdoc directive
   * @name arTableRow
   * @author adailtonribeiro <adailton.ribeiro1@gmail.com>
   * @requires arTable 
   * @description Component that represents a table row based on the html component "tr".
   * @example
   * <ar-table-row popover-page="'pages/product-detail.popup.html'">
   *    <ar-table-column field-rename="name"></ar-table-column>
   * </ar-table-row>
   */
  angular.module('arTable').directive('arTableRow', function ($parse, $document, $compile) {
    return {
      template: '<div class="div-table-body">'+
                '  <table class="table table-body" infinite-scroll="infiniteScrollCallback()" infinite-scroll-distance="0">' +
                '     <tbody ng-show="items.length">' +
                '       <tr ng-class="::getRowClass(item)" ng-transclude ng-repeat="item in items" uib-popover-template="{{popoverPage}}" ' +
                '        popover-trigger="mouseenter" popover-popup-delay="1000" popover-append-to-body="true"></tr>' +
                '     </tbody>' +
                '     <tfoot ng-show="!items.length && !busyArTable">' +
                '       <tr>' +
                '         <td>{{messageRecordsNotFound}}</td>' +
                '       </tr>' +
                '     </tfoot>' +
                '  </table>' +
                '</div>',
      restrict: 'E',
      transclude: true,
      replace: true,
      scope: false,
      compile: function compile(tElement, tAttrs, transclude) {
        return {
          pre: function (scope, rowElement, attrs, controller, transcludeFn) {
            scope.popoverPage = attrs.popoverPage;

            /**
             * @ngdoc method
             * @memberof arTableRow
             * @description Function responsible for checking if the table will have a fixed size, and then add the attributes related to infinitescroll.
             */
            function configureInfiniteScroll() {
              var tableInfinite = rowElement.find(">table");
              if(scope.fixedContent) {
                rowElement.css("height", scope.fixedContentHeight + "px");
                rowElement.addClass("fixed-height");
                tableInfinite.attr('infinite-scroll-parent', true);
              } else {
                tableInfinite.attr('infinite-scroll-container', "\'.main-content\'");
                tableInfinite.attr('infinite-scroll-disabled', "busyArTable");
              }
              $compile(tableInfinite)(scope);
            }
            
            configureInfiniteScroll();

            /**
             * Checks if the table is selectable, if selectable creates a click event for the table row.
             */
            if (scope.isSelectable === true) {
              rowElement.bind('click', function ($event) {
                scope.$apply(function () {
                  var targetElement = $event.target;
                  if (angular.element(targetElement).hasClass('text-line') === false) {
                    var rowSelected = angular.element(targetElement.parentElement);
                    var rows = rowElement.find('.item-selected');
                    rows.each(function (index, item) {
                      angular.element(item).removeClass('item-selected');
                    });
                    rowSelected.addClass('item-selected');
                  }
                });
              });
            }
            
            /**
             * @ngdoc method
             * @memberof arTableRow
             * @description Function responsible for returning the CSS class to the table row. 
             */
            scope.getRowClass = function(item){
              if (attrs.rowClass) {
                if(angular.isFunction(scope[attrs.rowClass])){
                  return scope[attrs.rowClass](item);
                } else {
                  return attrs.rowClass;
                }
              }
            };
          }
        };
      }
    };
  });
})();