/// <reference path="../GeneratedArtifacts/viewModel.js" />
myapp.AddEditCustomer.created = function (screen) {
    if (screen.Customer.Id) {
        screen.details.displayName = screen.Customer.Name;
        screen.getOpenOrders().then(
                function (orders) {
                    if (orders.count == 0)
                        screen.OpenOrderMessage = "No open orders";
                    else
                        screen.OpenOrderMessage = "Orders pending";
                }
            );
    }
    else {
        screen.details.displayName = "Add a new customer.";
        screen.Customer.SatisfactionScore = 0.9;
        screen.OpenOrderMessage = "";
    }
};


myapp.AddEditCustomer.Customer_Id_render = function (element, contentItem) {
    $(element).append('<div id="container" style="width:700px" />');
    contentItem.dataBind(
        "value",
        function (customerId) {
            $("#container").ejChart(
                {
                    chartAreaBorder: {
                        width: 1
                    },
                    primaryXAxis:
                    {
                        rangePadding: 'Additional',
                        title: {},
                    },

                    primaryYAxis:
                    {
                        title: { text: "Total (in USD)" },
                    },

                    series: [{
                        name: ' ', type: 'column',
                        animation: true,
                        dataSource: {
                            data: new ej.DataManager({
                                url: "../reports/CustomerOrderSummary/" + customerId,

                            }),
                            xName: "Label",
                            yNames: ["Value"],
                            query: ej.Query()
                        },

                        style: { interior: "#7ED600" }
                    }],
                    load: "loadTheme",
                    size: { height: 470 },
                    legend: { visible: false },
                }
            );
        }
    );
};

myapp.AddEditCustomer.HowDoIGetThere_execute = function (screen) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            msls.showMessageBox("Current location is " + position.coords.latitude + "," + position.coords.longitude);
        });
    }
    else { msls.showMessageBox("Geolocation is not supported by this browser."); }
};

myapp.AddEditCustomer.Customer_render = function (element, contentItem) {
    var mapDiv = $("<div id='addressMap' class='msls-hauto msls-vauto' ></div>");
    $(mapDiv).appendTo($(element));
    var directionsDiv = $("<div id='directions' class='msls-hauto msls-vauto' ></div>");
    directionsDiv.appendTo($(element));

    mapDiv.lightswitchBingMapsControl({
        street: contentItem.value.Street,
        city: contentItem.value.City,
        zipcode: contentItem.value.ZipCode,
        state: contentItem.value.Country,
        mapTypeId: Microsoft.Maps.MapTypeId.road,
        height: "470"
    });
};

myapp.AddEditCustomer.HowDoIGetThere_execute = function (screen) {
    $("#addressMap").lightswitchBingMapsControl("getLocationOfUser", $("#directions"));
};
