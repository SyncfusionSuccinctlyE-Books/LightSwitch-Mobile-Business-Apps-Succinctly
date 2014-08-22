/// <reference path="data.js" />

(function (lightSwitchApplication) {

    var $Screen = msls.Screen,
        $defineScreen = msls._defineScreen,
        $DataServiceQuery = msls.DataServiceQuery,
        $toODataString = msls._toODataString,
        $defineShowScreen = msls._defineShowScreen;

    function AddEditCustomer(parameters, dataWorkspace) {
        /// <summary>
        /// Represents the AddEditCustomer screen.
        /// </summary>
        /// <param name="parameters" type="Array">
        /// An array of screen parameter values.
        /// </param>
        /// <param name="dataWorkspace" type="msls.application.DataWorkspace" optional="true">
        /// An existing data workspace for this screen to use. By default, a new data workspace is created.
        /// </param>
        /// <field name="Customer" type="msls.application.Customer">
        /// Gets or sets the customer for this screen.
        /// </field>
        /// <field name="OpenOrders" type="msls.VisualCollection" elementType="msls.application.Order">
        /// Gets the openOrders for this screen.
        /// </field>
        /// <field name="OpenOrderMessage" type="String">
        /// Gets or sets the openOrderMessage for this screen.
        /// </field>
        /// <field name="details" type="msls.application.AddEditCustomer.Details">
        /// Gets the details for this screen.
        /// </field>
        if (!dataWorkspace) {
            dataWorkspace = new lightSwitchApplication.DataWorkspace();
        }
        $Screen.call(this, dataWorkspace, "AddEditCustomer", parameters);
    }

    function BrowseCustomers(parameters, dataWorkspace) {
        /// <summary>
        /// Represents the BrowseCustomers screen.
        /// </summary>
        /// <param name="parameters" type="Array">
        /// An array of screen parameter values.
        /// </param>
        /// <param name="dataWorkspace" type="msls.application.DataWorkspace" optional="true">
        /// An existing data workspace for this screen to use. By default, a new data workspace is created.
        /// </param>
        /// <field name="Customers" type="msls.VisualCollection" elementType="msls.application.Customer">
        /// Gets the customers for this screen.
        /// </field>
        /// <field name="HapinessFactor" type="String">
        /// Gets or sets the hapinessFactor for this screen.
        /// </field>
        /// <field name="HappinessLevel" type="Number">
        /// Gets or sets the happinessLevel for this screen.
        /// </field>
        /// <field name="details" type="msls.application.BrowseCustomers.Details">
        /// Gets the details for this screen.
        /// </field>
        if (!dataWorkspace) {
            dataWorkspace = new lightSwitchApplication.DataWorkspace();
        }
        $Screen.call(this, dataWorkspace, "BrowseCustomers", parameters);
    }

    msls._addToNamespace("msls.application", {

        AddEditCustomer: $defineScreen(AddEditCustomer, [
            { name: "Customer", kind: "local", type: lightSwitchApplication.Customer },
            {
                name: "OpenOrders", kind: "collection", elementType: lightSwitchApplication.Order,
                getNavigationProperty: function () {
                    if (this.owner.Customer) {
                        return this.owner.Customer.details.properties.Orders;
                    }
                    return null;
                },
                appendQuery: function () {
                    return this.filter("Completed eq false").orderBy("CreationDate");
                }
            },
            { name: "OpenOrderMessage", kind: "local", type: String }
        ], [
            { name: "HowDoIGetThere" }
        ]),

        BrowseCustomers: $defineScreen(BrowseCustomers, [
            {
                name: "Customers", kind: "collection", elementType: lightSwitchApplication.Customer,
                createQuery: function (MinimumSatisfactionScore) {
                    return this.dataWorkspace.ApplicationData.Customers.filter("" + ((MinimumSatisfactionScore === undefined || MinimumSatisfactionScore === null) ? "true" : "((SatisfactionScore ne null) and (SatisfactionScore ge " + $toODataString(MinimumSatisfactionScore, "Decimal?") + "))") + "");
                }
            },
            { name: "HapinessFactor", kind: "local", type: String },
            { name: "HappinessLevel", kind: "local", type: Number }
        ], [
            { name: "AddCustomer_Tap" }
        ]),

        showAddEditCustomer: $defineShowScreen(function showAddEditCustomer(Customer, options) {
            /// <summary>
            /// Asynchronously navigates forward to the AddEditCustomer screen.
            /// </summary>
            /// <param name="options" optional="true">
            /// An object that provides one or more of the following options:<br/>- beforeShown: a function that is called after boundary behavior has been applied but before the screen is shown.<br/>+ Signature: beforeShown(screen)<br/>- afterClosed: a function that is called after boundary behavior has been applied and the screen has been closed.<br/>+ Signature: afterClosed(screen, action : msls.NavigateBackAction)
            /// </param>
            /// <returns type="WinJS.Promise" />
            var parameters = Array.prototype.slice.call(arguments, 0, 1);
            return lightSwitchApplication.showScreen("AddEditCustomer", parameters, options);
        }),

        showBrowseCustomers: $defineShowScreen(function showBrowseCustomers(options) {
            /// <summary>
            /// Asynchronously navigates forward to the BrowseCustomers screen.
            /// </summary>
            /// <param name="options" optional="true">
            /// An object that provides one or more of the following options:<br/>- beforeShown: a function that is called after boundary behavior has been applied but before the screen is shown.<br/>+ Signature: beforeShown(screen)<br/>- afterClosed: a function that is called after boundary behavior has been applied and the screen has been closed.<br/>+ Signature: afterClosed(screen, action : msls.NavigateBackAction)
            /// </param>
            /// <returns type="WinJS.Promise" />
            var parameters = Array.prototype.slice.call(arguments, 0, 0);
            return lightSwitchApplication.showScreen("BrowseCustomers", parameters, options);
        })

    });

}(msls.application));
