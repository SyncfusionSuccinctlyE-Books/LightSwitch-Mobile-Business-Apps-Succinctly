/// <reference path="../Scripts/msls.js" />

window.myapp = msls.application;

(function (lightSwitchApplication) {

    var $Entity = msls.Entity,
        $DataService = msls.DataService,
        $DataWorkspace = msls.DataWorkspace,
        $defineEntity = msls._defineEntity,
        $defineDataService = msls._defineDataService,
        $defineDataWorkspace = msls._defineDataWorkspace,
        $DataServiceQuery = msls.DataServiceQuery,
        $toODataString = msls._toODataString;

    function Customer(entitySet) {
        /// <summary>
        /// Represents the Customer entity type.
        /// </summary>
        /// <param name="entitySet" type="msls.EntitySet" optional="true">
        /// The entity set that should contain this customer.
        /// </param>
        /// <field name="Id" type="Number">
        /// Gets or sets the id for this customer.
        /// </field>
        /// <field name="Name" type="String">
        /// Gets or sets the name for this customer.
        /// </field>
        /// <field name="Gender" type="String">
        /// Gets or sets the gender for this customer.
        /// </field>
        /// <field name="DateOfBirth" type="Date">
        /// Gets or sets the dateOfBirth for this customer.
        /// </field>
        /// <field name="FullProfile" type="String">
        /// Gets or sets the fullProfile for this customer.
        /// </field>
        /// <field name="Email" type="String">
        /// Gets or sets the email for this customer.
        /// </field>
        /// <field name="Phone" type="String">
        /// Gets or sets the phone for this customer.
        /// </field>
        /// <field name="Street" type="String">
        /// Gets or sets the street for this customer.
        /// </field>
        /// <field name="City" type="String">
        /// Gets or sets the city for this customer.
        /// </field>
        /// <field name="ZipCode" type="String">
        /// Gets or sets the zipCode for this customer.
        /// </field>
        /// <field name="Country" type="String">
        /// Gets or sets the country for this customer.
        /// </field>
        /// <field name="SatisfactionScore" type="String">
        /// Gets or sets the satisfactionScore for this customer.
        /// </field>
        /// <field name="AverageYearlySpending" type="String">
        /// Gets or sets the averageYearlySpending for this customer.
        /// </field>
        /// <field name="Orders" type="msls.EntityCollection" elementType="msls.application.Order">
        /// Gets the orders for this customer.
        /// </field>
        /// <field name="CreatedBy" type="String">
        /// Gets or sets the createdBy for this customer.
        /// </field>
        /// <field name="Created" type="Date">
        /// Gets or sets the created for this customer.
        /// </field>
        /// <field name="ModifiedBy" type="String">
        /// Gets or sets the modifiedBy for this customer.
        /// </field>
        /// <field name="Modified" type="Date">
        /// Gets or sets the modified for this customer.
        /// </field>
        /// <field name="RowVersion" type="Array">
        /// Gets or sets the rowVersion for this customer.
        /// </field>
        /// <field name="details" type="msls.application.Customer.Details">
        /// Gets the details for this customer.
        /// </field>
        $Entity.call(this, entitySet);
    }

    function Order(entitySet) {
        /// <summary>
        /// Represents the Order entity type.
        /// </summary>
        /// <param name="entitySet" type="msls.EntitySet" optional="true">
        /// The entity set that should contain this order.
        /// </param>
        /// <field name="Id" type="Number">
        /// Gets or sets the id for this order.
        /// </field>
        /// <field name="CreationDate" type="Date">
        /// Gets or sets the creationDate for this order.
        /// </field>
        /// <field name="Completed" type="Boolean">
        /// Gets or sets the completed for this order.
        /// </field>
        /// <field name="OrderTotal" type="String">
        /// Gets or sets the orderTotal for this order.
        /// </field>
        /// <field name="Customer" type="msls.application.Customer">
        /// Gets or sets the customer for this order.
        /// </field>
        /// <field name="CreatedBy" type="String">
        /// Gets or sets the createdBy for this order.
        /// </field>
        /// <field name="Created" type="Date">
        /// Gets or sets the created for this order.
        /// </field>
        /// <field name="ModifiedBy" type="String">
        /// Gets or sets the modifiedBy for this order.
        /// </field>
        /// <field name="Modified" type="Date">
        /// Gets or sets the modified for this order.
        /// </field>
        /// <field name="RowVersion" type="Array">
        /// Gets or sets the rowVersion for this order.
        /// </field>
        /// <field name="details" type="msls.application.Order.Details">
        /// Gets the details for this order.
        /// </field>
        $Entity.call(this, entitySet);
    }

    function ApplicationData(dataWorkspace) {
        /// <summary>
        /// Represents the ApplicationData data service.
        /// </summary>
        /// <param name="dataWorkspace" type="msls.DataWorkspace">
        /// The data workspace that created this data service.
        /// </param>
        /// <field name="Customers" type="msls.EntitySet">
        /// Gets the Customers entity set.
        /// </field>
        /// <field name="Orders" type="msls.EntitySet">
        /// Gets the Orders entity set.
        /// </field>
        /// <field name="details" type="msls.application.ApplicationData.Details">
        /// Gets the details for this data service.
        /// </field>
        $DataService.call(this, dataWorkspace);
    };
    function DataWorkspace() {
        /// <summary>
        /// Represents the data workspace.
        /// </summary>
        /// <field name="ApplicationData" type="msls.application.ApplicationData">
        /// Gets the ApplicationData data service.
        /// </field>
        /// <field name="details" type="msls.application.DataWorkspace.Details">
        /// Gets the details for this data workspace.
        /// </field>
        $DataWorkspace.call(this);
    };

    msls._addToNamespace("msls.application", {

        Customer: $defineEntity(Customer, [
            { name: "Id", type: Number },
            { name: "Name", type: String },
            { name: "Gender", type: String },
            { name: "DateOfBirth", type: Date },
            { name: "FullProfile", type: String },
            { name: "Email", type: String },
            { name: "Phone", type: String },
            { name: "Street", type: String },
            { name: "City", type: String },
            { name: "ZipCode", type: String },
            { name: "Country", type: String },
            { name: "SatisfactionScore", type: String },
            { name: "AverageYearlySpending", type: String },
            { name: "Orders", kind: "collection", elementType: Order },
            { name: "CreatedBy", type: String, isReadOnly: true },
            { name: "Created", type: Date, isReadOnly: true },
            { name: "ModifiedBy", type: String, isReadOnly: true },
            { name: "Modified", type: Date, isReadOnly: true },
            { name: "RowVersion", type: Array }
        ]),

        Order: $defineEntity(Order, [
            { name: "Id", type: Number },
            { name: "CreationDate", type: Date },
            { name: "Completed", type: Boolean },
            { name: "OrderTotal", type: String },
            { name: "Customer", kind: "reference", type: Customer },
            { name: "CreatedBy", type: String, isReadOnly: true },
            { name: "Created", type: Date, isReadOnly: true },
            { name: "ModifiedBy", type: String, isReadOnly: true },
            { name: "Modified", type: Date, isReadOnly: true },
            { name: "RowVersion", type: Array }
        ]),

        ApplicationData: $defineDataService(ApplicationData, lightSwitchApplication.rootUri + "/ApplicationData.svc", [
            { name: "Customers", elementType: Customer },
            { name: "Orders", elementType: Order }
        ], [
            {
                name: "Customers_SingleOrDefault", value: function (Id) {
                    return new $DataServiceQuery({ _entitySet: this.Customers },
                        lightSwitchApplication.rootUri + "/ApplicationData.svc" + "/Customers(" + "Id=" + $toODataString(Id, "Int32?") + ")"
                    );
                }
            },
            {
                name: "Orders_SingleOrDefault", value: function (Id) {
                    return new $DataServiceQuery({ _entitySet: this.Orders },
                        lightSwitchApplication.rootUri + "/ApplicationData.svc" + "/Orders(" + "Id=" + $toODataString(Id, "Int32?") + ")"
                    );
                }
            }
        ]),

        DataWorkspace: $defineDataWorkspace(DataWorkspace, [
            { name: "ApplicationData", type: ApplicationData }
        ])

    });

}(msls.application));
