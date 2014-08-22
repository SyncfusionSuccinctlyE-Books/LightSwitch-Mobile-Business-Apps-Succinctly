/// <reference path="data.js" />

(function (lightSwitchApplication) {

    msls._addEntryPoints(lightSwitchApplication.Customer, {
        /// <field>
        /// Called when a new customer is created.
        /// <br/>created(msls.application.Customer entity)
        /// </field>
        created: [lightSwitchApplication.Customer]
    });

    msls._addEntryPoints(lightSwitchApplication.Order, {
        /// <field>
        /// Called when a new order is created.
        /// <br/>created(msls.application.Order entity)
        /// </field>
        created: [lightSwitchApplication.Order]
    });

}(msls.application));
