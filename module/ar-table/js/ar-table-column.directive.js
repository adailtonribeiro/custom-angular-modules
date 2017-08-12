(function () {
  /**
   * @ngdoc directive
   * @name arTableColumn
   * @author adailtonribeiro <adailton.ribeiro1@gmail.com>
   * @requires arTableRow
   * @description Column component that represents a table column based on the html component "td".
   * @param {String}
   *          field-rename Attribute name of the item that will be used to rename directly in the table row.       
   * @example
   * 
   * Example 1 when you want to have a editable column:
   * <ar-table-column field-rename="nome"></ar-table-column>
   * 
   * Example 2 when you want to have a view-only column:
   * <ar-table-column>{{item.nome}}</ar-table-column>
   */
  angular.module('arTable').directive(
    'arTableColumn',
    function ($parse, $timeout, $filter, $compile, KeyCodeEvent) {
      return {
        template: '<td class="column" title-nowrap ng-transclude></td>',
        restrict: 'E',
        transclude: true,
        replace: true,
        scope: false,
        require: '?arTableRow',
        link: function (scope, columnElement, attrs, controller, transcludeFn) {

          var columnElementAngular = angular.element(columnElement);
          var rowElement = columnElementAngular.parent();
          var scopeRow = scope.$parent;
          var item = scopeRow.item;
          scope.item = item;

          /**
           * Checks whether the table has multi selection and adds a checkbox as the first element of the row.
           */
          if (scope.tableWithMultiSelection && !rowElement.children().first().hasClass("opt-cbx")) {
            var tdCheckBox = angular.element('<td class="column opt-cbx" width="3%"></td>');
            var inputCheckBox = angular.element('<input type="checkbox" id="cbx_'+ item.$$hashKey.split(":")[1] +'" ng-checked="item.checkboxVal" ng-click="checkSelectionIndividualCheckbox(item);">');
            tdCheckBox.append(inputCheckBox);
            rowElement.prepend(tdCheckBox);
            $compile(inputCheckBox)(scope);
          }

          var columnHeaderList = angular.element('.column-header', columnElement.parents('ar-table'));
          var columnList = columnElement.parent().children();

          /**
           * Checks if the column has the property "width" informed, case false will be used the header width.
           */
          if (!columnElement.attr('width')) {
            var indexColumn = columnList.index(columnElement);
            var columnHeader = columnHeaderList.get(indexColumn);
            if (columnHeader && columnHeader.attributes.getNamedItem('width') !== undefined) {
              columnElement.attr('width', columnHeader.attributes.getNamedItem('width').value);
            }
          }

          /**
           * @ngdoc method
           * @memberof arTableColumn
           * @param {Element} inputElemnt Input element.
           * @description Mark as invalid the column input to be used by the validator. 
           */
          function invalidateComponentInput(inputElemnt) {
            inputElemnt.removeClass('ng-valid');
            inputElemnt.addClass('ng-invalid');
          }
          
          /**
           * @ngdoc method
           * @memberof arTableColumn
           * @param {Element} inputElemnt Input element.
           * @description Mark as valid the column input to be used by the validator. 
           */
          function validateComponentInput(inputElemnt) {
            inputElemnt.removeClass('ng-invalid');
            inputElemnt.addClass('ng-valid');
          }

          /**
           * @ngdoc method
           * @param {Scope} scopeRow Scope bound with the row.
           * @param {String} modelName Model name from the column.
           * @memberof arTableColumn
           * @description Return the value of the field corresponding to the model name.
           */
          function getFieldValue(scopeRow, modelName) {
            return $parse(modelName)(scopeRow) !== undefined ? $parse(modelName)(scopeRow) : $filter('translate')("mark_attribute_empty");
          }

          /**
           * @ngdoc method
           * @memberof arTableColumn
           * @param {Element} columnElement Table column.
           * @description Add a non-editable field to the corresponding column.
           */
          function addFieldNotEditable(columnElement) {
            columnElement.children().detach();
            var nonEditableField = angular.element('<a class="text-line">' + getFieldValue(scopeRow, "item." + columnElement.attr('field-rename')) + '</a>');
            columnElement.append(nonEditableField);
          }
          
          /**
           * @ngdoc method
           * @memberof arTableColumn
           * @param {Element} columnElement Table column.
           * @description Add an editable field to the corresponding column.
           */
          function addFieldEditable(columnElement) {
            var modelName = "item." + columnElement.attr('field-rename');
            var fieldValue = getFieldValue(scopeRow, modelName);
            var divRow = angular.element('<div class="row"  style="min-height: 36px;"></div>');
            var divFormGroup = angular.element('<div class="form-group col-xs-12" style="min-height: 36px;"></div>');
            var input = angular.element('<input type="text" class="form-control ng-valid" maxlength="160"></input>');
            input.on('input', function(event) {
              if (!input.val()) {
                invalidateComponentInput(input);
              } else {
                validateComponentInput(input);
              }
            });
            input.val(fieldValue);
            divFormGroup.append(input);
            divRow.append(divFormGroup);
            columnElement.children().detach();
            columnElement.append(divFormGroup);

            return input;
          }

          /**
           * @ngdoc method
           * @memberof arTableColumn
           * @param {Element} columnElement Table column.
           * @description Make the input field from within the column editable.
           */
          function makeFieldEditable(columnElement) {
            var input = addFieldEditable(columnElement);
            input.focus();
            input.bind('blur', function ($event) {
              if (!input.attr('eventEnterInProcess')) {
                saveRenameOnBlur($event, item, input);
              }
            });
            input.bind('keypress', function ($event) {
              if ($event.keyCode == KeyCodeEvent.ENTER) {
                input.attr('eventEnterInProcess', true);
                saveRenameOnEnter($event, item, input);
              }
            });
          }

          /**
           * @ngdoc method
           * @memberof arTableColumn
           * @param {Element} columnElement Table column.
           * @param {Object} item Item attached to the row.
           * @description Makes the input field from the column inside non-editable.
           */
          function makeFieldNotEditable(columnElement, item) {
            $timeout(function () {
              addFieldNotEditable(columnElement);
            }, 50);
            columnElement.parent().removeClass('item-selected');
            columnElement.removeAttr('selected');
            item.editable = false;
            if (scope.isSelectable) {
              scopeRow.selectedItemCallback({
                id: null
              }, true);
            }
            if (!scope.$$phase)
              scope.$apply();
          }
          
          /**
           * @ngdoc method
           * @memberof arTableColumn
           * @param {Object} item Item attached to the row.
           * @param {Element} input Input inside the column.
           * @param {Event} $event Function to be called in case of error.
           * @description Performs the action of saving the rename of the field by calling the callback "saveItemCallback".
           */
          function saveRename(item, input, errorCallback){
            if(!item.previousValueName){
              item.previousValueName = item[columnElement.attr('field-rename')];
            }
            item[columnElement.attr('field-rename')] = input.val();
            scopeRow.saveItemCallback(item).then(function (response) {
              item.versao = response.data.resultado.versao;
              makeFieldNotEditable(columnElement, item);
            }, errorCallback);
          }

          /**
           * @ngdoc method
           * @memberof arTableColumn
           * @param {Event} $event Save action event.
           * @param {Object} item Item attached to the row.
           * @param {Element} input Input attached to the column.
           * @description Performs the action of saving the new value of the field called by the ON_BLUR event.
           */
          function saveRenameOnBlur($event, item, input) {
            if (!input.val()) {
              makeFieldNotEditable(columnElement, item);
            } else {
              saveRename(item, input, function errorCallback(response) {
                item[columnElement.attr('field-rename')] = item.previousValueName;
                makeFieldNotEditable(columnElement, item);
              });
            }
          }
          
          /**
           * @ngdoc method
           * @memberof arTableColumn
           * @param {Event} $event Save action event.
           * @param {Object} item Item attached to the row.
           * @param {Element} input Input attached to the column.
           * @description Performs the action of saving the new value of the field called by the ON_ENTER event.
           */
          function saveRenameOnEnter($event, item, input) {
            if (!input.val()) {
              input.attr('eventEnterInProcess', null);
              invalidateComponentInput(input);
            } else {
              saveRename(item, input, function errorCallback(response) {
                input.attr('eventEnterInProcess', null);
                invalidateComponentInput(input);
              });
            }
          }

          /**
           * Bind the click event to the row parent.
           */
          if (rowElement !== undefined) {
            rowElement.unbind('click');
            rowElement.bind('click', function ($event) {
              var target = angular.element($event.target);
              if (scope.isSelectable) {
                var isRename = !target.hasClass('text-line');
                if (isRename) {
                  $timeout(function () {
                    scopeRow.selectedItemCallback(item, true);
                  }, 500);
                } else {
                  scopeRow.selectedItemCallback(item, false);
                }
              }
            });
          }

          /**
           * If the column element has the "field-rename" property, it makes the column editable.
           */
          if (columnElement.attr('field-rename')) {
            addFieldNotEditable(columnElement);

            columnElement.bind('click', function ($event) {
              columnElement.attr('selected', true);
            });

            scopeRow.$watch("item.editable", function (newValue, oldValue) {
              if (oldValue !== newValue === true && columnElement.attr('selected')) {
                makeFieldEditable(columnElement);
              }
            });

            scopeRow.$watch("item.deleted", function (newValue, oldValue) {
              if (oldValue !== newValue && newValue === true) {
                scope.items.splice(scope.items.indexOf(scope.item), 1);
                item.deleted = false;
              }
            });
          } else {
              var columnElementRename = rowElement.find('[field-rename]');
              if (columnElementRename[0]) {
                columnElement.bind('click', function ($event) {
                  if($event.target.tagName !== 'td'){
                    $event.stopPropagation();
                  }
                  columnElementRename.trigger( "click" );
                });
              }
          }
        }
      };
    });
})();