/// <reference path="viewModel.js" />

(function (lightSwitchApplication) {

    var $element = document.createElement("div");

    lightSwitchApplication.AddEditCustomer.prototype._$contentItems = {
        Tabs: {
            _$class: msls.ContentItem,
            _$name: "Tabs",
            _$parentName: "RootContentItem",
            screen: lightSwitchApplication.AddEditCustomer
        },
        Details: {
            _$class: msls.ContentItem,
            _$name: "Details",
            _$parentName: "Tabs",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.AddEditCustomer,
            value: lightSwitchApplication.AddEditCustomer
        },
        OpenOrderMessage: {
            _$class: msls.ContentItem,
            _$name: "OpenOrderMessage",
            _$parentName: "Details",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.AddEditCustomer,
            value: String
        },
        columns: {
            _$class: msls.ContentItem,
            _$name: "columns",
            _$parentName: "Details",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.AddEditCustomer,
            value: lightSwitchApplication.Customer
        },
        left: {
            _$class: msls.ContentItem,
            _$name: "left",
            _$parentName: "columns",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: lightSwitchApplication.Customer
        },
        Name: {
            _$class: msls.ContentItem,
            _$name: "Name",
            _$parentName: "left",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: String
        },
        Gender: {
            _$class: msls.ContentItem,
            _$name: "Gender",
            _$parentName: "left",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: String
        },
        DateOfBirth: {
            _$class: msls.ContentItem,
            _$name: "DateOfBirth",
            _$parentName: "left",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: Date
        },
        FullProfile: {
            _$class: msls.ContentItem,
            _$name: "FullProfile",
            _$parentName: "left",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: String
        },
        Email: {
            _$class: msls.ContentItem,
            _$name: "Email",
            _$parentName: "left",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: String
        },
        Phone: {
            _$class: msls.ContentItem,
            _$name: "Phone",
            _$parentName: "left",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: String
        },
        right: {
            _$class: msls.ContentItem,
            _$name: "right",
            _$parentName: "columns",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: lightSwitchApplication.Customer
        },
        Street: {
            _$class: msls.ContentItem,
            _$name: "Street",
            _$parentName: "right",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: String
        },
        City: {
            _$class: msls.ContentItem,
            _$name: "City",
            _$parentName: "right",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: String
        },
        ZipCode: {
            _$class: msls.ContentItem,
            _$name: "ZipCode",
            _$parentName: "right",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: String
        },
        Country: {
            _$class: msls.ContentItem,
            _$name: "Country",
            _$parentName: "right",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: String
        },
        SatisfactionScore: {
            _$class: msls.ContentItem,
            _$name: "SatisfactionScore",
            _$parentName: "right",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: String
        },
        AverageYearlySpending: {
            _$class: msls.ContentItem,
            _$name: "AverageYearlySpending",
            _$parentName: "right",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.Customer,
            value: String
        },
        OrderSummary: {
            _$class: msls.ContentItem,
            _$name: "OrderSummary",
            _$parentName: "Tabs",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.AddEditCustomer,
            value: lightSwitchApplication.AddEditCustomer
        },
        Customer_Id: {
            _$class: msls.ContentItem,
            _$name: "Customer_Id",
            _$parentName: "OrderSummary",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.AddEditCustomer,
            value: Number
        },
        Address: {
            _$class: msls.ContentItem,
            _$name: "Address",
            _$parentName: "Tabs",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.AddEditCustomer,
            value: lightSwitchApplication.AddEditCustomer
        },
        Customer: {
            _$class: msls.ContentItem,
            _$name: "Customer",
            _$parentName: "Address",
            screen: lightSwitchApplication.AddEditCustomer,
            data: lightSwitchApplication.AddEditCustomer,
            value: lightSwitchApplication.Customer
        },
        Popups: {
            _$class: msls.ContentItem,
            _$name: "Popups",
            _$parentName: "RootContentItem",
            screen: lightSwitchApplication.AddEditCustomer
        }
    };

    msls._addEntryPoints(lightSwitchApplication.AddEditCustomer, {
        /// <field>
        /// Called when a new AddEditCustomer screen is created.
        /// <br/>created(msls.application.AddEditCustomer screen)
        /// </field>
        created: [lightSwitchApplication.AddEditCustomer],
        /// <field>
        /// Called before changes on an active AddEditCustomer screen are applied.
        /// <br/>beforeApplyChanges(msls.application.AddEditCustomer screen)
        /// </field>
        beforeApplyChanges: [lightSwitchApplication.AddEditCustomer],
        /// <field>
        /// Called to determine if the HowDoIGetThere method can be executed.
        /// <br/>canExecute(msls.application.AddEditCustomer screen)
        /// </field>
        HowDoIGetThere_canExecute: [lightSwitchApplication.AddEditCustomer],
        /// <field>
        /// Called to execute the HowDoIGetThere method.
        /// <br/>execute(msls.application.AddEditCustomer screen)
        /// </field>
        HowDoIGetThere_execute: [lightSwitchApplication.AddEditCustomer],
        /// <field>
        /// Called after the Details content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Details_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("Details"); }],
        /// <field>
        /// Called after the OpenOrderMessage content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        OpenOrderMessage_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("OpenOrderMessage"); }],
        /// <field>
        /// Called after the columns content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        columns_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("columns"); }],
        /// <field>
        /// Called after the left content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        left_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("left"); }],
        /// <field>
        /// Called after the Name content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Name_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("Name"); }],
        /// <field>
        /// Called after the Gender content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Gender_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("Gender"); }],
        /// <field>
        /// Called after the DateOfBirth content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        DateOfBirth_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("DateOfBirth"); }],
        /// <field>
        /// Called after the FullProfile content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        FullProfile_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("FullProfile"); }],
        /// <field>
        /// Called after the Email content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Email_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("Email"); }],
        /// <field>
        /// Called after the Phone content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Phone_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("Phone"); }],
        /// <field>
        /// Called after the right content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        right_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("right"); }],
        /// <field>
        /// Called after the Street content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Street_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("Street"); }],
        /// <field>
        /// Called after the City content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        City_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("City"); }],
        /// <field>
        /// Called after the ZipCode content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        ZipCode_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("ZipCode"); }],
        /// <field>
        /// Called after the Country content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Country_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("Country"); }],
        /// <field>
        /// Called after the SatisfactionScore content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        SatisfactionScore_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("SatisfactionScore"); }],
        /// <field>
        /// Called after the AverageYearlySpending content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        AverageYearlySpending_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("AverageYearlySpending"); }],
        /// <field>
        /// Called after the OrderSummary content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        OrderSummary_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("OrderSummary"); }],
        /// <field>
        /// Called to render the Customer_Id content item.
        /// <br/>render(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Customer_Id_render: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("Customer_Id"); }],
        /// <field>
        /// Called after the Address content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Address_postRender: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("Address"); }],
        /// <field>
        /// Called to render the Customer content item.
        /// <br/>render(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Customer_render: [$element, function () { return new lightSwitchApplication.AddEditCustomer().findContentItem("Customer"); }]
    });

    lightSwitchApplication.BrowseCustomers.prototype._$contentItems = {
        Tabs: {
            _$class: msls.ContentItem,
            _$name: "Tabs",
            _$parentName: "RootContentItem",
            screen: lightSwitchApplication.BrowseCustomers
        },
        CustomerList: {
            _$class: msls.ContentItem,
            _$name: "CustomerList",
            _$parentName: "Tabs",
            screen: lightSwitchApplication.BrowseCustomers,
            data: lightSwitchApplication.BrowseCustomers,
            value: lightSwitchApplication.BrowseCustomers
        },
        Customers: {
            _$class: msls.ContentItem,
            _$name: "Customers",
            _$parentName: "CustomerList",
            screen: lightSwitchApplication.BrowseCustomers,
            data: lightSwitchApplication.BrowseCustomers,
            value: {
                _$class: msls.VisualCollection,
                screen: lightSwitchApplication.BrowseCustomers,
                _$entry: {
                    elementType: lightSwitchApplication.Customer
                }
            }
        },
        CustomersTemplate: {
            _$class: msls.ContentItem,
            _$name: "CustomersTemplate",
            _$parentName: "Customers",
            screen: lightSwitchApplication.BrowseCustomers,
            data: lightSwitchApplication.Customer,
            value: lightSwitchApplication.Customer
        },
        SatisfactionScore: {
            _$class: msls.ContentItem,
            _$name: "SatisfactionScore",
            _$parentName: "CustomersTemplate",
            screen: lightSwitchApplication.BrowseCustomers,
            data: lightSwitchApplication.Customer,
            value: String
        },
        Name: {
            _$class: msls.ContentItem,
            _$name: "Name",
            _$parentName: "CustomersTemplate",
            screen: lightSwitchApplication.BrowseCustomers,
            data: lightSwitchApplication.Customer,
            value: String
        },
        Popups: {
            _$class: msls.ContentItem,
            _$name: "Popups",
            _$parentName: "RootContentItem",
            screen: lightSwitchApplication.BrowseCustomers
        },
        FilterPopup: {
            _$class: msls.ContentItem,
            _$name: "FilterPopup",
            _$parentName: "Popups",
            screen: lightSwitchApplication.BrowseCustomers,
            data: lightSwitchApplication.BrowseCustomers,
            value: lightSwitchApplication.BrowseCustomers
        },
        HappinessLevel: {
            _$class: msls.ContentItem,
            _$name: "HappinessLevel",
            _$parentName: "FilterPopup",
            screen: lightSwitchApplication.BrowseCustomers,
            data: lightSwitchApplication.BrowseCustomers,
            value: Number
        }
    };

    msls._addEntryPoints(lightSwitchApplication.BrowseCustomers, {
        /// <field>
        /// Called when a new BrowseCustomers screen is created.
        /// <br/>created(msls.application.BrowseCustomers screen)
        /// </field>
        created: [lightSwitchApplication.BrowseCustomers],
        /// <field>
        /// Called before changes on an active BrowseCustomers screen are applied.
        /// <br/>beforeApplyChanges(msls.application.BrowseCustomers screen)
        /// </field>
        beforeApplyChanges: [lightSwitchApplication.BrowseCustomers],
        /// <field>
        /// Called to determine if the AddCustomer_Tap method can be executed.
        /// <br/>canExecute(msls.application.BrowseCustomers screen)
        /// </field>
        AddCustomer_Tap_canExecute: [lightSwitchApplication.BrowseCustomers],
        /// <field>
        /// Called to execute the AddCustomer_Tap method.
        /// <br/>execute(msls.application.BrowseCustomers screen)
        /// </field>
        AddCustomer_Tap_execute: [lightSwitchApplication.BrowseCustomers],
        /// <field>
        /// Called after the CustomerList content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        CustomerList_postRender: [$element, function () { return new lightSwitchApplication.BrowseCustomers().findContentItem("CustomerList"); }],
        /// <field>
        /// Called after the Customers content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Customers_postRender: [$element, function () { return new lightSwitchApplication.BrowseCustomers().findContentItem("Customers"); }],
        /// <field>
        /// Called after the CustomersTemplate content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        CustomersTemplate_postRender: [$element, function () { return new lightSwitchApplication.BrowseCustomers().findContentItem("CustomersTemplate"); }],
        /// <field>
        /// Called to render the SatisfactionScore content item.
        /// <br/>render(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        SatisfactionScore_render: [$element, function () { return new lightSwitchApplication.BrowseCustomers().findContentItem("SatisfactionScore"); }],
        /// <field>
        /// Called after the Name content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        Name_postRender: [$element, function () { return new lightSwitchApplication.BrowseCustomers().findContentItem("Name"); }],
        /// <field>
        /// Called after the FilterPopup content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        FilterPopup_postRender: [$element, function () { return new lightSwitchApplication.BrowseCustomers().findContentItem("FilterPopup"); }],
        /// <field>
        /// Called after the HappinessLevel content item has been rendered.
        /// <br/>postRender(HTMLElement element, msls.ContentItem contentItem)
        /// </field>
        HappinessLevel_postRender: [$element, function () { return new lightSwitchApplication.BrowseCustomers().findContentItem("HappinessLevel"); }]
    });

}(msls.application));