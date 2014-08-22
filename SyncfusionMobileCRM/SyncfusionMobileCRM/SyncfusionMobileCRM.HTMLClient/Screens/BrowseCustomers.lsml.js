/// <reference path="../GeneratedArtifacts/viewModel.js" />

myapp.BrowseCustomers.created = function (screen) {
    // Write code here.
    screen.HappinessLevel = 0;
    screen.addChangeListener(
        "HappinessLevel",
        function () {
            screen.HapinessFactor = screen.HappinessLevel / 100;
        }
   );
};
 
myapp.BrowseCustomers.CustomersTemplate_postRender = function (element, contentItem) {
    contentItem.dataBind("value.Gender",
        function (gender) {
            $(element).css("color", "white");
            if (gender == "F")
                $(element).parent('li').css("background", "#EE317C");
            else
                $(element).parent('li').css("background", "#131083");
        }
    );
};
 
myapp.BrowseCustomers.SatisfactionScore_render = function (element, contentItem) {

    var customElement = $("<div />");
    customElement.appendTo(element);

    contentItem.dataBind("value",
        function (satisfactionScore) {
            customElement.removeClass();
            if (satisfactionScore > 0.8)
                customElement.addClass("ReallyHappyCustomer");
            else if (satisfactionScore > 0.6)
                customElement.addClass("HappyCustomer");
            else if (satisfactionScore > 0.4)
                customElement.addClass("CouldBeHappierCustomer");
            else if (satisfactionScore > 0.2)
                customElement.addClass("MadCustomer");
            else
                customElement.addClass("PureEvilCustomer");
        }
     );
}; 
myapp.BrowseCustomers.AddCustomer_Tap_execute = function (screen) {
    myapp.showAddEditCustomer(null,
    {
        beforeShown: function (detailScreen) {
            detailScreen.Customer = new msls.application.Customer();
            detailScreen.Customer.SatisfactionScore = 0.85;
        },
        afterClosed: function (detailScreen, navigationResult) {
            if (navigationResult == msls.NavigateBackAction.cancel)
                msls.showMessageBox("User cancelled out of changes.");
            else
                screen.showPopup("NewUserPopup");
        }
    });
};