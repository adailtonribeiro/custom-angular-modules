# Custom AngularJS Modules

**ar-table** example:

```html
<ar-table id="idArTableProducts" 
    items="productsList"
    infinite-scroll-callback="pagedSearchFunction"
    selected-item-callback="selectItemFunction"
    save-item-callback="saveFunction"
    fixed-content="true" 
    message-records-not-found="product.record_not_found">
    <ar-table-header> 
        <ar-table-column-header>{{'name' | translate}}</ar-table-column-header>
    </ar-table-header> 
    <ar-table-row popover-page="'pages/product-detail.popup.html'">
        <ar-table-column field-rename="name"></ar-table-column>
    </ar-table-row> 
</ar-table>
```

**ar-combobox** example:

```html
<ar-combobox
    ng-model="productVersion.product.id"
    items="productList"
    description="description"
    infinite-scroll-callback="searchProduct"
    selected-item-callback="selectProduct"
    di-validator="required"
    ng-disabled="hasProject"
    link-callback="openLink"
</ar-combobox>
```